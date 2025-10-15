import { Pool } from "@neondatabase/serverless";
import { auth } from "@trigger.dev/sdk/v3";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DocumentInsert, SnapshotInsert } from "@/db/schema";
import * as schema from "@/db/schema";
import { generateId } from "@/lib/generate-id";
import { processSnapshotBulkTask } from "@/trigger/process-snapshot-bulk.task";

export const preferredRegion = "iad1";
export const maxDuration = 60;

const BulkDocumentItemSchema = z.object({
  folder: z.string().default("/"),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  url: z.string().min(1),
});

const BulkCreateDocumentsRequestSchema = z.object({
  project_id: z.string().min(1),
  documents: z.array(BulkDocumentItemSchema).min(1).max(50),
});

export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
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

    const documents: DocumentInsert[] = [];
    const snapshots: SnapshotInsert[] = [];

    docs.forEach((doc) => {
      const docId = generateId();
      documents.push({
        id: docId,
        folder: doc.folder,
        name: doc.name,
        description: doc.description,
        project_id,
        metadata_schema: null,
        refresh_enabled: false,
        refresh_frequency: null,
        refresh_schedule_id: null,
      });

      snapshots.push({
        id: generateId(),
        document_id: docId,
        type: "website" as const,
        status: "queued" as const,
        url: doc.url,
        markdown_url: null,
        chunks_count: null,
        metadata: null,
        extracted_metadata: null,
        changes_detected: false,
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

    const handle = await processSnapshotBulkTask.trigger({
      snapshotIds: snapshots.map((snapshot) => snapshot.id),
    });

    const publicAccessToken = await auth.createPublicToken({
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
