import { auth } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod/v3";
import * as schema from "@/db/schema";
import { deleteDocumentSchedule } from "@/lib/schedules";
import { processSnapshotTask } from "@/trigger/process-snapshot.task";

export const preferredRegion = "iad1";

export const CreateSnapshotRequestSchema = z.object({
  id: z
    .string()
    .min(1, "id is required")
    .describe("Unique snapshot ID (use generateId with 'snap_' prefix)"),
  document_id: z
    .string()
    .min(1, "document_id is required")
    .describe("ID of the parent document"),
  type: z.enum(["website", "upload"]).describe("Snapshot type"),
  status: z
    .enum(["queued", "error", "running", "success"])
    .describe("Initial snapshot status"),
  url: z
    .string()
    .nullable()
    .optional()
    .describe("URL for website snapshots (required when type is 'website')"),
  file: z
    .any()
    .optional()
    .describe(
      "File for upload snapshots (required when type is 'upload'). Supported formats: PDF, DOCX, XLSX, PPTX, CSV, HTML, TXT",
    ),
  metadata: z
    .string()
    .nullable()
    .optional()
    .describe("JSON stringified snapshot metadata"),
  parsingInstruction: z
    .string()
    .nullable()
    .optional()
    .describe("Custom parsing instructions for document processing"),
});

export const SnapshotSuccessResponseSchema = z.object({
  success: z.literal(true),
  txid: z.number(),
});

export const SnapshotErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

/**
 * Create a new snapshot
 * @description Creates a new snapshot for a document. Snapshots are immutable versions of documents that can be either website scrapes or file uploads. Website snapshots trigger the process-snapshot background task to scrape content with Firecrawl. Upload snapshots upload files to Vercel Blob and trigger the parse-document task to extract and chunk content using LlamaParse. If switching from website to upload type, any existing refresh schedule will be automatically deleted.
 * @body CreateSnapshotRequestSchema
 * @contentType multipart/form-data
 * @response 200:SnapshotSuccessResponseSchema
 * @response 400:SnapshotErrorResponseSchema
 * @response 404:SnapshotErrorResponseSchema
 * @response 500:SnapshotErrorResponseSchema
 * @openapi
 */
export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const id = formData.get("id") as string;
    const document_id = formData.get("document_id") as string;
    const type = formData.get("type") as schema.SnapshotType;
    const status = formData.get("status") as schema.SnapshotStatus;
    const url = formData.get("url") as string | null;
    const file = formData.get("file") as File | null;
    const metadataStr = formData.get("metadata") as string | null;
    const parsingInstruction = formData.get("parsing_instruction") as
      | string
      | null;
    const enhance = formData.get("enhance") as boolean | null;

    if (!id || !document_id || !type || !status) {
      return Response.json(
        {
          success: false,
          error: "Missing required fields: id, document_id, type, status",
        },
        { status: 400 },
      );
    }

    if (type === "website" && !url) {
      return Response.json(
        { success: false, error: "URL is required for website snapshots" },
        { status: 400 },
      );
    }

    if (type === "upload" && !file) {
      return Response.json(
        { success: false, error: "File is required for upload snapshots" },
        { status: 400 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { success: false, error: "DATABASE_URL is not set" },
        { status: 500 },
      );
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
    });

    const db = drizzle({
      client: pool,
      schema,
    });

    const document = await db.query.Document.findFirst({
      where: eq(schema.Document.id, document_id),
    });

    if (!document) {
      return Response.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    if (document.org_id !== orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const existingSnapshots = await db.query.Snapshot.findMany({
      where: eq(schema.Snapshot.document_id, document_id),
      orderBy: (snapshots, { desc }) => [desc(snapshots.created_at)],
      limit: 1,
    });

    const previousSnapshot = existingSnapshots[0];
    const isTypeChange =
      previousSnapshot?.type === "website" && type === "upload";

    let snapshotUrl = url || "";
    let snapshotMetadata: Record<string, unknown> = {};

    if (metadataStr) {
      try {
        snapshotMetadata = JSON.parse(metadataStr);
      } catch (error) {
        console.error("Failed to parse metadata:", error);
      }
    }

    if (type === "upload" && file) {
      const userId = "temp-user-id";
      const blob = await put(`documents/${userId}/${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });

      snapshotUrl = blob.url;
      snapshotMetadata.file_name = file.name;
      snapshotMetadata.file_size = file.size;

      if (parsingInstruction?.trim()) {
        snapshotMetadata.parsing_instruction = parsingInstruction.trim();
      }
    }

    const result = await db.transaction(async (tx) => {
      await tx.insert(schema.Snapshot).values({
        id,
        org_id: orgId,
        document_id,
        type,
        status,
        url: snapshotUrl,
        metadata: snapshotMetadata,
        markdown_url: null,
        chunks_count: null,
        extracted_metadata: null,
        changes_detected: false,
        enhance: enhance || false,
      });

      if (isTypeChange && document.refresh_schedule_id) {
        try {
          await deleteDocumentSchedule(document.refresh_schedule_id);
          await tx
            .update(schema.Document)
            .set({
              refresh_enabled: false,
              refresh_frequency: null,
              refresh_schedule_id: null,
              updated_at: sql`NOW()`,
            })
            .where(eq(schema.Document.id, document_id));
        } catch (error) {
          console.error("Failed to delete schedule:", error);
        }
      }

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txid.rows[0].txid as string,
      };
    });

    await processSnapshotTask.trigger({
      snapshotId: id,
      parsingInstruction: parsingInstruction || undefined,
    });

    await pool.end();

    return Response.json(
      { success: true, txid: parseInt(result.txid, 10) },
      { status: 200 },
    );
  } catch (error) {
    if (pool) {
      await pool.end();
    }

    console.error(error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
