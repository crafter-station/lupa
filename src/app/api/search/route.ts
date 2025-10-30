import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { handleApiError } from "@/lib/api-error";
import {
  extractSessionOrg,
  proxyToPublicAPI,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { IdSchema } from "@/lib/generate-id";

export const preferredRegion = ["iad1", "gru1"];

export const POST = async (req: NextRequest) => {
  try {
    const { orgId } = await extractSessionOrg();

    const json = await req.json();

    const { query, projectId, deploymentId } = z
      .object({
        query: z.string().min(1).max(100),
        projectId: IdSchema,
        deploymentId: IdSchema,
      })
      .parse(json);

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
