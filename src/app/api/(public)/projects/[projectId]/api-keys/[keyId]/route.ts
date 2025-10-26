import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v3";
import { db } from "@/db";
import { ApiKey, Project } from "@/db/schema";

export const preferredRegion = "iad1";

const UpdateApiKeyRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const ErrorResponseSchema = z.object({
  error: z.string(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; keyId: string }> },
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, keyId } = await params;

    const project = await db.query.Project.findFirst({
      where: eq(Project.id, projectId),
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.org_id !== orgId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = await db.query.ApiKey.findFirst({
      where: eq(ApiKey.id, keyId),
    });

    if (!apiKey) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    if (apiKey.project_id !== projectId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateApiKeyRequestSchema.parse(body);

    const [updatedKey] = await db
      .update(ApiKey)
      .set({
        name: validated.name,
        updated_at: new Date().toISOString(),
      })
      .where(eq(ApiKey.id, keyId))
      .returning();

    return Response.json({
      id: updatedKey.id,
      name: updatedKey.name,
      key_preview: updatedKey.key_preview,
      last_used_at: updatedKey.last_used_at,
      created_at: updatedKey.created_at,
      updated_at: updatedKey.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Failed to update API key:", error);
    return Response.json(
      { error: "Failed to update API key" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; keyId: string }> },
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, keyId } = await params;

    const project = await db.query.Project.findFirst({
      where: eq(Project.id, projectId),
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.org_id !== orgId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const apiKey = await db.query.ApiKey.findFirst({
      where: eq(ApiKey.id, keyId),
    });

    if (!apiKey) {
      return Response.json({ error: "API key not found" }, { status: 404 });
    }

    if (apiKey.project_id !== projectId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(ApiKey).where(eq(ApiKey.id, keyId));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return Response.json(
      { error: "Failed to delete API key" },
      { status: 500 },
    );
  }
}
