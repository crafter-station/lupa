import type { NextRequest } from "next/server";
import z from "zod/v3";
import { handleApiError } from "@/lib/api-error";
import {
  extractSessionOrg,
  proxyToPublicAPI,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { IdSchema } from "@/lib/generate-id";

export const preferredRegion = ["iad1"];

const BulkDocumentItemSchema = z.object({
  folder: z.string().default("/"),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  url: z.string().min(1),
  refresh_frequency: z
    .enum(["daily", "weekly", "monthly", "none"])
    .default("none"),
  enhance: z.boolean().default(false),
});

const BulkCreateDocumentsRequestSchema = z.object({
  project_id: IdSchema,
  documents: z.array(BulkDocumentItemSchema).min(1),
});

export const POST = async (req: NextRequest) => {
  try {
    const { orgId } = await extractSessionOrg();

    const body = await req.json();
    const { project_id, documents } =
      BulkCreateDocumentsRequestSchema.parse(body);

    await validateProjectOwnership(project_id, orgId);

    return await proxyToPublicAPI(project_id, "/documents/bulk", {
      method: "POST",
      body: JSON.stringify({ documents }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};
