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
    params: Promise<{ documentId: string }>;
  },
) => {
  try {
    const orgId = await extractSessionOrgId();

    const { documentId } = await params;

    const body = await req.json();
    const { projectId, ...updates } = z
      .object({
        projectId: IdSchema,
      })
      .passthrough()
      .parse(body);

    await validateProjectOwnership(projectId, orgId);

    return await proxyToPublicAPI(projectId, `/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};
