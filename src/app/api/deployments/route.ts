import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import * as schema from "@/db/schema";
import { deploy } from "@/trigger/deploy.task";

export const preferredRegion = "iad1";

export const CreateDeploymentBodySchema = z.object({
  id: z.string().min(1, "id is required"),
  project_id: z.string().min(1, "project_id is required"),
  vector_index_id: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  logs: z
    .array(
      z.object({
        timestamp: z.string().describe("ISO 8601 format"),
        message: z.string(),
      }),
    )
    .default([]),
});

export const CreateDeploymentSuccessResponseSchema = z.object({
  success: z.literal(true),
  txid: z.number(),
});

/**
 * Create deployment
 * @description Create a new deployment record.
 * @body CreateDeploymentBodySchema
 * @response 200:CreateDeploymentSuccessResponseSchema
 * @response 400:ErrorResponseSchema
 * @response 500:ErrorResponseSchema
 * @openapi
 */
export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const json = await request.json();

    const data = schema.DeploymentInsertSchema.parse(json);

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { success: false, error: "DATABASE_URL is not set" },
        { status: 500 },
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
    });

    const db = drizzle({
      client: pool,
      schema,
    });

    const result = await db.transaction(async (tx) => {
      await tx.insert(schema.Deployment).values({
        ...data,
        created_at: undefined,
        updated_at: undefined,
      } as typeof schema.Deployment.$inferInsert);

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txid.rows[0].txid as string,
      };
    });

    await pool.end();

    revalidatePath(`/projects/${data.project_id}/deployments`);

    await deploy.trigger({
      deploymentId: data.id,
    });

    return Response.json(
      { success: true, txid: parseInt(result.txid, 10) },
      { status: 200 },
    );
  } catch (error) {
    if (pool) {
      await pool.end();
    }
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
