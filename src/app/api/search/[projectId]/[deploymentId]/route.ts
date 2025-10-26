import { z } from "zod";
import {
  convertToUpstashFilter,
  parseMetadataFilters,
} from "@/lib/metadata-query-parser";
import {
  logApiKeyUsage,
  logSearchRequest,
  logSearchResults,
} from "@/lib/tinybird";
import type { SearchResponse } from "@/lib/types/search";
import { getVectorIndex } from "@/lib/vector";

export const preferredRegion = "iad1";

export const revalidate = false;

const querySchema = z.object({
  query: z.string().min(1, "Query is required"),
  documentIds: z
    .string()
    .nullish()
    .transform((val) => (val ? val.split(",").filter(Boolean) : undefined)),
  topK: z
    .string()
    .nullish()
    .transform((val) => (val ? Number.parseInt(val, 10) : 5)),
});

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; deploymentId: string }>;
  },
) {
  const startTime = Date.now();

  try {
    const { projectId, deploymentId } = await params;
    const { searchParams } = new URL(request.url);

    const requestId = request.headers.get("x-request-id") || undefined;
    const apiKeyId = request.headers.get("x-api-key-id") || undefined;

    const { query, documentIds, topK } = querySchema.parse({
      query: searchParams.get("query"),
      documentIds: searchParams.get("documentIds"),
      topK: searchParams.get("topK"),
    });

    const metadataFilters = parseMetadataFilters(searchParams);

    const vector = await getVectorIndex(deploymentId);

    const filterExpression = convertToUpstashFilter(
      metadataFilters,
      documentIds,
    );

    const results = await vector.query({
      data: query,
      topK,
      includeData: true,
      includeMetadata: true,
      filter: filterExpression,
    });

    const response: SearchResponse = {
      query,
      results: results.map((result) => ({
        id: String(result.id),
        score: result.score,
        data: result.data || "",
        metadata: {
          snapshotId: result.metadata?.snapshotId as string,
          documentId: result.metadata?.documentId as string,
          documentName: result.metadata?.documentName as string | undefined,
          documentPath: result.metadata?.documentPath as string | undefined,
          chunkIndex: result.metadata?.chunkIndex as number,
          chunkSize: result.metadata?.chunkSize as number | undefined,
          createdAt: result.metadata?.createdAt as string | undefined,
          ...result.metadata,
        },
      })),
      filters: {
        documentIds,
        metadataFilters,
      },
    };

    const responseTime = Date.now() - startTime;

    if (requestId) {
      const scores = response.results
        .map((r) => r.score)
        .filter((s) => typeof s === "number");

      const loggingPromises = [
        logSearchRequest({
          requestId,
          projectId,
          deploymentId,
          query,
          statusCode: 200,
          responseTimeMs: responseTime,
          resultsReturned: response.results.length,
          avgSimilarityScore:
            scores.length > 0
              ? scores.reduce((a, b) => a + b, 0) / scores.length
              : 0,
          minSimilarityScore: scores.length > 0 ? Math.min(...scores) : 0,
          maxSimilarityScore: scores.length > 0 ? Math.max(...scores) : 0,
        }),
        logSearchResults(requestId, projectId, deploymentId, response.results),
      ];

      if (apiKeyId) {
        loggingPromises.push(
          logApiKeyUsage({
            timestamp: new Date(),
            projectId,
            apiKeyId,
            endpoint: "/api/search",
            method: "GET",
            statusCode: 200,
            responseTimeMs: responseTime,
          }),
        );
      }

      Promise.all(loggingPromises).catch((error) => {
        console.error("Failed to log search analytics:", error);
      });
    }

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search API error:", error);

    const responseTime = Date.now() - startTime;
    const requestId = request.headers.get("x-request-id");
    const projectId = request.headers.get("x-project-id");
    const deploymentId = request.headers.get("x-deployment-id");

    if (requestId && projectId && deploymentId) {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("query") || "";

      logSearchRequest({
        requestId,
        projectId,
        deploymentId,
        query,
        statusCode: error instanceof z.ZodError ? 400 : 500,
        responseTimeMs: responseTime,
        resultsReturned: 0,
        avgSimilarityScore: 0,
        minSimilarityScore: 0,
        maxSimilarityScore: 0,
      }).catch((logError) => {
        console.error("Failed to log error:", logError);
      });
    }

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          issues: error.issues,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
