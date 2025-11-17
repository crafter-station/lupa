import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { handleApiError } from "@/lib/api-error";
import {
  extractSessionOrg,
  proxyToPublicAPI,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { IdSchema } from "@/lib/generate-id";
import { CatPathSchema } from "@/lib/validation";

export const preferredRegion = ["iad1"];

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await extractSessionOrg();

    const json = await req.json();

    const { projectId, deploymentId, path } = z
      .object({
        projectId: IdSchema,
        deploymentId: IdSchema,
        path: CatPathSchema,
      })
      .parse(json);

    await validateProjectOwnership(projectId, orgId);

    return await proxyToPublicAPI(
      projectId,
      `/cat?path=${encodeURIComponent(path)}`,
      {
        method: "GET",
        deploymentId,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
