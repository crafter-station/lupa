import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextResponse } from "next/server";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateId, IdSchema } from "@/lib/generate-id";
import { createDocumentSchedule } from "@/lib/schedules";
import { getAPIBaseURL } from "@/lib/utils";

export const preferredRegion = "iad1";

export async function POST(
  request: Request,
  {
    params,
    searchParams,
  }: {
    params: Promise<{ projectId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  },
) {
  try {
    const { projectId } = await params;
    const { type: rawType } = await searchParams;

    const type = z.enum(["website", "upload"]).parse(rawType);

    let documentTxid: string | undefined;
    let snapshotTxid: string | undefined;

    let documentId: string | undefined;
    let snapshotId: string | undefined;

    if (type === "website") {
      const body = await request.json();
      const {
        documentId: existingDocId,
        snapshotId: existingSnapId,

        folder,
        name,
        description,

        enhance,
        metadataSchema,

        url,
        refresh,
        refreshFrequency,
      } = z
        .object({
          documentId: IdSchema.optional(),
          snapshotId: IdSchema.optional(),

          folder: z.string().startsWith("/").endsWith("/"),
          name: z.string(),
          description: z.string().optional(),

          enhance: z.boolean().optional(),
          metadataSchema: z.string().optional(),

          // website specific
          url: z.string().url(),
          refresh: z.boolean().optional(),
          refreshFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        })
        .parse(body);

      const [project] = await db
        .select()
        .from(schema.Project)
        .where(eq(schema.Project.id, projectId))
        .limit(1);

      if (!project) {
        return Response.json(
          { success: false, error: "Project not found" },
          { status: 404 },
        );
      }

      documentId = existingDocId;
      if (documentId) {
        let pool: Pool | undefined;
        try {
          pool = new Pool({
            connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
          });

          const dbPool = drizzle({
            client: pool,
            schema,
          });
          const documentResult = await dbPool.transaction(async (tx) => {
            await tx.insert(schema.Document).values({
              // biome-ignore lint/style/noNonNullAssertion: it's no longer undefined
              id: documentId!,
              project_id: project.id,
              org_id: project.org_id,

              folder,
              name,
              description,
              refresh_enabled: refresh,
              refresh_frequency: refreshFrequency,
            });

            const txid = await tx.execute(
              sql`SELECT pg_current_xact_id()::xid::text as txid`,
            );

            return {
              txid: txid.rows[0].txid as string,
            };
          });

          documentTxid = documentResult.txid;
        } catch {
          return Response.json(
            {
              error: "Something went wrong",
            },
            {
              status: 400,
            },
          );
        } finally {
          if (pool) {
            pool.end();
          }
        }
      } else {
        documentId = generateId();
        try {
          await db.insert(schema.Document).values({
            id: documentId,
            project_id: project.id,
            org_id: project.org_id,

            folder,
            name,

            description,

            refresh_enabled: refresh,
            refresh_frequency: refreshFrequency,
          });
        } catch {}
      }

      if (existingSnapId) {
        snapshotId = existingSnapId;
      }

      const response = await fetch(
        `${getAPIBaseURL(projectId)}/snapshots?type=website`,
        {
          method: "POST",
          body: JSON.stringify({
            snapshotId,
            documentId,

            url,

            enhance,
            metadataSchema,
          }),
        },
      );
      const data = await response.json();
      snapshotId = data.snapshotId;
      snapshotTxid = data.txid;

      if (refresh && refreshFrequency) {
        try {
          const schedule = await createDocumentSchedule(
            documentId,
            refreshFrequency,
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
    } else {
      const formData = await request.formData();
      const {
        documentId: existingDocId,
        snapshotId: existingSnapId,

        folder,
        name,
        description,

        enhance,
        metadataSchema,

        file,
        parsingInstructions,
      } = z
        .object({
          documentId: IdSchema.optional(),
          snapshotId: IdSchema.optional(),

          folder: z.string().startsWith("/").endsWith("/"),
          name: z.string(),
          description: z.string().optional(),

          enhance: z.boolean().optional(),
          metadataSchema: z.string().optional(),

          // upload specific
          file: z.instanceof(File),
          parsingInstructions: z.string().optional(),
        })
        .parse(Object.fromEntries(formData));

      const [project] = await db
        .select()
        .from(schema.Project)
        .where(eq(schema.Project.id, projectId))
        .limit(1);

      if (!project) {
        return Response.json(
          { success: false, error: "Project not found" },
          { status: 404 },
        );
      }

      documentId = existingDocId;
      if (documentId) {
        let pool: Pool | undefined;
        try {
          pool = new Pool({
            connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
          });

          const dbPool = drizzle({
            client: pool,
            schema,
          });
          const documentResult = await dbPool.transaction(async (tx) => {
            await tx.insert(schema.Document).values({
              // biome-ignore lint/style/noNonNullAssertion: it's no longer undefined
              id: documentId!,
              project_id: project.id,
              org_id: project.org_id,

              folder,
              name,
              description,
            });

            const txid = await tx.execute(
              sql`SELECT pg_current_xact_id()::xid::text as txid`,
            );

            return {
              txid: txid.rows[0].txid as string,
            };
          });

          documentTxid = documentResult.txid;
        } catch {}
      } else {
        documentId = generateId();
        try {
          await db.insert(schema.Document).values({
            id: documentId,
            project_id: project.id,
            org_id: project.org_id,

            folder,
            name,

            description,
          });
        } catch {}
      }

      const snapshotFormData = new FormData();
      Object.entries({
        documentId,
        snapshotId,

        enhance,
        metadataSchema,

        file,
        parsingInstructions,
      }).forEach(([key, value]) => {
        if (value) {
          snapshotFormData.append(
            key,
            typeof value === "boolean" ? String(value) : value,
          );
        }
      });

      if (existingSnapId) {
        snapshotId = existingSnapId;
      }

      const response = await fetch(
        `${getAPIBaseURL(projectId)}/snapshots?type=upload`,
        {
          method: "POST",
          body: snapshotFormData,
        },
      );
      const data = await response.json();
      snapshotId = data.snapshotId;
      snapshotTxid = data.txid;
    }

    return NextResponse.json({
      documentTxid,
      snapshotTxid,
      documentId,
      snapshotId,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
