import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import { ApiKey, Project } from "@/db/schema";
import { hashApiKey } from "@/lib/crypto";
import { generateId } from "@/lib/generate-id";

export const preferredRegion = "iad1";

const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const ApiKeyListResponseSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    key_preview: z.string(),
    last_used_at: z.string().nullable(),
    created_at: z.string(),
  }),
);

const CreateApiKeyResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  key_preview: z.string(),
  created_at: z.string(),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await db.query.Project.findFirst({
      where: eq(Project.id, projectId),
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.org_id !== orgId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKeys = await db
      .select({
        id: ApiKey.id,
        name: ApiKey.name,
        key_preview: ApiKey.key_preview,
        last_used_at: ApiKey.last_used_at,
        created_at: ApiKey.created_at,
      })
      .from(ApiKey)
      .where(eq(ApiKey.project_id, projectId));

    return Response.json(apiKeys);
  } catch (error) {
    console.error("Failed to list API keys:", error);
    return Response.json({ error: "Failed to list API keys" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await db.query.Project.findFirst({
      where: eq(Project.id, projectId),
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.org_id !== orgId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateApiKeyRequestSchema.parse(body);

    const keyId = generateId();
    const randomPart = nanoid(32);
    const apiKey = `lupa_sk_${projectId}_${randomPart}`;
    const keyPreview = `****${randomPart.slice(-4)}`;
    const keyHash = await hashApiKey(apiKey);

    const [newApiKey] = await db
      .insert(ApiKey)
      .values({
        id: keyId,
        project_id: projectId,
        name: validated.name,
        key_hash: keyHash,
        key_preview: keyPreview,
      })
      .returning();

    return Response.json(
      {
        id: newApiKey.id,
        name: newApiKey.name,
        key: apiKey,
        key_preview: newApiKey.key_preview,
        created_at: newApiKey.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Failed to create API key:", error);
    return Response.json(
      { error: "Failed to create API key" },
      { status: 500 },
    );
  }
}
