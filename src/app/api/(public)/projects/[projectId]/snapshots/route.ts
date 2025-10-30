import { Pool } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { handleApiError } from "@/lib/api-error";
import { requireSecretKey } from "@/lib/api-permissions";
import { generateId, IdSchema } from "@/lib/generate-id";
import { deleteDocumentSchedule } from "@/lib/schedules";
import { processSnapshotTask } from "@/trigger/process-snapshot.task";

export const preferredRegion = "iad1";

const WebsiteSnapshotSchema = z.object({
  snapshot_id: IdSchema.optional(),
  document_id: IdSchema,

  enhance: z.boolean().optional(),

  url: z.string().url(),
});

const UploadSnapshotSchema = z.object({
  snapshot_id: IdSchema.optional(),
  document_id: IdSchema,

  enhance: z.boolean().optional(),

  file: z.instanceof(File),
  parsing_instructions: z.string().optional(),
});

async function parseRequestData(request: Request, type: "website" | "upload") {
  const contentType = request.headers.get("content-type") || "";
  const isFormData = contentType.includes("multipart/form-data");

  if (type === "website") {
    if (isFormData) {
      throw new Error("Website snapshots must use application/json");
    }
    const body = await request.json();
    return {
      data: WebsiteSnapshotSchema.parse(body),
      file: undefined,
    };
  }

  if (!isFormData) {
    throw new Error("Upload snapshots must use multipart/form-data");
  }

  const formData = await request.formData();
  const parsed = UploadSnapshotSchema.parse({
    snapshot_id: formData.get("snapshot_id") || undefined,
    document_id: formData.get("document_id"),
    file: formData.get("file"),
    enhance: formData.get("enhance") === "true",
    parsing_instructions: formData.get("parsing_instructions") || undefined,
  });

  return { data: parsed, file: parsed.file };
}

async function validateDocument(documentId: string, projectId: string) {
  const [document] = await db
    .select({
      id: schema.Document.id,
      org_id: schema.Document.org_id,
      project_id: schema.Document.project_id,
      refresh_schedule_id: schema.Document.refresh_schedule_id,
      project: schema.Project,
    })
    .from(schema.Document)
    .innerJoin(
      schema.Project,
      eq(schema.Document.project_id, schema.Project.id),
    )
    .where(eq(schema.Document.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error("Document not found");
  }

  if (document.project_id !== projectId) {
    throw new Error("Document not in project");
  }

  return document;
}

async function uploadFile(file: File, orgId: string) {
  try {
    const blob = await put(`documents/${orgId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return { url: blob.url };
  } catch {
    throw new Error("Failed to upload file");
  }
}

async function handleTypeChange(
  documentId: string,
  refreshScheduleId: string | null,
) {
  if (!refreshScheduleId) return;

  try {
    await deleteDocumentSchedule(refreshScheduleId);
    await db
      .update(schema.Document)
      .set({
        refresh_frequency: null,
        refresh_schedule_id: null,
        updated_at: sql`NOW()`,
      })
      .where(eq(schema.Document.id, documentId));
  } catch (error) {
    console.error("Failed to delete schedule:", error);
  }
}

async function createSnapshotWithTxid({
  pool,
  snapshot_id,
  document_id,
  org_id,
  type,
  url,
  enhance,
  refresh_schedule_id,
  is_type_change,
}: {
  pool: Pool;
  url: string;
  snapshot_id: string;
  document_id: string;
  org_id: string;
  type: "website" | "upload";
  enhance: boolean;
  refresh_schedule_id: string | null;
  is_type_change: boolean;
}): Promise<string> {
  const dbPool = drizzle({ client: pool, schema });

  const result = await dbPool.transaction(async (tx) => {
    const txidResult = await tx.execute(
      sql`SELECT pg_current_xact_id()::xid::text as txid`,
    );

    if (!txidResult.rows[0]?.txid) {
      throw new Error("Failed to get transaction ID");
    }

    await tx.insert(schema.Snapshot).values({
      id: snapshot_id,
      org_id: org_id,
      document_id: document_id,
      type,
      status: "queued",
      url,
      enhance,
    });

    if (is_type_change && refresh_schedule_id) {
      try {
        await deleteDocumentSchedule(refresh_schedule_id);
        await tx
          .update(schema.Document)
          .set({
            refresh_frequency: null,
            refresh_schedule_id: null,
            updated_at: sql`NOW()`,
          })
          .where(eq(schema.Document.id, document_id));
      } catch (error) {
        console.error("Failed to delete schedule:", error);
      }
    }

    return { txid: txidResult.rows[0].txid as string };
  });

  return result.txid;
}

async function createSnapshotSimple({
  snapshot_id,
  document_id,
  org_id,
  type,
  url,
  enhance,
  refresh_schedule_id,
  is_type_change,
}: {
  snapshot_id: string;
  document_id: string;
  org_id: string;
  type: "website" | "upload";
  url: string;
  enhance: boolean;
  refresh_schedule_id: string | null;
  is_type_change: boolean;
}): Promise<void> {
  await db.insert(schema.Snapshot).values({
    id: snapshot_id,
    org_id: org_id,
    document_id: document_id,
    type,
    status: "queued",
    url,
    metadata: null,
    markdown_url: null,
    chunks_count: null,
    changes_detected: false,
    enhance,
  });

  if (is_type_change) {
    await handleTypeChange(document_id, refresh_schedule_id);
  }
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  },
) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: "DATABASE_URL not configured" },
      { status: 500 },
    );
  }

  try {
    await requireSecretKey(request);

    const { projectId } = await params;
    const search = request.nextUrl.searchParams;

    const type = z.enum(["website", "upload"]).parse(search.get("type"));

    const { data, file } = await parseRequestData(request, type);

    const document = await validateDocument(data.document_id, projectId);

    const snapshotId = data.snapshot_id || generateId();

    let snapshotUrl = "";

    if (type === "website") {
      const websiteData = data as z.infer<typeof WebsiteSnapshotSchema>;
      snapshotUrl = websiteData.url;
    } else if (file) {
      const uploadResult = await uploadFile(file, document.org_id);
      snapshotUrl = uploadResult.url;
    }

    const [previousSnapshot] = await db
      .select()
      .from(schema.Snapshot)
      .where(eq(schema.Snapshot.document_id, data.document_id))
      .orderBy(desc(schema.Snapshot.created_at))
      .limit(1);

    const isTypeChange =
      previousSnapshot?.type === "website" && type === "upload";

    let snapshotTxid: string | undefined;

    if (data.snapshot_id) {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not configured");
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
      });

      try {
        snapshotTxid = await createSnapshotWithTxid({
          pool,
          snapshot_id: data.snapshot_id,
          document_id: data.document_id,
          org_id: document.org_id,
          type,
          enhance: data.enhance || false,
          refresh_schedule_id: document.refresh_schedule_id,
          is_type_change: isTypeChange,
          url: snapshotUrl,
        });
      } finally {
        await pool.end();
      }
    } else {
      await createSnapshotSimple({
        snapshot_id: snapshotId,
        document_id: data.document_id,
        org_id: document.org_id,
        type,
        url: snapshotUrl,
        enhance: data.enhance || false,
        refresh_schedule_id: document.refresh_schedule_id,
        is_type_change: isTypeChange,
      });
    }

    try {
      await processSnapshotTask.trigger({
        snapshotId,
        parsingInstruction:
          type === "upload"
            ? (data as z.infer<typeof UploadSnapshotSchema>)
                .parsing_instructions
            : undefined,
      });
    } catch (error) {
      console.error("Failed to trigger snapshot processing:", error);
    }

    return Response.json({
      snapshot_id: snapshotId,
      txid: snapshotTxid ? parseInt(snapshotTxid, 10) : undefined,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
