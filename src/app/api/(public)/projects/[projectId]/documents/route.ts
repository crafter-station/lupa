import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import { requireSecretKey } from "@/lib/api-permissions";
import { generateInternalToken } from "@/lib/crypto/internal-token";
import { generateId } from "@/lib/generate-id";
import { createDocumentSchedule } from "@/lib/schedules";
import { getAPIBaseURL } from "@/lib/utils";
import { DocumentNameSchema, FolderPathSchema } from "@/lib/validation";

export const preferredRegion = ["iad1"];

const BaseDocumentSchema = z.object({
  folder: FolderPathSchema,
  name: DocumentNameSchema,
  description: z.string().optional(),

  enhance: z.boolean().optional(),
  metadata_schema: z.any().optional(),
});

const WebsiteDocumentSchema = BaseDocumentSchema.extend({
  url: z.string().url(),
  refresh_frequency: z.enum(["daily", "weekly", "monthly"]).nullable(),
});

const UploadDocumentSchema = BaseDocumentSchema.extend({
  file: z.instanceof(File),
  parsing_instructions: z.string().optional(),
});

async function parseRequestData(request: Request, type: "website" | "upload") {
  if (type === "website") {
    const body = await request.json();
    return {
      data: WebsiteDocumentSchema.parse(body),
      file: undefined,
    };
  }

  const formData = await request.formData();
  const data = UploadDocumentSchema.parse(Object.fromEntries(formData));
  return { data, file: data.file };
}

async function validateProject(projectId: string) {
  const project = await db.query.Project.findFirst({
    where: eq(schema.Project.id, projectId),
  });

  if (!project) {
    throw new ApiError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", 404);
  }

  return project;
}

async function createDocument(
  document_id: string,
  project_id: string,
  org_id: string,
  data: {
    folder: string;
    name: string;
    description?: string;
    refresh_frequency?: "daily" | "weekly" | "monthly" | null;
    metadata_schema?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(schema.Document).values({
    id: document_id,
    project_id: project_id,
    org_id: org_id,
    folder: data.folder,
    name: data.name,
    description: data.description,
    refresh_frequency: data.refresh_frequency,
    metadata_schema: data.metadata_schema,
  });
}

async function createSnapshot(
  project_id: string,
  type: "website" | "upload",
  data: {
    document_id: string;
    url?: string;
    file?: File;
    enhance?: boolean;
    metadata_schema?: string;
    parsing_instructions?: string;
  },
): Promise<{ snapshot_id: string }> {
  const apiUrl = `${getAPIBaseURL(project_id)}/snapshots?type=${type}`;

  let body: BodyInit;
  const internalToken = generateInternalToken(project_id);

  const headers: HeadersInit = {
    "X-Internal-Token": internalToken,
  };

  if (type === "website") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      document_id: data.document_id,
      enhance: data.enhance,
      url: data.url,
    });
  } else {
    const formData = new FormData();

    formData.append("document_id", data.document_id);

    if (data.enhance !== undefined)
      formData.append("enhance", String(data.enhance));

    if (data.file) formData.append("file", data.file);
    if (data.parsing_instructions)
      formData.append("parsing_instructions", data.parsing_instructions);
    body = formData;
  }

  const response = await fetch(apiUrl, { method: "POST", headers, body });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Snapshot creation failed: ${error}`);
  }

  return response.json();
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  },
) {
  try {
    await requireSecretKey(request);

    const { projectId } = await params;
    const search = request.nextUrl.searchParams;

    const type = z.enum(["website", "upload"]).parse(search.get("type"));

    const project = await validateProject(projectId);

    const { data } = await parseRequestData(request, type);

    const document_id = generateId();

    await createDocument(document_id, project.id, project.org_id, {
      folder: data.folder,
      name: data.name,
      description: data.description,
      refresh_frequency:
        type === "website"
          ? (data as z.infer<typeof WebsiteDocumentSchema>).refresh_frequency
          : null,
      metadata_schema: data.metadata_schema,
    });

    const snapshotData = await createSnapshot(project.id, type, {
      document_id: document_id,
      url:
        type === "website"
          ? (data as z.infer<typeof WebsiteDocumentSchema>).url
          : undefined,
      file:
        type === "upload"
          ? (data as z.infer<typeof UploadDocumentSchema>).file
          : undefined,
      enhance: data.enhance,
      parsing_instructions:
        type === "upload"
          ? (data as z.infer<typeof UploadDocumentSchema>).parsing_instructions
          : undefined,
    });

    if (
      type === "website" &&
      (data as z.infer<typeof WebsiteDocumentSchema>).refresh_frequency
    ) {
      const refresh_frequency = (data as z.infer<typeof WebsiteDocumentSchema>)
        .refresh_frequency;
      if (refresh_frequency) {
        try {
          const schedule = await createDocumentSchedule(
            document_id,
            refresh_frequency,
          );

          await db
            .update(schema.Document)
            .set({ refresh_schedule_id: schedule.id })
            .where(eq(schema.Document.id, document_id));
        } catch (error) {
          console.error("Failed to create schedule:", error);
        }
      }
    }

    revalidateTag(`docs-${projectId}`, "max");

    return Response.json({
      document_id,
      snapshot_id: snapshotData.snapshot_id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
