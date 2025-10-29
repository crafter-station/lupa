import type { NextRequest } from "next/server";
import {
  createErrorResponse,
  ErrorCode,
  handleApiError,
} from "@/lib/api-error";
import {
  extractSessionOrg,
  proxyToPublicAPI,
  validateProjectOwnership,
} from "@/lib/api-proxy";

export const POST = async (req: NextRequest) => {
  try {
    const { orgId, orgSlug } = await extractSessionOrg();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const projectId = searchParams.get("projectId");
    const deploymentId = searchParams.get("deploymentId");

    if (!projectId) {
      return createErrorResponse(
        ErrorCode.MISSING_PARAMETER,
        "Project ID is required",
        400,
      );
    }

    if (!deploymentId) {
      return createErrorResponse(
        ErrorCode.MISSING_PARAMETER,
        "Deployment ID is required",
        400,
      );
    }

    if (!query) {
      return createErrorResponse(
        ErrorCode.MISSING_PARAMETER,
        "Query is required",
        400,
      );
    }

    await validateProjectOwnership(projectId, orgId);

    return await proxyToPublicAPI(
      projectId,
      `/search/?query=${encodeURIComponent(query)}`,
      {
        method: "GET",
        deploymentId,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
