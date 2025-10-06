import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { DOCUMENT_TABLE } from "@/db";
import * as schema from "@/db/schema";
import { ELECTRIC_URL } from "@/lib/electric";
import { processSnapshotTask } from "@/trigger/process-snapshot.task";

export const preferredRegion = "iad1";

const WhereParamsSchema = z.object({
  where: z.string().optional(),
  params: z.record(z.string(), z.string()).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  const whereValue = url.searchParams.get("where");
  const paramsEntries: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    if (key.startsWith("params[")) {
      paramsEntries[key] = value;
    }
  });

  const validation = WhereParamsSchema.safeParse({
    where: whereValue ?? undefined,
    params: Object.keys(paramsEntries).length > 0 ? paramsEntries : undefined,
  });

  if (!validation.success) {
    return Response.json(
      { success: false, error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const originUrl = new URL(ELECTRIC_URL);

  url.searchParams.forEach((value, key) => {
    if (
      ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key) ||
      key === "where" ||
      key.startsWith("params[")
    ) {
      originUrl.searchParams.set(key, value);
    }
  });

  originUrl.searchParams.set("table", DOCUMENT_TABLE);

  const response = await fetch(originUrl);

  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function POST(request: Request) {
  let pool: Pool | undefined;
  try {
    const json = await request.json();

    const {
      id: documentId,
      project_id,
      path,
      name,
      description,
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
        path,
        name,
        description,
        project_id,
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

      await processSnapshotTask.trigger({
        snapshotId: snapshotId,
      });

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
