import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import { extractSessionOrg, validateProjectOwnership } from "@/lib/api-proxy";
import {
  updateDeploymentEnvironmentWithValidation,
  updateDeploymentName,
} from "@/lib/deployment-promotion";
import { IdSchema } from "@/lib/generate-id";

export const preferredRegion = ["iad1", "gru1"];

const UpdateDeploymentSchema = z.object({
  projectId: IdSchema,
  name: z.string().optional(),
  environment: z.enum(["production", "staging"]).nullable().optional(),
});

export const PATCH = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ deploymentId: string }>;
  },
) => {
  try {
    const { orgId, orgSlug } = await extractSessionOrg();
    const { deploymentId } = await params;
    const body = await req.json();

    const { projectId, name, environment } = UpdateDeploymentSchema.parse(body);

    await validateProjectOwnership(projectId, orgId);

    const deployment = await db.query.Deployment.findFirst({
      where: and(
        eq(schema.Deployment.id, deploymentId),
        eq(schema.Deployment.project_id, projectId),
      ),
    });

    if (!deployment) {
      throw new ApiError(
        ErrorCode.DEPLOYMENT_NOT_FOUND,
        "Deployment not found",
        404,
      );
    }

    let txid: number | undefined;

    if (name !== undefined) {
      const result = await updateDeploymentName(projectId, deploymentId, name);
      txid = Number.parseInt(result.txid, 10);
    } else if (environment !== undefined) {
      const result = await updateDeploymentEnvironmentWithValidation(
        projectId,
        deploymentId,
        environment,
      );
      txid = Number.parseInt(result.txid, 10);
    } else {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        "Name or environment, not both",
        400,
      );
    }

    revalidatePath(`/orgs/${orgSlug}/projects/${projectId}/deployments`);
    revalidatePath(
      `/orgs/${orgSlug}/projects/${projectId}/deployments/${deploymentId}`,
    );

    return Response.json({
      txid,
    });
  } catch (error) {
    return handleApiError(error);
  }
};
