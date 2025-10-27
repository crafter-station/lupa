import { eq } from "drizzle-orm";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { updateDeploymentEnvironment } from "@/lib/deployment-promotion";

export const preferredRegion = "iad1";

const UpdateEnvironmentBodySchema = z.object({
  environment: z.enum(["production", "staging"]),
});

/**
 * Update deployment environment
 * @description Updates the environment of a deployment
 * @body UpdateEnvironmentBodySchema
 * @response 200
 * @response 400
 * @response 404
 * @response 500
 * @openapi
 */
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      deploymentId: string;
    }>;
  },
) {
  try {
    const { projectId, deploymentId } = await params;
    const json = await request.json();
    const { environment } = UpdateEnvironmentBodySchema.parse(json);

    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, projectId),
    });

    if (!project) {
      return Response.json(
        { error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } },
        { status: 404 },
      );
    }

    const deployment = await db.query.Deployment.findFirst({
      where: eq(schema.Deployment.id, deploymentId),
    });

    if (!deployment) {
      return Response.json(
        {
          error: {
            code: "DEPLOYMENT_NOT_FOUND",
            message: "Deployment not found",
          },
        },
        { status: 404 },
      );
    }

    if (deployment.project_id !== projectId) {
      return Response.json(
        {
          error: {
            code: "DEPLOYMENT_NOT_IN_PROJECT",
            message: "Deployment does not belong to this project",
          },
        },
        { status: 400 },
      );
    }

    if (environment === "production" && deployment.status !== "ready") {
      return Response.json(
        {
          error: {
            code: "DEPLOYMENT_NOT_READY",
            message: "Deployment must be ready to promote to production",
          },
        },
        { status: 400 },
      );
    }

    await updateDeploymentEnvironment(projectId, deploymentId, environment);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 },
    );
  }
}
