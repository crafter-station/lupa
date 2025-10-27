import type { NextRequest } from "next/server";
import z from "zod/v3";
import { handleApiError } from "@/lib/api-error";
import {
  extractSessionOrgId,
  proxyToPublicAPI,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { IdSchema } from "@/lib/generate-id";

export const PATCH = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ deploymentId: string }>;
  },
) => {
  try {
    const orgId = await extractSessionOrgId();
    const { deploymentId } = await params;

    const body = await req.json();

    const { projectId, environment } = z
      .object({
        projectId: IdSchema,
        environment: z.enum(["production", "staging"]),
      })
      .parse(body);

    await validateProjectOwnership(projectId, orgId);

    return await proxyToPublicAPI(
      projectId,
      `/deployments/${deploymentId}/environment`,
      {
        method: "PATCH",
        body: JSON.stringify({ environment }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
