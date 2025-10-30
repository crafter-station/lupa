import { auth as triggerAuth } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { db } from "@/db";
import type {
  DocumentInsert,
  RefreshFrequency,
  SnapshotInsert,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import { requireSecretKey } from "@/lib/api-permissions";
import { generateId } from "@/lib/generate-id";
import { createDocumentSchedule } from "@/lib/schedules";
import { processWebsiteSnapshotBulkTask } from "@/trigger/process-website-snapshot-bulk.task";

export const preferredRegion = "iad1";
export const maxDuration = 60;

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
  documents: z.array(BulkDocumentItemSchema).min(1),
});

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  },
) {
  try {
    await requireSecretKey(request);

    const { projectId } = await params;

    const body = await request.json();
    const { documents: docs } = BulkCreateDocumentsRequestSchema.parse(body);

    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, projectId),
    });

    if (!project) {
      throw new ApiError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", 404);
    }

    const documents: DocumentInsert[] = [];
    const snapshots: SnapshotInsert[] = [];
    const schedulePromises: Array<{
      docId: string;
      frequency: RefreshFrequency;
    }> = [];

    docs.forEach((doc) => {
      const docId = generateId();

      if (doc.refresh_frequency !== "none") {
        schedulePromises.push({
          docId,
          frequency: doc.refresh_frequency as RefreshFrequency,
        });
      }

      documents.push({
        id: docId,
        org_id: project.org_id,
        folder: doc.folder,
        name: doc.name,
        description: doc.description,
        project_id: projectId,
        metadata_schema: null,
        refresh_frequency:
          doc.refresh_frequency !== "none" ? doc.refresh_frequency : null,
        refresh_schedule_id: null,
      });

      snapshots.push({
        id: generateId(),
        org_id: project.org_id,
        document_id: docId,
        type: "website" as const,
        status: "queued" as const,
        url: doc.url,
        markdown_url: null,
        chunks_count: null,
        metadata: null,
        changes_detected: false,
        enhance: doc.enhance,
      });
    });

    await db.insert(schema.Document).values(documents);
    await db.insert(schema.Snapshot).values(snapshots);

    for (const { docId, frequency } of schedulePromises) {
      try {
        const schedule = await createDocumentSchedule(docId, frequency);

        await db
          .update(schema.Document)
          .set({ refresh_schedule_id: schedule.id })
          .where(eq(schema.Document.id, docId));
      } catch (error) {
        console.error(
          `Failed to create schedule for document ${docId}:`,
          error,
        );
      }
    }

    const handle = await processWebsiteSnapshotBulkTask.trigger({
      snapshotIds: snapshots.map((snapshot) => snapshot.id),
    });

    const publicAccessToken = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [handle.id],
        },
      },
      expirationTime: "1hr",
    });

    revalidatePath(`/projects/${projectId}/documents`);

    return Response.json({
      created_count: documents.length,
      snapshot_ids: snapshots.map((snapshot) => snapshot.id),
      run_id: handle.id,
      public_access_token: publicAccessToken,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
