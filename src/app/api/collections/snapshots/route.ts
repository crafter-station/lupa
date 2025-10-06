import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { SNAPSHOT_TABLE } from "@/db";
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

  originUrl.searchParams.set("table", SNAPSHOT_TABLE);

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

    const result = await db.transaction(async (tx) => {
      await tx
        .insert(schema.Snapshot)
        .values(data as typeof schema.Snapshot.$inferInsert);

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
