import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { RefreshFrequency } from "@/db/schema";
import * as schema from "@/db/schema";
import { DocumentSelectSchema } from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import { normalizeFolderPath } from "@/lib/folder-utils";
import {
  createDocumentSchedule,
  deleteDocumentSchedule,
  updateDocumentSchedule,
} from "@/lib/schedules";

export const preferredRegion = "iad1";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; id: string }>;
  },
) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { error: "DATABASE_URL not configured" },
      { status: 500 },
    );
  }

  const headers = request.headers;

  console.log({ headers });

  let pool: Pool | undefined;
  try {
    const { projectId, id: documentId } = await params;
    const json = await request.json();

    const updates = DocumentSelectSchema.partial().parse(json);

    if (updates.folder) {
      updates.folder = normalizeFolderPath(updates.folder);
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        "No fields to update",
        400,
      );
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
    });

    const dbPool = drizzle({
      client: pool,
      schema,
    });

    const document = await dbPool.query.Document.findFirst({
      where: eq(schema.Document.id, documentId),
    });

    if (!document) {
      throw new ApiError(
        ErrorCode.DOCUMENT_NOT_FOUND,
        "Document not found",
        404,
      );
    }

    if (document.project_id !== projectId) {
      throw new ApiError(ErrorCode.FORBIDDEN, "Document not in project", 403);
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

    const result = await dbPool.transaction(async (tx) => {
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

    return Response.json({ txid: parseInt(result.txid, 10) });
  } catch (error) {
    if (pool) {
      await pool.end();
    }
    return handleApiError(error);
  }
}
