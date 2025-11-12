import { batch, logger, schemaTask, wait } from "@trigger.dev/sdk";
import { Index as VectorIndex } from "@upstash/vector";
import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod/v3";
import { db } from "@/db";
import { redis } from "@/db/redis";
import * as schema from "@/db/schema";
import { getVectorIndex, invalidateVectorCache } from "@/lib/crypto/vector";

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

      await db
        .update(schema.Deployment)
        .set({
          status: "building",
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Deployment.id, deploymentId));

      const documents = await db
        .select()
        .from(schema.Document)
        .where(eq(schema.Document.project_id, deployment.project_id));

      const snapshots: (schema.SnapshotSelect & {
        folder: string;
        name: string;
      })[] = [];

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
          snapshots.push({
            ...results[0],
            folder: document.folder,
            name: document.name,
          });
        }
      }
      if (!snapshots.length) {
        throw new Error(`No snapshots found for deployment ${deploymentId}`);
      }

      await db.insert(schema.SnapshotDeploymentRel).values(
        snapshots.map((snapshot) => ({
          deployment_id: deployment.id,
          snapshot_id: snapshot.id,
          org_id: deployment.org_id,
          folder: snapshot.folder,
          name: snapshot.name,
          metadata: snapshot.metadata,
        })),
      );

      const [project] = await db
        .select()
        .from(schema.Project)
        .where(eq(schema.Project.id, deployment.project_id))
        .limit(1);

      if (!project) {
        throw new Error(`Project not found for deployment ${deploymentId}`);
      }

      if (!project.vector_index_id) {
        const url = "https://api.upstash.com/v2/vector/index";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `prj_${project.id}`,
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
          .update(schema.Project)
          .set({
            vector_index_id: vectorIndex.id,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, project.id));

        await redis.set(
          `vectorIndexId:${deployment.project_id}`,
          vectorIndex.id,
        );
      }

      await wait.for({ seconds: 15 });

      const results = await batch.triggerAndWait<typeof pushSnapshot>(
        snapshots.map((snapshot) => ({
          id: "push-snapshot",
          payload: {
            deploymentId,
            snapshotId: snapshot.id,
            projectId: deployment.project_id,
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
    projectId: z.string(),
    deploymentId: z.string(),
    snapshotId: z.string(),
  }),
  run: async ({ projectId, deploymentId, snapshotId }) => {
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

      const [document] = await db
        .select()
        .from(schema.SnapshotDeploymentRel)
        .where(
          and(
            eq(schema.SnapshotDeploymentRel.snapshot_id, snapshotId),
            eq(schema.SnapshotDeploymentRel.deployment_id, deploymentId),
          ),
        );

      if (!document) {
        throw new Error(`Document not found for snapshot ${snapshotId}`);
      }

      const indexCredentials = await getVectorIndex(projectId);
      const index = new VectorIndex(indexCredentials);
      const namespace = index.namespace(deploymentId);

      logger.info(`Vector index retrieved for project ${projectId}`);

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
            chunk: {
              index: Math.floor(i / (chunkSize - chunkOverlap)),
            },
            document: {
              path: `${document.folder}${document.name}.md`,
              chunks_count: chunks.length,
              tokens_count: snapshot.tokens_count,
              metadata: snapshot.metadata,
            },
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
        await namespace.upsert(batch);
        logger.info(
          `Uploaded batch ${i / batchSize + 1} of ${Math.ceil(vectorData.length / batchSize)}`,
        );
        uploadedCount += batch.length;
      }

      logger.info(`Successfully uploaded ${uploadedCount} vectors`);

      await invalidateVectorCache(projectId);

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
