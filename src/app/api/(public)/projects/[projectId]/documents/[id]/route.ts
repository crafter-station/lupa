import { auth } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod/v3";
import type { RefreshFrequency } from "@/db/schema";
import * as schema from "@/db/schema";
import { DocumentSelectSchema } from "@/db/schema";
import { normalizeFolderPath } from "@/lib/folder-utils";
import {
  createDocumentSchedule,
  deleteDocumentSchedule,
  updateDocumentSchedule,
} from "@/lib/schedules";

export const preferredRegion = "iad1";

export const UpdateDocumentRequestSchema = z
  .object({
    folder: z.string().describe("Folder path (starts and ends with slash)"),
    name: z.string().describe("Document name"),
    description: z.string().describe("Document description"),
    metadata_schema: z
      .object({
        mode: z.enum(["infer", "custom"]),
        schema: z.record(z.string(), z.unknown()).optional(),
      })
      .optional()
      .describe("Metadata schema configuration"),
    refresh_enabled: z.boolean().describe("Enable automatic refresh"),
    refresh_frequency: z
      .enum(["daily", "weekly", "monthly"])
      .nullable()
      .optional()
      .describe("Refresh frequency"),
  })
  .describe("All fields are optional for partial updates")
  .partial();

export const DocumentSuccessResponseSchema = z.object({
  success: z.literal(true),
  txid: z.number(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

/**
 * Update an existing document
 * @description Updates document properties including name, description, folder, metadata schema, and refresh settings. All fields are optional for partial updates.
 * @param id Path parameter representing the document ID.
 * @body UpdateDocumentRequestSchema
 * @response 200:DocumentSuccessResponseSchema
 * @response 400:ErrorResponseSchema
 * @response 404:ErrorResponseSchema
 * @response 500:ErrorResponseSchema
 * @openapi
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let pool: Pool | undefined;
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: documentId } = await params;
    const json = await request.json();

    const updates = DocumentSelectSchema.partial().parse(json);

    if (updates.folder) {
      updates.folder = normalizeFolderPath(updates.folder);
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { success: false, error: "No fields to update" },
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
      where: eq(schema.Document.id, documentId),
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

    const scheduleChanges: {
      refresh_schedule_id?: string | null;
      refresh_enabled?: boolean;
      refresh_frequency?: RefreshFrequency | null;
    } = {};

    const hasRefreshChanges =
      "refresh_enabled" in updates || "refresh_frequency" in updates;

    if (hasRefreshChanges) {
      const newEnabled = updates.refresh_enabled ?? document.refresh_enabled;
      const newFrequency =
        updates.refresh_frequency ?? document.refresh_frequency;

      if (newEnabled && newFrequency) {
        if (document.refresh_schedule_id) {
          try {
            await updateDocumentSchedule(
              document.refresh_schedule_id,
              documentId,
              newFrequency,
            );
          } catch (error) {
            console.error("Failed to update schedule:", error);
          }
        } else {
          try {
            const schedule = await createDocumentSchedule(
              documentId,
              newFrequency,
            );
            scheduleChanges.refresh_schedule_id = schedule.id;
          } catch (error) {
            console.error("Failed to create schedule:", error);
          }
        }
      } else {
        if (document.refresh_schedule_id) {
          try {
            await deleteDocumentSchedule(document.refresh_schedule_id);
            scheduleChanges.refresh_schedule_id = null;
            scheduleChanges.refresh_enabled = false;
            scheduleChanges.refresh_frequency = null;
          } catch (error) {
            console.error("Failed to delete schedule:", error);
          }
        }
      }
    }

    const result = await db.transaction(async (tx) => {
      await tx
        .update(schema.Document)
        .set({
          ...updates,
          ...scheduleChanges,
          updated_at: sql`NOW()`,
        })
        .where(eq(schema.Document.id, documentId));

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txid.rows[0].txid as string,
      };
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
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
