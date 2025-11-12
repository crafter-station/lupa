import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { handleApiError } from "@/lib/api-error";
import { extractSessionOrg, proxyToPublicAPI } from "@/lib/api-proxy";

export const preferredRegion = ["iad1", "gru1"];

export async function GET(req: NextRequest) {
  await headers();

  try {
    await extractSessionOrg();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const requestDeploymentId = searchParams.get("deploymentId");
    const path = searchParams.get("path") || "/";
    const depth = searchParams.get("depth") || "0";

    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }

    const [project] = await db
      .select()
      .from(schema.Project)
      .where(eq(schema.Project.id, projectId))
      .limit(1);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    let deploymentId = requestDeploymentId;

    if (!deploymentId || deploymentId === "null") {
      if (project.production_deployment_id) {
        deploymentId = project.production_deployment_id;
      } else {
        throw new Error("Deployment ID not found");
      }
    }

    return await proxyToPublicAPI(
      projectId,
      `/tree/?folder=${encodeURIComponent(path)}&depth=${encodeURIComponent(depth)}`,
      {
        method: "GET",
        headers: {
          "Deployment-Id": deploymentId,
        },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
