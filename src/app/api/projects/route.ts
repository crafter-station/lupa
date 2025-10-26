import { auth } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import * as schema from "@/db/schema";

export const CreateProjectRequestSchema = z.object({
  id: z
    .string()
    .min(1, "id is required")
    .describe("Unique project ID (use generateId with 'proj_' prefix)"),
  name: z.string().min(1, "name is required").describe("Project name"),
  description: z.string().nullable().optional().describe("Project description"),
});

export const ProjectSuccessResponseSchema = z.object({
  success: z.literal(true),
  txid: z.number(),
});

export const ProjectErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

/**
 * Create a new project
 * @description Creates a new project in the system. Projects are top-level organization units that contain documents and deployments.
 * @body CreateProjectRequestSchema
 * @response 200:ProjectSuccessResponseSchema
 * @response 400:ProjectErrorResponseSchema
 * @response 500:ProjectErrorResponseSchema
 * @openapi
 */
export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const session = await auth();

    if (!session.orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const json = await request.json();

    const { id, name, description, org_id } = schema.ProjectInsertSchema.parse({
      ...json,
      org_id: session.orgId,
    });

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
      await tx.insert(schema.Project).values({
        id,
        org_id,
        name,
        description,
      });

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txid.rows[0].txid as string,
      };
    });

    await pool.end();

    revalidatePath(`/orgs/${org_id}/projects`);

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
