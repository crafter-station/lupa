// TODO: Uncomment when Clerk is configured
// import { auth } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextResponse } from "next/server";
import * as schema from "@/db/schema";
import { getMimeTypeFromFilename } from "@/lib/parsers";
import { parseDocumentTask } from "@/trigger/parse-document.task";

export const preferredRegion = "iad1";

export async function POST(request: Request) {
  let pool: Pool | undefined;

  try {
    // TODO: Uncomment when Clerk is configured
    // const { userId } = await auth();
    // if (!userId) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    const userId = "temp-user-id"; // Temporary for testing

    const body = await request.json();
    const {
      documentId,
      snapshotId,
      blobUrl,
      filename,
      name,
      projectId,
      folder,
      description,
      metadataSchema,
      parsingInstruction,
    } = body;

    if (!documentId || !snapshotId || !blobUrl || !filename || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Use custom name if provided, otherwise use filename
    const documentName = name || filename;

    const mimeType = getMimeTypeFromFilename(filename);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Unable to determine file type" },
        { status: 400 },
      );
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL is not set" },
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

    const result = await db.transaction(async (tx) => {
      await tx.insert(schema.Document).values({
        id: documentId,
        folder: folder || "/",
        name: documentName,
        description,
        project_id: projectId,
        metadata_schema: metadataSchema,
      });

      await tx.insert(schema.Snapshot).values({
        id: snapshotId,
        document_id: documentId,
        url: blobUrl,
        status: "queued",
        type: "upload",
        metadata: {
          file_name: filename,
        },
      });

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      await parseDocumentTask.trigger({
        document: {
          id: documentId,
          blobUrl,
          filename,
          mimeType,
        },
        userId,
        parsingInstruction,
        snapshotId,
      });

      return {
        txid: txid.rows[0].txid as string,
        documentId,
        snapshotId,
      };
    });

    await pool.end();

    return NextResponse.json(
      {
        success: true,
        txid: Number.parseInt(result.txid, 10),
        documentId: result.documentId,
        snapshotId: result.snapshotId,
      },
      { status: 200 },
    );
  } catch (error) {
    if (pool) {
      await pool.end();
    }
    console.error("File upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
