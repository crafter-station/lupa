// ls /path/to/folder
// list files and directories in current location
// users will hit https://<projectId>.lupa.build/api/search/?query=<query>

import { Index as VectorIndex } from "@upstash/vector";
import { cacheLife, cacheTag } from "next/cache";
import z from "zod/v3";
import { getVectorIndex, invalidateVectorCache } from "@/lib/crypto/vector";

export const preferredRegion = ["iad1"];

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      score: z.number(),
      vector: z.array(z.number()).nullable(),
      sparseVector: z
        .object({
          indices: z.array(z.number()),
          values: z.array(z.number()),
        })
        .nullable(),
      data: z.string().nullable(),
      metadata: z.object({}).nullable(),
    }),
  ),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

async function performSearch(
  projectId: string,
  deploymentId: string,
  decodedQuery: string,
) {
  "use cache: remote";
  cacheLife({
    stale: 2592000,
    revalidate: 2592000,
    expire: 2592000000,
  });
  cacheTag(`search:${projectId}:${deploymentId}:${decodedQuery}`);

  const indexCredentials = await getVectorIndex(projectId);
  const index = new VectorIndex(indexCredentials);
  const namespace = index.namespace(deploymentId);

  const results = await namespace.query({
    data: decodedQuery,
    topK: 5,
    includeData: true,
    includeMetadata: true,
  });

  return results.map((result) => ({
    id: result.id,
    score: result.score,
    data: result.data,
    metadata: result.metadata,
  }));
}

/**
 * Search within a deployment
 * @description Perform a search query against the specified deployment.
 * @param projectId Path parameter representing the project ID.
 * @param deploymentId Path parameter representing the deployment ID.
 * @response 200:SearchResponseSchema
 * @response 400:ErrorResponseSchema
 * @openapi
 */
export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; deploymentId: string; query: string }>;
  },
) {
  try {
    const { deploymentId, projectId, query } = await params;
    const decodedQuery = decodeURIComponent(query);

    const results = await performSearch(projectId, deploymentId, decodedQuery);

    return new Response(
      JSON.stringify({
        query: decodedQuery,
        results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Search API error:", error);
    const { projectId } = await params;

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error instanceof Error) {
      if (error.message.includes("Vector index not found")) {
        errorMessage = "Vector index not found";
        statusCode = 404;
      } else if (error.message.includes("ENCRYPTION_SECRET")) {
        errorMessage = "Server configuration error";
        statusCode = 500;
      } else if (error.message.includes("Invalid encrypted data")) {
        await invalidateVectorCache(projectId);
        errorMessage = "Cache corrupted, please retry";
        statusCode = 500;
      } else if (error.message.includes("not found")) {
        errorMessage = error.message;
        statusCode = 404;
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
    });
  }
}
