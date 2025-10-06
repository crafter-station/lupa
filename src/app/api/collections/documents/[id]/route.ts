import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import * as schema from "@/db/schema";

export const preferredRegion = "iad1";

const DocumentUpdateSchema = z.object({
  folder: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let pool: Pool | undefined;
  try {
    const { id: documentId } = await params;
    const json = await request.json();

    const updates = DocumentUpdateSchema.parse(json);

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { success: false, error: "No fields to update" },
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

    const document = await db.query.Document.findFirst({
      where: eq(schema.Document.id, documentId),
    });

    if (!document) {
      return Response.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    const result = await db.transaction(async (tx) => {
      await tx
        .update(schema.Document)
        .set({
          ...updates,
          updated_at: sql`NOW()`,
        })
        .where(eq(schema.Document.id, documentId));

      const txid = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

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
