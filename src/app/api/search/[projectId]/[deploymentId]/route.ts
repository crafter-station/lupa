import { z } from "zod";
import {
  convertToUpstashFilter,
  parseMetadataFilters,
} from "@/lib/metadata-query-parser";
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
  try {
    const { deploymentId } = await params;
    const { searchParams } = new URL(request.url);

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

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search API error:", error);

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
