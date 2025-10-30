import type { NextRequest } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { extractSessionOrg, proxyToPublicAPI } from "@/lib/api-proxy";

export const preferredRegion = ["iad1", "gru1"];

export async function GET(req: NextRequest) {
  try {
    await extractSessionOrg();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const deploymentId = searchParams.get("deploymentId");
    const path = searchParams.get("path") || "/";
    const depth = searchParams.get("depth") || "0";

    if (!projectId || !deploymentId) {
      return Response.json(
        { error: "projectId and deploymentId are required" },
        { status: 400 },
      );
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
