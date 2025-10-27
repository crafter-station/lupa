import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { Index as VectorIndex } from "@upstash/vector";
import { redis } from "@/db/redis";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  return scryptSync(secret, "salt", KEY_LENGTH);
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const key = getKey();
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

interface VectorConfig {
  id: string;
  endpoint: string;
  token: string;
}

interface CachedVectorConfig {
  id: string;
  endpoint: string;
  encryptedToken: string;
}

export async function getVectorIndex(
  projectId: string,
  deploymentId: string,
  options?: { skipCache?: boolean },
): Promise<VectorIndex> {
  const cacheKey = `vectorConfig:${projectId}:${deploymentId}`;

  if (!options?.skipCache) {
    const cachedVectorConfig = await redis.get<CachedVectorConfig>(cacheKey);

    if (cachedVectorConfig) {
      const { endpoint, encryptedToken } = cachedVectorConfig;
      const token = decrypt(encryptedToken);

      return new VectorIndex({
        url: `https://${endpoint}`,
        token,
      });
    }
  }

  const vectorIndexId = await redis.get<string>(
    `vectorIndexId:${projectId}:${deploymentId}`,
  );

  if (!vectorIndexId) {
    throw new Error("Vector index not found");
  }

  const url = `https://api.upstash.com/v2/vector/index/${vectorIndexId}`;
  const upstashResponse = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
    },
  });

  if (!upstashResponse.ok) {
    throw new Error(
      `Failed to fetch vector config: ${upstashResponse.status} ${upstashResponse.statusText}`,
    );
  }

  const vectorConfig = (await upstashResponse.json()) as VectorConfig;

  const encryptedToken = encrypt(vectorConfig.token);

  await redis.set(
    cacheKey,
    {
      id: vectorConfig.id,
      endpoint: vectorConfig.endpoint,
      encryptedToken,
    },
    {
      ex: 60 * 60, // 60 min
    },
  );

  return new VectorIndex({
    url: `https://${vectorConfig.endpoint}`,
    token: vectorConfig.token,
  });
}

export async function invalidateVectorCache(
  projectId: string,
  deploymentId: string,
): Promise<void> {
  await redis.del(`vectorConfig:${projectId}:${deploymentId}`);
}
