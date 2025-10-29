import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import * as schema from "@/db/schema";
import { handleApiError } from "@/lib/api-error";
import { extractSessionOrg, validateProjectOwnership } from "@/lib/api-proxy";
import { generateDeploymentName } from "@/lib/deployment-promotion";
import { generateId, IdSchema } from "@/lib/generate-id";
import { deploy } from "@/trigger/deploy.task";

const CreateDeploymentSchema = z.object({
  projectId: IdSchema,
  name: z.string().optional(),
});

export const POST = async (req: NextRequest) => {
  try {
    const { orgId, orgSlug } = await extractSessionOrg();
    const body = await req.json();
    const { projectId, name } = CreateDeploymentSchema.parse(body);

    await validateProjectOwnership(projectId, orgId);

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
    });

    try {
      const db = drizzle({ client: pool, schema });

      const deploymentId = generateId();
      const deploymentName = name || generateDeploymentName();

      const result = await db.transaction(async (tx) => {
        await tx.insert(schema.Deployment).values({
          id: deploymentId,
          org_id: orgId,
          project_id: projectId,
          name: deploymentName,
          status: "queued",
          environment: null,
        });

        const txidResult = await tx.execute(
          sql`SELECT pg_current_xact_id()::xid::text as txid`,
        );

        if (!txidResult.rows[0]?.txid) {
          throw new Error("Failed to get transaction ID");
        }

        const deployment = await tx.query.Deployment.findFirst({
          where: eq(schema.Deployment.id, deploymentId),
        });

        return {
          deployment,
          txid: txidResult.rows[0].txid as string,
        };
      });
      await deploy.trigger({
        deploymentId: deploymentId,
      });

      revalidatePath(`/orgs/${orgSlug}/projects/${projectId}/deployments`);

      return Response.json({
        ...result.deployment,
        txid: Number.parseInt(result.txid, 10),
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    return handleApiError(error);
  }
};
