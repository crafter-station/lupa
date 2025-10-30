import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import { requireSecretKey } from "@/lib/api-permissions";
import { generateInternalToken } from "@/lib/crypto/internal-token";
import { generateId, IdSchema } from "@/lib/generate-id";
import { createDocumentSchedule } from "@/lib/schedules";
import { getAPIBaseURL } from "@/lib/utils";
import { DocumentNameSchema, FolderPathSchema } from "@/lib/validation";

export const preferredRegion = ["iad1", "gru1"];

const BaseDocumentSchema = z.object({
  document_id: IdSchema.optional(),
  snapshot_id: IdSchema.optional(),

  folder: FolderPathSchema,
  name: DocumentNameSchema,
  description: z.string().optional(),

  enhance: z.boolean().optional(),
  metadata_schema: z.any().optional(),
});

const WebsiteDocumentSchema = BaseDocumentSchema.extend({
  url: z.string().url(),
  refresh_frequency: z.enum(["daily", "weekly", "monthly"]).nullable(),
});

const UploadDocumentSchema = BaseDocumentSchema.extend({
  file: z.instanceof(File),
  parsing_instructions: z.string().optional(),
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

async function createDocumentWithTxid({
  document_id,
  project_id,
  org_id,
  data,
}: {
  document_id: string;
  project_id: string;
  org_id: string;
  data: {
    folder: string;
    name: string;
    description?: string;
    refresh_frequency?: "daily" | "weekly" | "monthly" | null;
    metadata_schema?: Record<string, unknown>;
  };
}): Promise<string> {
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
        id: document_id,
        project_id: project_id,
        org_id: org_id,
        folder: data.folder,
        name: data.name,
        description: data.description,
        refresh_frequency: data.refresh_frequency,
        metadata_schema: data.metadata_schema,
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
  document_id: string,
  project_id: string,
  org_id: string,
  data: {
    folder: string;
    name: string;
    description?: string;
    refresh_frequency?: "daily" | "weekly" | "monthly" | null;
  },
): Promise<void> {
  await db.insert(schema.Document).values({
    id: document_id,
    project_id: project_id,
    org_id: org_id,
    folder: data.folder,
    name: data.name,
    description: data.description,
    refresh_frequency: data.refresh_frequency,
  });
}

async function createSnapshot(
  project_id: string,
  type: "website" | "upload",
  data: {
    snapshot_id?: string;
    document_id: string;
    url?: string;
    file?: File;
    enhance?: boolean;
    metadata_schema?: string;
    parsing_instructions?: string;
  },
): Promise<{ snapshotId: string; txid: string }> {
  const apiUrl = `${getAPIBaseURL(project_id)}/snapshots?type=${type}`;

  let body: BodyInit;
  const internalToken = generateInternalToken(project_id);

  const headers: HeadersInit = {
    "X-Internal-Token": internalToken,
  };

  if (type === "website") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      document_id: data.document_id,
      snapshot_id: data.snapshot_id,

      enhance: data.enhance,

      url: data.url,
    });
  } else {
    const formData = new FormData();

    formData.append("document_id", data.document_id);
    if (data.snapshot_id) formData.append("snapshot_id", data.snapshot_id);

    if (data.enhance !== undefined)
      formData.append("enhance", String(data.enhance));

    if (data.file) formData.append("file", data.file);
    if (data.parsing_instructions)
      formData.append("parsing_instructions", data.parsing_instructions);
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
    await requireSecretKey(request);

    const { projectId } = await params;
    const search = request.nextUrl.searchParams;

    const type = z.enum(["website", "upload"]).parse(search.get("type"));

    const project = await validateProject(projectId);

    const { data } = await parseRequestData(request, type);

    const document_id = data.document_id || generateId();
    let document_txid: string | undefined;

    if (data.document_id) {
      document_txid = await createDocumentWithTxid({
        document_id,
        project_id: project.id,
        org_id: project.org_id,
        data: {
          folder: data.folder,
          name: data.name,
          description: data.description,
          refresh_frequency:
            type === "website"
              ? (data as z.infer<typeof WebsiteDocumentSchema>)
                  .refresh_frequency
              : null,
        },
      });
    } else {
      await createDocumentSimple(document_id, project.id, project.org_id, {
        folder: data.folder,
        name: data.name,
        description: data.description,
        refresh_frequency:
          type === "website"
            ? (data as z.infer<typeof WebsiteDocumentSchema>).refresh_frequency
            : null,
      });
    }

    const snapshotData = await createSnapshot(project.id, type, {
      snapshot_id: data.snapshot_id,
      document_id: document_id,
      url:
        type === "website"
          ? (data as z.infer<typeof WebsiteDocumentSchema>).url
          : undefined,
      file:
        type === "upload"
          ? (data as z.infer<typeof UploadDocumentSchema>).file
          : undefined,
      enhance: data.enhance,
      parsing_instructions:
        type === "upload"
          ? (data as z.infer<typeof UploadDocumentSchema>).parsing_instructions
          : undefined,
    });

    if (
      type === "website" &&
      (data as z.infer<typeof WebsiteDocumentSchema>).refresh_frequency
    ) {
      const refresh_frequency = (data as z.infer<typeof WebsiteDocumentSchema>)
        .refresh_frequency;
      if (refresh_frequency) {
        try {
          const schedule = await createDocumentSchedule(
            document_id,
            refresh_frequency,
          );

          await db
            .update(schema.Document)
            .set({ refresh_schedule_id: schedule.id })
            .where(eq(schema.Document.id, document_id));
        } catch (error) {
          console.error("Failed to create schedule:", error);
        }
      }
    }

    return Response.json({
      document_txid: document_txid ? parseInt(document_txid, 10) : undefined,
      snapshot_txid: snapshotData.txid,
      document_id,
      snapshot_id: snapshotData.snapshotId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
