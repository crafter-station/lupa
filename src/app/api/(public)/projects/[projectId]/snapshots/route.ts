import { Pool } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateId, IdSchema } from "@/lib/generate-id";
import { deleteDocumentSchedule } from "@/lib/schedules";
import { processSnapshotTask } from "@/trigger/process-snapshot.task";

export const preferredRegion = "iad1";

const WebsiteSnapshotSchema = z.object({
  snapshotId: IdSchema.optional(),
  documentId: IdSchema,

  enhance: z.boolean().optional(),
  metadataSchema: z.string().optional(),

  url: z.string().url(),
  refreshEnabled: z.boolean().optional(),
  refreshFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
});

const UploadSnapshotSchema = z.object({
  snapshotId: IdSchema.optional(),
  documentId: IdSchema,

  enhance: z.boolean().optional(),
  metadataSchema: z.string().optional(),

  file: z.instanceof(File),
  parsingInstructions: z.string().optional(),
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
    snapshotId: formData.get("snapshotId") || undefined,
    documentId: formData.get("documentId"),
    file: formData.get("file"),
    enhance: formData.get("enhance") === "true",
    metadataSchema: formData.get("metadataSchema") || undefined,
    parsingInstructions: formData.get("parsingInstructions") || undefined,
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

async function processMetadataSchema(metadataSchema?: string) {
  const metadata: Record<string, unknown> = {};

  if (metadataSchema) {
    try {
      metadata.metadata_schema = JSON.parse(metadataSchema);
    } catch {
      throw new Error("Invalid metadataSchema JSON");
    }
  }

  return metadata;
}

async function uploadFile(
  file: File,
  orgId: string,
  parsingInstructions?: string,
) {
  try {
    const blob = await put(`documents/${orgId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    const metadata: Record<string, unknown> = {
      file_name: file.name,
      file_size: file.size,
    };

    if (parsingInstructions?.trim()) {
      metadata.parsing_instruction = parsingInstructions.trim();
    }

    return { url: blob.url, metadata };
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
        refresh_enabled: false,
        refresh_frequency: null,
        refresh_schedule_id: null,
        updated_at: sql`NOW()`,
      })
      .where(eq(schema.Document.id, documentId));
  } catch (error) {
    console.error("Failed to delete schedule:", error);
  }
}

async function createSnapshotWithTxid(
  pool: Pool,
  snapshotId: string,
  documentId: string,
  orgId: string,
  type: "website" | "upload",
  url: string,
  metadata: Record<string, unknown>,
  enhance: boolean,
  refreshScheduleId: string | null,
  isTypeChange: boolean,
): Promise<string> {
  const dbPool = drizzle({ client: pool, schema });

  const result = await dbPool.transaction(async (tx) => {
    await tx.insert(schema.Snapshot).values({
      id: snapshotId,
      org_id: orgId,
      document_id: documentId,
      type,
      status: "queued",
      url,
      metadata,
      markdown_url: null,
      chunks_count: null,
      extracted_metadata: null,
      changes_detected: false,
      enhance,
    });

    if (isTypeChange && refreshScheduleId) {
      try {
        await deleteDocumentSchedule(refreshScheduleId);
        await tx
          .update(schema.Document)
          .set({
            refresh_enabled: false,
            refresh_frequency: null,
            refresh_schedule_id: null,
            updated_at: sql`NOW()`,
          })
          .where(eq(schema.Document.id, documentId));
      } catch (error) {
        console.error("Failed to delete schedule:", error);
      }
    }

    const txidResult = await tx.execute(
      sql`SELECT pg_current_xact_id()::xid::text as txid`,
    );

    if (!txidResult.rows[0]?.txid) {
      throw new Error("Failed to get transaction ID");
    }

    return { txid: txidResult.rows[0].txid as string };
  });

  return result.txid;
}

async function createSnapshotSimple(
  snapshotId: string,
  documentId: string,
  orgId: string,
  type: "website" | "upload",
  url: string,
  metadata: Record<string, unknown>,
  enhance: boolean,
  refreshScheduleId: string | null,
  isTypeChange: boolean,
): Promise<void> {
  await db.insert(schema.Snapshot).values({
    id: snapshotId,
    org_id: orgId,
    document_id: documentId,
    type,
    status: "queued",
    url,
    metadata,
    markdown_url: null,
    chunks_count: null,
    extracted_metadata: null,
    changes_detected: false,
    enhance,
  });

  if (isTypeChange) {
    await handleTypeChange(documentId, refreshScheduleId);
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
    const { projectId } = await params;
    const search = request.nextUrl.searchParams;

    const type = z.enum(["website", "upload"]).parse(search.get("type"));

    const { data, file } = await parseRequestData(request, type);

    const document = await validateDocument(data.documentId, projectId);

    const snapshotId = data.snapshotId || generateId();
    const snapshotMetadata = await processMetadataSchema(data.metadataSchema);

    let snapshotUrl = "";

    if (type === "website") {
      const websiteData = data as z.infer<typeof WebsiteSnapshotSchema>;
      snapshotUrl = websiteData.url;

      if (websiteData.refreshEnabled !== undefined) {
        await db
          .update(schema.Document)
          .set({
            refresh_enabled: websiteData.refreshEnabled,
            refresh_frequency: websiteData.refreshFrequency || null,
            metadata_schema: snapshotMetadata.metadata_schema || null,
            updated_at: sql`NOW()`,
          })
          .where(eq(schema.Document.id, data.documentId));
      }
    } else if (file) {
      const uploadResult = await uploadFile(
        file,
        document.org_id,
        (data as z.infer<typeof UploadSnapshotSchema>).parsingInstructions,
      );
      snapshotUrl = uploadResult.url;
      Object.assign(snapshotMetadata, uploadResult.metadata);
    }

    const [previousSnapshot] = await db
      .select()
      .from(schema.Snapshot)
      .where(eq(schema.Snapshot.document_id, data.documentId))
      .orderBy(desc(schema.Snapshot.created_at))
      .limit(1);

    const isTypeChange =
      previousSnapshot?.type === "website" && type === "upload";

    let snapshotTxid: string | undefined;

    if (data.snapshotId) {
      if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not configured");
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
      });

      try {
        snapshotTxid = await createSnapshotWithTxid(
          pool,
          snapshotId,
          data.documentId,
          document.org_id,
          type,
          snapshotUrl,
          snapshotMetadata,
          data.enhance || false,
          document.refresh_schedule_id,
          isTypeChange,
        );
      } finally {
        await pool.end();
      }
    } else {
      await createSnapshotSimple(
        snapshotId,
        data.documentId,
        document.org_id,
        type,
        snapshotUrl,
        snapshotMetadata,
        data.enhance || false,
        document.refresh_schedule_id,
        isTypeChange,
      );
    }

    try {
      await processSnapshotTask.trigger({
        snapshotId,
        parsingInstruction:
          type === "upload"
            ? (data as z.infer<typeof UploadSnapshotSchema>).parsingInstructions
            : undefined,
      });
    } catch (error) {
      console.error("Failed to trigger snapshot processing:", error);
    }

    return Response.json({
      snapshotId,
      txid: snapshotTxid ? parseInt(snapshotTxid, 10) : undefined,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
