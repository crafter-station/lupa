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
    const { project_id, ...updates } = z
      .object({
        project_id: IdSchema,
      })
      .passthrough()
      .parse(body);

    await validateProjectOwnership(project_id, orgId);

    return await proxyToPublicAPI(project_id, `/documents/${documentId}`, {
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
