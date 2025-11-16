import type { NextRequest } from "next/server";
import z from "zod/v3";
import { db } from "@/db";
import { handleApiError } from "@/lib/api-error";
import {
  extractSessionOrg,
  proxyToPublicAPI,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { IdSchema } from "@/lib/generate-id";

export const preferredRegion = ["iad1"];

export const PATCH = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ documentId: string }>;
  },
) => {
  try {
    const { orgId } = await extractSessionOrg();

    const { documentId } = await params;

    const document = await db.query.Document.findFirst({
      where: (doc, { eq }) => eq(doc.id, documentId),
    });

    if (!document) {
      throw new Error("Document not found");
    }

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
