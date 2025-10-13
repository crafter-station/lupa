import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/db/schema";
import { deleteDocumentSchedule } from "@/lib/schedules";
import { processSnapshotTask } from "@/trigger/process-snapshot.task";

export const preferredRegion = "iad1";

export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const json = await request.json();

    const data = schema.SnapshotInsertSchema.parse(json);

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
      where: eq(schema.Document.id, data.document_id),
    });

    if (!document) {
      return Response.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    const existingSnapshots = await db.query.Snapshot.findMany({
      where: eq(schema.Snapshot.document_id, data.document_id),
      orderBy: (snapshots, { desc }) => [desc(snapshots.created_at)],
      limit: 1,
    });

    const previousSnapshot = existingSnapshots[0];
    const isTypeChange =
      previousSnapshot?.type === "website" && data.type === "upload";

    const result = await db.transaction(async (tx) => {
      await tx
        .insert(schema.Snapshot)
        .values(data as typeof schema.Snapshot.$inferInsert);

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
            .where(eq(schema.Document.id, data.document_id));
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
      snapshotId: data.id,
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
