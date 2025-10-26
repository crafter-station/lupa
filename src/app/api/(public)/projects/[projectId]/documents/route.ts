import { auth } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import * as schema from "@/db/schema";
import { folderFromUrl, normalizeFolderPath } from "@/lib/folder-utils";
import { createDocumentSchedule } from "@/lib/schedules";
import { getAPIBaseURL } from "@/lib/utils";

export const preferredRegion = "iad1";

export const CreateDocumentRequestSchema = z.object({
  id: z.string().min(1, "id is required"),
  project_id: z.string().min(1, "project_id is required"),
  folder: z
    .string()
    .default("/")
    .describe("Folder path (starts and ends with slash)"),
  name: z.string().min(1, "name is required"),
  description: z.string().nullable().optional(),
  metadata_schema: z
    .string()
    .nullable()
    .optional()
    .describe("JSON stringified metadata schema configuration"),
  refresh_enabled: z
    .enum(["true", "false"])
    .optional()
    .describe("Enable automatic refresh (string boolean)"),
  refresh_frequency: z
    .enum(["daily", "weekly", "monthly"])
    .nullable()
    .optional(),
  "snapshot.id": z.string().min(1, "snapshot.id is required"),
  "snapshot.type": z.enum(["website", "upload"]),
  "snapshot.status": z.enum(["queued", "error", "running", "success"]),
  "snapshot.url": z
    .string()
    .nullable()
    .optional()
    .describe("URL for website snapshots"),
  "snapshot.file": z.any().optional().describe("File for upload snapshots"),
  "snapshot.metadata": z
    .string()
    .nullable()
    .optional()
    .describe("JSON stringified snapshot metadata"),
  "snapshot.parsingInstruction": z.string().nullable().optional(),
});

export const DocumentSuccessResponseSchema = z.object({
  success: z.literal(true),
  txid: z.number(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

/**
 * Create a new document with snapshot
 * @description Creates a new document and its initial snapshot. Accepts multipart/form-data for file uploads or website URLs. Optionally configures automatic refresh scheduling.
 * @body CreateDocumentRequestSchema
 * @contentType multipart/form-data
 * @response 200:DocumentSuccessResponseSchema
 * @response 400:ErrorResponseSchema
 * @response 404:ErrorResponseSchema
 * @response 500:ErrorResponseSchema
 * @openapi
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  let pool: Pool | undefined;
  try {
    const { orgId } = await auth();
    const { projectId } = await params;

    if (!orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const documentId = formData.get("id") as string;
    const rawFolder = (formData.get("folder") as string) || "/";
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
    const parsingInstruction = formData.get("snapshot.parsing_instruction") as
      | string
      | null;
    const enhance = formData.get("snapshot.enhance") as boolean | null;

    const folder =
      snapshotType === "website" && snapshotUrl
        ? folderFromUrl(snapshotUrl)
        : normalizeFolderPath(rawFolder);

    if (
      !documentId ||
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
      where: eq(schema.Project.id, projectId),
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
        org_id: orgId,
        folder,
        name,
        description,
        project_id: projectId,
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
      snapshotFormData.append("parsing_instruction", parsingInstruction);
    }

    if (enhance) {
      snapshotFormData.append("enhance", enhance.toString());
    }

    const snapshotResponse = await fetch(
      `${getAPIBaseURL(projectId)}/snapshots`,
      {
        method: "POST",
        headers: {
          Cookie: request.headers.get("cookie") || "",
        },
        body: snapshotFormData,
      },
    );

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

    revalidatePath(`/projects/${projectId}/documents`);
    if (folder && folder !== "/") {
      revalidatePath(`/projects/${project}/documents${folder}`);
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
