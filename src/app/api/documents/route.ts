import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import * as schema from "@/db/schema";
import { createDocumentSchedule } from "@/lib/schedules";
import { processSnapshotTask } from "@/trigger/process-snapshot.task";

export const preferredRegion = "iad1";

export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const json = await request.json();

    const {
      id: documentId,
      project_id,
      folder,
      name,
      description,
      metadata_schema,
      refresh_enabled,
      refresh_frequency,
    } = schema.DocumentInsertSchema.parse(json);

    const {
      id: snapshotId,
      url,
      status,
      type,
    } = schema.SnapshotInsertSchema.parse(json.snapshot);

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

    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, project_id),
    });

    if (!project) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    const result = await db.transaction(async (tx) => {
      await tx.insert(schema.Document).values({
        id: documentId,
        folder,
        name,
        description,
        project_id,
        metadata_schema,
        refresh_enabled,
        refresh_frequency,
        refresh_schedule_id: null,
      });

      await tx.insert(schema.Snapshot).values({
        id: snapshotId,
        document_id: documentId,
        url,
        status,
        type,
      });

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txid.rows[0].txid as string,
      };
    });

    await processSnapshotTask.trigger({
      snapshotId: snapshotId,
    });

    if (refresh_enabled && refresh_frequency) {
      try {
        const schedule = await createDocumentSchedule(
          documentId,
          refresh_frequency,
        );

        await db
          .update(schema.Document)
          .set({
            refresh_schedule_id: schedule.id,
          })
          .where(eq(schema.Document.id, documentId));
      } catch (error) {
        console.error("Failed to create schedule:", error);
      }
    }

    revalidatePath(`/projects/${project_id}/documents`);
    if (folder && folder !== "/") {
      revalidatePath(`/projects/${project_id}/documents${folder}`);
    }

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
