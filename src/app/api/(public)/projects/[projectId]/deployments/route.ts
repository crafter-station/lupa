import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { clerk } from "@/clients/clerk";
import * as schema from "@/db/schema";
import { generateId, IdSchema } from "@/lib/generate-id";
import { deploy } from "@/trigger/deploy.task";

export const preferredRegion = "iad1";

export const CreateDeploymentBodySchema = z.object({
  deploymentId: IdSchema.optional(),
});

export const CreateDeploymentSuccessResponseSchema = z.object({
  success: z.literal(true),
  txid: z.number().optional(),
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
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
    }>;
  },
) {
  let pool: Pool | undefined;
  try {
    const { projectId } = await params;
    const json = await request.json();

    let { deploymentId } = CreateDeploymentBodySchema.parse({
      ...json,
    });

    if (!deploymentId) {
      deploymentId = generateId();
    }

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

    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, projectId),
    });

    if (!project) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    const result = await db.transaction(async (tx) => {
      await tx.insert(schema.Deployment).values({
        id: deploymentId,
        project_id: project.id,
        org_id: project.org_id,
        status: "queued",
      } satisfies schema.DeploymentInsert);

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txid.rows[0].txid as string,
      };
    });

    const org = await clerk.organizations.getOrganization({
      organizationId: project.org_id,
    });

    await pool.end();

    revalidatePath(`/orgs/${org.slug}/projects/${project.id}/deployments`);

    await deploy.trigger({
      deploymentId: deploymentId,
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
