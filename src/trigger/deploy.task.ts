import { batch, logger, schemaTask, wait } from "@trigger.dev/sdk";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { invalidateVectorCache } from "@/lib/vector";

export const deploy = schemaTask({
  id: "deploy",
  schema: z.object({
    deploymentId: z.string(),
  }),
  run: async ({ deploymentId }) => {
    try {
      const deployments = await db
        .select()
        .from(schema.Deployment)
        .where(eq(schema.Deployment.id, deploymentId))
        .limit(1);

      if (!deployments.length) {
        throw new Error(`Deployment with id ${deploymentId} not found`);
      }

      const deployment = deployments[0];

      const documents = await db
        .select()
        .from(schema.Document)
        .where(eq(schema.Document.project_id, deployment.project_id));

      const snapshots: schema.SnapshotSelect[] = [];

      for (const document of documents) {
        const results = await db
          .select()
          .from(schema.Snapshot)
          .where(
            and(
              eq(schema.Snapshot.document_id, document.id),
              lte(schema.Snapshot.updated_at, deployment.created_at),
              eq(schema.Snapshot.status, "success"),
            ),
          )
          .orderBy(desc(schema.Snapshot.updated_at))
          .limit(1);

        if (results.length) {
          snapshots.push(results[0]);
        }
      }
      if (!snapshots.length) {
        throw new Error(`No snapshots found for deployment ${deploymentId}`);
      }

      await db.insert(schema.SnapshotDeploymentRel).values(
        snapshots.map((snapshot) => ({
          deployment_id: deployment.id,
          snapshot_id: snapshot.id,
        })),
      );

      const url = "https://api.upstash.com/v2/vector/index";
      const response = await fetch(url, {
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
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create vector index: ${response.status} ${errorText}`,
        );
      }

      const vectorIndex = (await response.json()) as {
        id: string;
        endpoint: string;
        token: string;
      };

      if (!vectorIndex?.id) {
        throw new Error(
          `Failed to create vector index for deployment ${deploymentId}`,
        );
      }

      logger.info(`Vector index created: ${vectorIndex.id}`);

      await db
        .update(schema.Deployment)
        .set({
          vector_index_id: vectorIndex.id,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Deployment.id, deploymentId));

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
    } catch (error) {
      logger.error("Deployment failed", { error, deploymentId });

      await db
        .update(schema.Deployment)
        .set({
          status: "error",
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Deployment.id, deploymentId));

      throw error;
    }
  },
});

export const pushSnapshot = schemaTask({
  id: "push-snapshot",
  schema: z.object({
    deploymentId: z.string(),
    snapshotId: z.string(),
  }),
  run: async ({ deploymentId, snapshotId }) => {
    try {
      const snapshots = await db
        .select()
        .from(schema.Snapshot)
        .where(eq(schema.Snapshot.id, snapshotId))
        .limit(1);

      if (!snapshots.length) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      const snapshot = snapshots[0];

      if (!snapshot.markdown_url) {
        throw new Error(`Snapshot ${snapshotId} does not have a markdown URL`);
      }

      const vector = await (async () => {
        try {
          const { getVectorIndex } = await import("@/lib/vector");
          return await getVectorIndex(deploymentId, { skipCache: true });
        } catch (error) {
          logger.error("Failed to get vector index using cache", { error });
          throw error;
        }
      })();

      logger.info(`Vector index retrieved for deployment ${deploymentId}`);

      const response = await fetch(snapshot.markdown_url);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch markdown: ${response.status} ${response.statusText}`,
        );
      }

      const markdown = await response.text();

      logger.info(`Markdown fetched for snapshot ${snapshotId}`, {
        length: markdown.length,
      });

      const chunks = [];
      const chunkSize = 1000;
      const chunkOverlap = 200;

      for (let i = 0; i < markdown.length; i += chunkSize - chunkOverlap) {
        const chunk = markdown.slice(i, i + chunkSize);
        const chunkId = `${snapshot.document_id}_chunk_${Math.floor(i / (chunkSize - chunkOverlap))}`;

        chunks.push({
          id: chunkId,
          content: chunk,
          metadata: {
            snapshotId: snapshot.id,
            documentId: snapshot.document_id,
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

      logger.info(`Successfully uploaded ${uploadedCount} vectors`);

      await invalidateVectorCache(deploymentId);

      return { uploadedCount };
    } catch (error) {
      logger.error("Push snapshot failed", {
        error,
        deploymentId,
        snapshotId,
      });
      throw error;
    }
  },
});
