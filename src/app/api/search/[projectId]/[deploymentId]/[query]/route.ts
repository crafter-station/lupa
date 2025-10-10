import { nanoid } from "nanoid";
import { after } from "next/server";
import { logSearchRequest, logSearchResults } from "@/lib/tinybird";
import { getVectorIndex, invalidateVectorCache } from "@/lib/vector";

export const preferredRegion = "iad1";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; deploymentId: string; query: string }>;
  },
) {
  const startTime = Date.now();
  const requestId = nanoid();

  try {
    const { deploymentId, query, projectId } = await params;
    const decodedQuery = decodeURIComponent(query);

    const vector = await getVectorIndex(deploymentId);

    const results = await vector.query({
      data: decodedQuery,
      topK: 5,
      includeData: true,
      includeMetadata: true,
    });

    const responseTime = Date.now() - startTime;
    const scores = results.map((r) => r.score);

    after(() => {
      Promise.all([
        logSearchRequest({
          requestId,
          projectId,
          deploymentId,
          query: decodedQuery,
          statusCode: 200,
          responseTimeMs: responseTime,
          resultsReturned: results.length,
          avgSimilarityScore:
            scores.length > 0
              ? scores.reduce((a, b) => a + b, 0) / scores.length
              : 0,
          minSimilarityScore: scores.length > 0 ? Math.min(...scores) : 0,
          maxSimilarityScore: scores.length > 0 ? Math.max(...scores) : 0,
        }),
        logSearchResults(requestId, projectId, deploymentId, results),
      ]).catch((error) => {
        console.error("Error logging search results:", error);
      });
    });

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
    const responseTime = Date.now() - startTime;
    const { projectId, deploymentId, query } = await params;

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error instanceof Error) {
      if (error.message.includes("ENCRYPTION_SECRET")) {
        errorMessage = "Server configuration error";
        statusCode = 500;
      } else if (error.message.includes("Invalid encrypted data")) {
        await invalidateVectorCache(deploymentId);
        errorMessage = "Cache corrupted, please retry";
        statusCode = 500;
      } else if (error.message.includes("not found")) {
        errorMessage = error.message;
        statusCode = 404;
      }
    }

    after(() => {
      logSearchRequest({
        requestId,
        projectId,
        deploymentId,
        query: decodeURIComponent(query),
        statusCode,
        responseTimeMs: responseTime,
        resultsReturned: 0,
        errorMessage,
      }).catch(() => {});
    });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
    });
  }
}
