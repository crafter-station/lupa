import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { ApiKey } from "@/db/schema";
import { verifyApiKey } from "./crypto";

export interface ApiKeyValidationResult {
  valid: boolean;
  projectId?: string;
  apiKeyId?: string;
}

export async function validateApiKey(
  request: NextRequest,
): Promise<ApiKeyValidationResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false };
  }

  const apiKey = authHeader.substring(7).trim();

  if (!apiKey.startsWith("lupa_sk_")) {
    return { valid: false };
  }

  const parts = apiKey.split("_");
  if (parts.length < 4) {
    return { valid: false };
  }

  const projectId = parts[2];
  if (!projectId) {
    return { valid: false };
  }

  try {
    const apiKeys = await db
      .select()
      .from(ApiKey)
      .where(eq(ApiKey.project_id, projectId));

    for (const keyRecord of apiKeys) {
      const isValid = await verifyApiKey(apiKey, keyRecord.key_hash);
      if (isValid) {
        await db
          .update(ApiKey)
          .set({ last_used_at: new Date().toISOString() })
          .where(eq(ApiKey.id, keyRecord.id));

        return {
          valid: true,
          projectId: keyRecord.project_id,
          apiKeyId: keyRecord.id,
        };
      }
    }

    return { valid: false };
  } catch (error) {
    console.error("API key validation error:", error);
    return { valid: false };
  }
}
