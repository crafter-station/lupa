import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { after } from "next/server";
import z from "zod/v3";
import { db } from "@/db";
import { handleApiError } from "@/lib/api-error";
import {
  extractSessionOrg,
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
    const { orgId, orgSlug } = await extractSessionOrg();

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

    after(async () => {
      revalidatePath(
        `/orgs/${orgSlug}/projects/${project_id}/documents${document.folder}`,
      );
      revalidatePath(
        `/orgs/${orgSlug}/projects/${project_id}/documents${document.folder}doc:${documentId}`,
      );
    });

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
