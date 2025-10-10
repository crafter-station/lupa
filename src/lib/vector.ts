import { Index as VectorIndex } from "@upstash/vector";
import { redis } from "@/db/redis";
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

  const vectorIndexId = await redis.get<string>(
    `vectorIndexId:${deploymentId}`,
  );

  if (!vectorIndexId) {
    throw new Error(`Deployment ${deploymentId} does not have a vector index`);
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
  deploymentId: string,
): Promise<void> {
  await redis.del(`vectorConfig:${deploymentId}`);
}
