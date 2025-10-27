import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { promoteDeploymentToProduction } from "@/lib/deployment-promotion";

export const preferredRegion = "iad1";

/**
 * Promote deployment to production
 * @description Promotes a deployment to production environment and demotes the current production deployment
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

    if (deployment.status !== "ready") {
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

    await promoteDeploymentToProduction(projectId, deploymentId);

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
