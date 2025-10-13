import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import * as schema from "@/db/schema";
import { createDocumentSchedule } from "@/lib/schedules";

export const preferredRegion = "iad1";

export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const formData = await request.formData();

    const documentId = formData.get("id") as string;
    const project_id = formData.get("project_id") as string;
    const folder = (formData.get("folder") as string) || "/";
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const metadataSchemaStr = formData.get("metadata_schema") as string | null;
    const refresh_enabled = formData.get("refresh_enabled") === "true";
    const refresh_frequency = formData.get(
      "refresh_frequency",
    ) as schema.RefreshFrequency | null;

    const snapshotId = formData.get("snapshot.id") as string;
    const snapshotType = formData.get("snapshot.type") as schema.SnapshotType;
    const snapshotStatus = formData.get(
      "snapshot.status",
    ) as schema.SnapshotStatus;
    const snapshotUrl = formData.get("snapshot.url") as string | null;
    const snapshotFile = formData.get("snapshot.file") as File | null;
    const snapshotMetadataStr = formData.get("snapshot.metadata") as
      | string
      | null;
    const parsingInstruction = formData.get("snapshot.parsingInstruction") as
      | string
      | null;

    if (
      !documentId ||
      !project_id ||
      !name ||
      !snapshotId ||
      !snapshotType ||
      !snapshotStatus
    ) {
      return Response.json(
        { success: false, error: "Missing required fields" },
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

    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, project_id),
    });

    if (!project) {
      return Response.json(
        { success: false, error: "Project not found" },
        { status: 404 },
      );
    }

    let metadata_schema: schema.MetadataSchemaConfig | null = null;
    if (metadataSchemaStr) {
      try {
        metadata_schema = JSON.parse(metadataSchemaStr);
      } catch (error) {
        console.error("Failed to parse metadata_schema:", error);
      }
    }

    const documentResult = await db.transaction(async (tx) => {
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

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      return {
        txid: txid.rows[0].txid as string,
      };
    });

    const snapshotFormData = new FormData();
    snapshotFormData.append("id", snapshotId);
    snapshotFormData.append("document_id", documentId);
    snapshotFormData.append("type", snapshotType);
    snapshotFormData.append("status", snapshotStatus);

    if (snapshotType === "website" && snapshotUrl) {
      snapshotFormData.append("url", snapshotUrl);
    }

    if (snapshotType === "upload" && snapshotFile) {
      snapshotFormData.append("file", snapshotFile);
    }

    if (snapshotMetadataStr) {
      snapshotFormData.append("metadata", snapshotMetadataStr);
    }

    if (parsingInstruction) {
      snapshotFormData.append("parsingInstruction", parsingInstruction);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const snapshotResponse = await fetch(`${baseUrl}/api/snapshots`, {
      method: "POST",
      body: snapshotFormData,
    });

    if (!snapshotResponse.ok) {
      const error = await snapshotResponse.json();
      throw new Error(
        `Failed to create snapshot: ${error.error || snapshotResponse.statusText}`,
      );
    }

    const snapshotResult = (await snapshotResponse.json()) as {
      success: boolean;
      txid: number;
    };

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
      {
        success: true,
        txid: Math.max(parseInt(documentResult.txid, 10), snapshotResult.txid),
      },
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
