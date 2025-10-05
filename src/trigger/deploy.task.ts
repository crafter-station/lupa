import { batch, logger, schemaTask, wait } from "@trigger.dev/sdk";
import { Index as VectorIndex } from "@upstash/vector";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";

// TODO: handle errors
export const deploy = schemaTask({
  id: "deploy",
  schema: z.object({
    deploymentId: z.string(),
  }),
  run: async ({ deploymentId }) => {
    const deployments = await db
      .select()
      .from(schema.Deployment)
      .where(eq(schema.Deployment.id, deploymentId))
      .limit(1);

    if (!deployments.length) {
      throw new Error(`Deployment with id ${deploymentId} not found`);
    }

    const deployment = deployments[0];

    const sources = await db
      .select()
      .from(schema.Source)
      .where(eq(schema.Source.bucket_id, deployment.bucket_id));

    const snapshots: schema.SourceSnapshotSelect[] = [];

    for (const source of sources) {
      const results = await db
        .select()
        .from(schema.SourceSnapshot)
        .where(
          and(
            eq(schema.SourceSnapshot.source_id, source.id),
            lte(schema.SourceSnapshot.updated_at, deployment.created_at),
            eq(schema.SourceSnapshot.status, "success"),
          ),
        )
        .orderBy(desc(schema.SourceSnapshot.updated_at))
        .limit(1);

      if (results.length) {
        snapshots.push(results[0]);
      }
    }
    if (!snapshots.length) {
      throw new Error(`No snapshots found for deployment ${deploymentId}`);
    }

    await db.insert(schema.SourceSnapshotDeploymentRel).values(
      snapshots.map((snapshot) => ({
        deployment_id: deployment.id,
        snapshot_id: snapshot.id,
      })),
    );

    const url = "https://api.upstash.com/v2/vector/index";
    const options = {
      method: "POST",
      headers: {
        Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: deploymentId,
        region: "us-east-1",
        similarity_function: "COSINE",
        dimension_count: 1024,
        type: "payg",
        embedding_model: "BGE_M3",
        index_type: "HYBRID",
        sparse_embedding_model: "BM25",
      }),
    };

    let vectorIndex: {
      id: string;
      endpoint: string;
      token: string;
    } | null = null;

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    vectorIndex = await response.json();

    if (!vectorIndex) {
      throw new Error(
        `Failed to create vector index for deployment ${deploymentId}`,
      );
    }

    await db
      .update(schema.Deployment)
      .set({
        vector_index_id: vectorIndex.id,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    // Let's wait for the vector index to be ready
    await wait.for({ seconds: 15 });

    const results = await batch.triggerAndWait<typeof pushSnapshot>(
      snapshots.map((snapshot) => ({
        id: "push-snapshot",
        payload: {
          deploymentId,
          snapshotId: snapshot.id,
        },
      })),
    );

    await db
      .update(schema.Deployment)
      .set({
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    return results;
  },
});

export const pushSnapshot = schemaTask({
  id: "push-snapshot",
  schema: z.object({
    deploymentId: z.string(),
    snapshotId: z.string(),
  }),
  run: async ({ deploymentId, snapshotId }) => {
    const snapshots = await db
      .select()
      .from(schema.SourceSnapshot)
      .where(eq(schema.SourceSnapshot.id, snapshotId))
      .limit(1);

    if (!snapshots.length) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    const snapshot = snapshots[0];

    const deployments = await db
      .select()
      .from(schema.Deployment)
      .where(eq(schema.Deployment.id, deploymentId))
      .limit(1);

    if (!deployments.length) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const deployment = deployments[0];

    const url = `https://api.upstash.com/v2/vector/index/${deployment.vector_index_id}`;
    const options = {
      method: "GET",
      headers: {
        Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
      },
    };

    const upstashResponse = await fetch(url, options);
    const vectorConfig = (await upstashResponse.json()) as {
      id: string;
      endpoint: string;
      token: string;
    };

    logger.info(`Vector index ${vectorConfig.id} found`, vectorConfig);

    const vector = new VectorIndex({
      url: `https://${vectorConfig.endpoint}`,
      token: vectorConfig.token,
    });

    // fetch md from snapshot

    if (!snapshot.markdown_url) {
      throw new Error(`Snapshot ${snapshotId} does not have a markdown URL`);
    }

    const response = await fetch(snapshot.markdown_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch markdown for snapshot ${snapshotId}`);
    }

    const markdown = await response.text();

    logger.info(`Markdown fetched for snapshot ${snapshotId}`, { markdown });

    const chunks = [];
    const chunkSize = 1000;
    const chunkOverlap = 200;

    for (let i = 0; i < markdown.length; i += chunkSize - chunkOverlap) {
      const chunk = markdown.slice(i, i + chunkSize);
      const chunkId = `${snapshot.source_id}_chunk_${Math.floor(i / (chunkSize - chunkOverlap))}`;

      chunks.push({
        id: chunkId,
        content: chunk,
        metadata: {
          snapshotId: snapshot.id,
          sourceId: snapshot.source_id,
          // filename: snapshot.source.filename, TODO
          chunkIndex: Math.floor(i / (chunkSize - chunkOverlap)),
          chunkSize: chunk.length,
          createdAt: new Date().toISOString(),
        },
      });
    }

    logger.info(`Chunks generated for snapshot ${snapshotId}`, {
      chunks: chunks.length,
    });

    const vectorData = [];
    for (const chunk of chunks) {
      vectorData.push({
        id: chunk.id,
        data: chunk.content,
        metadata: chunk.metadata,
      });
    }

    const batchSize = 100;
    let uploadedCount = 0;

    for (let i = 0; i < vectorData.length; i += batchSize) {
      const batch = vectorData.slice(i, i + batchSize);
      await vector.upsert(batch);
      logger.info(
        `Uploaded batch ${i / batchSize + 1} of ${Math.ceil(vectorData.length / batchSize)}`,
      );
      uploadedCount += batch.length;
    }

    logger.info(`Uploaded ${uploadedCount} vectors`);
  },
});
