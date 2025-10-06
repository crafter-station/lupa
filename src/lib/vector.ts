import { Index as VectorIndex } from "@upstash/vector";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { redis } from "@/db/redis";
import * as schema from "@/db/schema";
import { decrypt, encrypt } from "@/lib/crypto";

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
  deploymentId: string,
  options?: { skipCache?: boolean },
): Promise<VectorIndex> {
  const cacheKey = `vectorConfig:${deploymentId}`;

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

  const deployments = await db
    .select()
    .from(schema.Deployment)
    .where(eq(schema.Deployment.id, deploymentId))
    .limit(1);

  if (!deployments.length) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  const deployment = deployments[0];

  if (!deployment.vector_index_id) {
    throw new Error(`Deployment ${deploymentId} does not have a vector index`);
  }

  const url = `https://api.upstash.com/v2/vector/index/${deployment.vector_index_id}`;
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
      ex: 15 * 60, // 15 min
    },
  );

  return new VectorIndex({
    url: `https://${vectorConfig.endpoint}`,
    token: vectorConfig.token,
  });
}

export async function invalidateVectorCache(
  deploymentId: string,
): Promise<void> {
  await redis.del(`vectorConfig:${deploymentId}`);
}
