import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import type { RefreshFrequency } from "@/db/schema";
import * as schema from "@/db/schema";
import { DocumentSelectSchema } from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import { requireSecretKey } from "@/lib/api-permissions";
import { normalizeFolderPath } from "@/lib/folder-utils";
import {
  createDocumentSchedule,
  deleteDocumentSchedule,
  updateDocumentSchedule,
} from "@/lib/schedules";

export const preferredRegion = ["iad1"];

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; documentId: string }>;
  },
) {
  try {
    await requireSecretKey(request);

    const { projectId, documentId } = await params;
    const json = await request.json();

    const updates = DocumentSelectSchema.pick({
      folder: true,
      name: true,
      description: true,
      metadata_schema: true,
      refresh_frequency: true,
    })
      .partial()
      .parse(json);

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

    const document = await db.query.Document.findFirst({
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
      refresh_frequency?: RefreshFrequency | null;
    } = {};

    const hasRefreshChanges = "refresh_frequency" in updates;

    if (hasRefreshChanges) {
      const newFrequency =
        updates.refresh_frequency ?? document.refresh_frequency;

      if (newFrequency) {
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
            scheduleChanges.refresh_frequency = null;
          } catch (error) {
            console.error("Failed to delete schedule:", error);
          }
        }
      }
    }

    await db
      .update(schema.Document)
      .set({
        ...updates,
        ...scheduleChanges,
        updated_at: sql`NOW()`,
      })
      .where(eq(schema.Document.id, documentId));

    return new Response(
      JSON.stringify({
        ok: true,
      }),
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> },
) {
  const { projectId, documentId } = await params;

  const [document] = await db
    .select()
    .from(schema.Document)
    .where(
      and(
        eq(schema.Document.id, documentId),
        eq(schema.Document.project_id, projectId),
      ),
    )
    .limit(1);

  if (!document) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json(document);
}
