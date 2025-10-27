import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import { generateInternalToken } from "@/lib/crypto/internal-token";
import { generateId, IdSchema } from "@/lib/generate-id";
import { createDocumentSchedule } from "@/lib/schedules";
import { getAPIBaseURL } from "@/lib/utils";

export const preferredRegion = "iad1";

const BaseDocumentSchema = z.object({
  documentId: IdSchema.optional(),
  snapshotId: IdSchema.optional(),

  folder: z.string().startsWith("/").endsWith("/"),
  name: z.string(),
  description: z.string().optional(),

  enhance: z.boolean().optional(),
  metadataSchema: z.string().optional(),
});

const WebsiteDocumentSchema = BaseDocumentSchema.extend({
  url: z.string().url(),
  refreshEnabled: z.boolean().optional(),
  refreshFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
});

const UploadDocumentSchema = BaseDocumentSchema.extend({
  file: z.instanceof(File),
  parsingInstructions: z.string().optional(),
});

async function parseRequestData(request: Request, type: "website" | "upload") {
  if (type === "website") {
    const body = await request.json();
    return {
      data: WebsiteDocumentSchema.parse(body),
      file: undefined,
    };
  }

  const formData = await request.formData();
  const data = UploadDocumentSchema.parse(Object.fromEntries(formData));
  return { data, file: data.file };
}

async function validateProject(projectId: string) {
  const project = await db.query.Project.findFirst({
    where: eq(schema.Project.id, projectId),
  });

  if (!project) {
    throw new ApiError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", 404);
  }

  return project;
}

async function createDocumentWithTxid(
  documentId: string,
  projectId: string,
  orgId: string,
  data: {
    folder: string;
    name: string;
    description?: string;
    refreshEnabled?: boolean;
    refreshFrequency?: "daily" | "weekly" | "monthly";
  },
): Promise<string> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
  });

  try {
    const dbPool = drizzle({ client: pool, schema });

    const result = await dbPool.transaction(async (tx) => {
      await tx.insert(schema.Document).values({
        id: documentId,
        project_id: projectId,
        org_id: orgId,
        folder: data.folder,
        name: data.name,
        description: data.description,
        refresh_enabled: data.refreshEnabled,
        refresh_frequency: data.refreshFrequency,
      });

      const txidResult = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      if (!txidResult.rows[0]?.txid) {
        throw new Error("Failed to get transaction ID");
      }

      return { txid: txidResult.rows[0].txid as string };
    });

    return result.txid;
  } finally {
    await pool.end();
  }
}

async function createDocumentSimple(
  documentId: string,
  projectId: string,
  orgId: string,
  data: {
    folder: string;
    name: string;
    description?: string;
    refreshEnabled?: boolean;
    refreshFrequency?: "daily" | "weekly" | "monthly";
  },
): Promise<void> {
  await db.insert(schema.Document).values({
    id: documentId,
    project_id: projectId,
    org_id: orgId,
    folder: data.folder,
    name: data.name,
    description: data.description,
    refresh_enabled: data.refreshEnabled,
    refresh_frequency: data.refreshFrequency,
  });
}

async function createSnapshot(
  projectId: string,
  type: "website" | "upload",
  data: {
    snapshotId?: string;
    documentId: string;
    url?: string;
    file?: File;
    enhance?: boolean;
    metadataSchema?: string;
    parsingInstructions?: string;
  },
): Promise<{ snapshotId: string; txid: string }> {
  const apiUrl = `${getAPIBaseURL(projectId)}/snapshots?type=${type}`;

  let body: BodyInit;
  const internalToken = generateInternalToken(projectId);

  const headers: HeadersInit = {
    "X-Internal-Token": internalToken,
  };

  if (type === "website") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      snapshotId: data.snapshotId,
      documentId: data.documentId,
      url: data.url,
      enhance: data.enhance,
      metadataSchema: data.metadataSchema,
    });
  } else {
    const formData = new FormData();
    if (data.snapshotId) formData.append("snapshotId", data.snapshotId);
    formData.append("documentId", data.documentId);
    if (data.file) formData.append("file", data.file);
    if (data.enhance !== undefined)
      formData.append("enhance", String(data.enhance));
    if (data.metadataSchema)
      formData.append("metadataSchema", data.metadataSchema);
    if (data.parsingInstructions)
      formData.append("parsingInstructions", data.parsingInstructions);
    body = formData;
  }

  const response = await fetch(apiUrl, { method: "POST", headers, body });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Snapshot creation failed: ${error}`);
  }

  return response.json();
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  },
) {
  try {
    const { projectId } = await params;
    const search = request.nextUrl.searchParams;

    const type = z.enum(["website", "upload"]).parse(search.get("type"));

    const project = await validateProject(projectId);

    const { data } = await parseRequestData(request, type);

    const documentId = data.documentId || generateId();
    let documentTxid: string | undefined;

    if (data.documentId) {
      documentTxid = await createDocumentWithTxid(
        documentId,
        project.id,
        project.org_id,
        {
          folder: data.folder,
          name: data.name,
          description: data.description,
          refreshEnabled:
            type === "website"
              ? (data as z.infer<typeof WebsiteDocumentSchema>).refreshEnabled
              : undefined,
          refreshFrequency:
            type === "website"
              ? (data as z.infer<typeof WebsiteDocumentSchema>).refreshFrequency
              : undefined,
        },
      );
    } else {
      await createDocumentSimple(documentId, project.id, project.org_id, {
        folder: data.folder,
        name: data.name,
        description: data.description,
        refreshEnabled:
          type === "website"
            ? (data as z.infer<typeof WebsiteDocumentSchema>).refreshEnabled
            : undefined,
        refreshFrequency:
          type === "website"
            ? (data as z.infer<typeof WebsiteDocumentSchema>).refreshFrequency
            : undefined,
      });
    }

    const snapshotData = await createSnapshot(projectId, type, {
      snapshotId: data.snapshotId,
      documentId,
      url:
        type === "website"
          ? (data as z.infer<typeof WebsiteDocumentSchema>).url
          : undefined,
      file:
        type === "upload"
          ? (data as z.infer<typeof UploadDocumentSchema>).file
          : undefined,
      enhance: data.enhance,
      metadataSchema: data.metadataSchema,
      parsingInstructions:
        type === "upload"
          ? (data as z.infer<typeof UploadDocumentSchema>).parsingInstructions
          : undefined,
    });

    if (
      type === "website" &&
      (data as z.infer<typeof WebsiteDocumentSchema>).refreshEnabled &&
      (data as z.infer<typeof WebsiteDocumentSchema>).refreshFrequency
    ) {
      const refreshFrequency = (data as z.infer<typeof WebsiteDocumentSchema>)
        .refreshFrequency;
      if (refreshFrequency) {
        try {
          const schedule = await createDocumentSchedule(
            documentId,
            refreshFrequency,
          );

          await db
            .update(schema.Document)
            .set({ refresh_schedule_id: schedule.id })
            .where(eq(schema.Document.id, documentId));
        } catch (error) {
          console.error("Failed to create schedule:", error);
        }
      }
    }

    return Response.json({
      documentTxid: documentTxid ? parseInt(documentTxid, 10) : undefined,
      snapshotTxid: snapshotData.txid,
      documentId,
      snapshotId: snapshotData.snapshotId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
