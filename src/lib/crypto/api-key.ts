import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NextFetchEvent, NextRequest } from "next/server";
import { db } from "@/db";
import { redis } from "@/db/redis";
import { ApiKey } from "@/db/schema";

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

interface ApiKeyCache {
  id: string;
  org_id: string;
  project_id: string;
  is_active: boolean;
  name: string;
  environment: "live" | "test";
  key_type: "sk" | "pk";
}

interface ValidatedApiKey {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  environment: "live" | "test";
  key_type: "sk" | "pk";
}

export async function validateApiKey(
  req: NextRequest,
  event: NextFetchEvent,
  projectId?: string,
): Promise<{
  valid: boolean;
  apiKeyId?: string;
  projectId?: string;
  data?: ValidatedApiKey;
}> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false };
  }

  const apiKey = authHeader.replace("Bearer ", "").trim();

  const legacyPattern = /^lupa_sk_[a-zA-Z0-9_-]{32,}$/;
  const newPattern = /^lupa_(sk|pk)_(live|test)_[a-zA-Z0-9_-]+$/;

  if (!legacyPattern.test(apiKey) && !newPattern.test(apiKey)) {
    return { valid: false };
  }

  const keyHash = hashApiKey(apiKey);
  const redisKey = `apikey:${keyHash}`;

  try {
    const cached = await redis.get<ApiKeyCache | "invalid" | null>(redisKey);

    if (cached === "invalid") {
      return { valid: false };
    }

    if (cached) {
      const keyData = cached;

      if (!keyData.is_active) {
        return { valid: false };
      }

      if (projectId && keyData.project_id !== projectId) {
        return { valid: false };
      }

      event.waitUntil(updateLastUsed(keyData.id).catch(console.error));

      return {
        valid: true,
        apiKeyId: keyData.id,
        projectId: keyData.project_id,
        data: {
          id: keyData.id,
          org_id: keyData.org_id,
          project_id: keyData.project_id,
          name: keyData.name,
          environment: keyData.environment,
          key_type: keyData.key_type,
        },
      };
    }

    const keyRecord = await db.query.ApiKey.findFirst({
      where: (keys, { eq, and }) =>
        and(eq(keys.key_hash, keyHash), eq(keys.is_active, true)),
    });

    if (!keyRecord) {
      await redis.set(redisKey, "invalid", { ex: 300 });
      return { valid: false };
    }

    if (projectId && keyRecord.project_id !== projectId) {
      return { valid: false };
    }

    await redis.set(
      redisKey,
      JSON.stringify({
        id: keyRecord.id,
        org_id: keyRecord.org_id,
        project_id: keyRecord.project_id,
        is_active: keyRecord.is_active,
        name: keyRecord.name,
        environment: keyRecord.environment,
        key_type: keyRecord.key_type,
      }),
      { ex: 60 * 60 * 24 * 30 },
    );

    event.waitUntil(updateLastUsed(keyRecord.id).catch(console.error));

    return {
      valid: true,
      apiKeyId: keyRecord.id,
      projectId: keyRecord.project_id,
      data: {
        id: keyRecord.id,
        org_id: keyRecord.org_id,
        project_id: keyRecord.project_id,
        name: keyRecord.name,
        environment: keyRecord.environment,
        key_type: keyRecord.key_type,
      },
    };
  } catch (error) {
    console.error("API key validation error:", error);
    return validateFromPostgres(keyHash, projectId);
  }
}

async function updateLastUsed(keyId: string) {
  try {
    await db
      .update(ApiKey)
      .set({
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(ApiKey.id, keyId));
  } catch (error) {
    console.error("Failed to update last_used_at:", error);
  }
}

async function validateFromPostgres(keyHash: string, projectId?: string) {
  const keyRecord = await db.query.ApiKey.findFirst({
    where: (keys, { eq, and }) =>
      and(eq(keys.key_hash, keyHash), eq(keys.is_active, true)),
  });

  if (!keyRecord) {
    return { valid: false };
  }

  if (projectId && keyRecord.project_id !== projectId) {
    return { valid: false };
  }

  return {
    valid: true,
    apiKeyId: keyRecord.id,
    projectId: keyRecord.project_id,
    data: {
      id: keyRecord.id,
      org_id: keyRecord.org_id,
      project_id: keyRecord.project_id,
      name: keyRecord.name,
      environment: keyRecord.environment,
      key_type: keyRecord.key_type,
    },
  };
}

export async function revokeApiKey(keyId: string) {
  const key = await db.query.ApiKey.findFirst({
    where: eq(ApiKey.id, keyId),
  });

  if (!key) return;

  await db
    .update(ApiKey)
    .set({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .where(eq(ApiKey.id, keyId));

  const redisKey = `apikey:${key.key_hash}`;
  await redis.del(redisKey);
}

export async function deleteApiKey(keyId: string) {
  const key = await db.query.ApiKey.findFirst({
    where: eq(ApiKey.id, keyId),
  });

  if (!key) return;

  await db.delete(ApiKey).where(eq(ApiKey.id, keyId));

  const redisKey = `apikey:${key.key_hash}`;
  await redis.del(redisKey);
}

export async function getApiKeyDataFromRequest(request: Request): Promise<{
  environment: "live" | "test";
  key_type: "sk" | "pk";
  id: string;
  project_id: string;
  org_id: string;
} | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.replace("Bearer ", "").trim();

  const legacyPattern = /^lupa_sk_[a-zA-Z0-9_-]{32,}$/;
  const newPattern = /^lupa_(sk|pk)_(live|test)_[a-zA-Z0-9_-]+$/;

  if (!legacyPattern.test(apiKey) && !newPattern.test(apiKey)) {
    return null;
  }

  const keyHash = hashApiKey(apiKey);
  const redisKey = `apikey:${keyHash}`;

  try {
    const cached = await redis.get<ApiKeyCache | "invalid" | null>(redisKey);

    if (cached === "invalid" || !cached) {
      return null;
    }

    if (!cached.is_active) {
      return null;
    }

    return {
      environment: cached.environment,
      key_type: cached.key_type,
      id: cached.id,
      project_id: cached.project_id,
      org_id: cached.org_id,
    };
  } catch (error) {
    console.error("API key data retrieval error:", error);

    const keyRecord = await db.query.ApiKey.findFirst({
      where: (keys, { eq, and }) =>
        and(eq(keys.key_hash, keyHash), eq(keys.is_active, true)),
    });

    if (!keyRecord) {
      return null;
    }

    return {
      environment: keyRecord.environment,
      key_type: keyRecord.key_type,
      id: keyRecord.id,
      project_id: keyRecord.project_id,
      org_id: keyRecord.org_id,
    };
  }
}
