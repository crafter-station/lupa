import { auth as clerkAuth } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { auth as triggerAuth } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import type {
  DocumentInsert,
  RefreshFrequency,
  SnapshotInsert,
} from "@/db/schema";
import * as schema from "@/db/schema";
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
  project_id: z.string().min(1),
  documents: z.array(BulkDocumentItemSchema).min(1),
});

export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const { orgId } = await clerkAuth();

    if (!orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { project_id, documents: docs } =
      BulkCreateDocumentsRequestSchema.parse(body);

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { success: false, error: "DATABASE_URL is not set" },
        { status: 500 },
      );
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
    });

    const db = drizzle({
      client: pool,
      schema,
    });

    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, project_id),
    });

    if (!project) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    if (project.org_id !== orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
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
        org_id: orgId,
        folder: doc.folder,
        name: doc.name,
        description: doc.description,
        project_id,
        metadata_schema: null,
        refresh_enabled: doc.refresh_frequency !== "none",
        refresh_frequency:
          doc.refresh_frequency !== "none" ? doc.refresh_frequency : null,
        refresh_schedule_id: null,
      });

      snapshots.push({
        id: generateId(),
        org_id: orgId,
        document_id: docId,
        type: "website" as const,
        status: "queued" as const,
        url: doc.url,
        markdown_url: null,
        chunks_count: null,
        metadata: null,
        extracted_metadata: null,
        changes_detected: false,
        enhance: doc.enhance,
      });
    });

    const result = await db.transaction(async (tx) => {
      await tx.insert(schema.Document).values(documents);
      await tx.insert(schema.Snapshot).values(snapshots);

      const txidResult = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txidResult.rows[0].txid as string,
      };
    });

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

    revalidatePath(`/projects/${project_id}/documents`);

    await pool.end();

    return Response.json(
      {
        success: true,
        txid: Number.parseInt(result.txid, 10),
        created_count: documents.length,
        snapshot_ids: snapshots.map((snapshot) => snapshot.id),
        run_id: handle.id,
        public_access_token: publicAccessToken,
      },
      { status: 200 },
    );
  } catch (error) {
    if (pool) {
      await pool.end();
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: error.issues[0].message },
        { status: 400 },
      );
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
