import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod/v3";
import { db } from "@/db";
import { redis } from "@/db/redis";
import * as schema from "@/db/schema";
import { hashApiKey } from "@/lib/crypto/api-key";
import { generateId, IdSchema } from "@/lib/generate-id";

export const preferredRegion = ["iad1", "gru1"];

const CreateApiKeyRequestSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  projectId: IdSchema,
  environment: z.enum(["live", "test"]).default("test"),
  keyType: z.enum(["sk", "pk"]).default("sk"),
});

const GetApiKeysRequestSchema = z.object({
  projectId: IdSchema,
});

export async function GET(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const { projectId: validatedProjectId } = GetApiKeysRequestSchema.parse({
      projectId,
    });

    const [project] = await db
      .select()
      .from(schema.Project)
      .where(
        and(
          eq(schema.Project.id, validatedProjectId),
          eq(schema.Project.org_id, orgId),
        ),
      )
      .limit(1);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const apiKeys = await db
      .select({
        id: schema.ApiKey.id,
        name: schema.ApiKey.name,
        key_preview: schema.ApiKey.key_preview,
        environment: schema.ApiKey.environment,
        key_type: schema.ApiKey.key_type,
        last_used_at: schema.ApiKey.last_used_at,
        created_at: schema.ApiKey.created_at,
      })
      .from(schema.ApiKey)
      .where(eq(schema.ApiKey.project_id, validatedProjectId));

    return Response.json(apiKeys, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }
    console.error("Failed to fetch API keys:", error);
    return Response.json(
      { error: "Failed to fetch API keys" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, projectId, environment, keyType } =
      CreateApiKeyRequestSchema.parse(body);

    const [project] = await db
      .select()
      .from(schema.Project)
      .where(
        and(eq(schema.Project.id, projectId), eq(schema.Project.org_id, orgId)),
      )
      .limit(1);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const existingKey = await db.query.ApiKey.findFirst({
      where: and(
        eq(schema.ApiKey.project_id, projectId),
        eq(schema.ApiKey.environment, environment),
        eq(schema.ApiKey.key_type, keyType),
        eq(schema.ApiKey.name, name),
        eq(schema.ApiKey.is_active, true),
      ),
    });

    if (existingKey) {
      return Response.json(
        {
          error:
            "An active key with this name, environment, and type already exists",
        },
        { status: 409 },
      );
    }

    const randomPart = nanoid(32);
    const apiKey = `lupa_${keyType}_${environment}_${randomPart}`;
    const keyPreview = `lupa_${keyType}_${environment}_****${randomPart.slice(-4)}`;
    const keyHash = hashApiKey(apiKey);

    const apiKeyId = generateId();

    const date = new Date().toISOString();
    await db.insert(schema.ApiKey).values({
      id: apiKeyId,
      project_id: project.id,
      org_id: project.org_id,
      name,
      key_hash: keyHash,
      key_preview: keyPreview,
      environment,
      key_type: keyType,
      is_active: true,
    });

    await redis.set(
      `apikey:${keyHash}`,
      JSON.stringify({
        id: apiKeyId,
        org_id: project.org_id,
        project_id: project.id,
        is_active: true,
        name: name,
        environment,
        key_type: keyType,
      }),
      { ex: 60 * 60 * 24 * 30 },
    );

    return Response.json(
      {
        id: apiKeyId,
        name,
        api_key: apiKey,
        key_preview: keyPreview,
        environment,
        key_type: keyType,
        created_at: date,
        last_used_at: null,
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
