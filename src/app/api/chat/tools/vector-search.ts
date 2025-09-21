
import { z } from "zod";
import { Index } from "@upstash/vector";
import description from "./vector-search.md";

// Environment variables for Upstash Vector

const vectorSearchSchema = z.object({
  query: z.string().describe("The search query to find relevant documents"),
  limit: z.number().default(5).describe("Maximum number of results to return"),
});

type VectorSearchParams = z.infer<typeof vectorSearchSchema>;
type VectorSearchResult = {
  results: Array<{
    id: string | number;
    content: string;
    score: number;
    metadata: {
      documentId?: unknown;
      filename?: unknown;
      userId?: unknown;
      chunkIndex?: unknown;
      createdAt?: unknown;
    };
  }>;
  message: string;
  query: string;
  error?: string;
};

export const vectorSearchTool = {
  description: description,
  inputSchema: vectorSearchSchema,
  execute: async (params: VectorSearchParams): Promise<VectorSearchResult> => {
    try {
      // Debug: log query and limit (avoid logging user identity)
      try { console.log("[VECTOR] query", { queryPreview: params.query.slice(0, 200), limit: params.limit }); } catch {}
      const index = new Index({
        url: process.env.UPSTASH_VECTOR_REST_URL!,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
      });

      const queryResults = await index.query({
        data: params.query,
        topK: params.limit,
        includeMetadata: true,
        includeData: true,
      });

      if (!queryResults || queryResults.length === 0) {
        try { console.log("[VECTOR] no results"); } catch {}
        return {
          results: [],
          message: "No relevant documents found for your query.",
          query: params.query,
        };
      }

      const results = queryResults.map((result) => ({
        id: result.id,
        content: result.data || "No content available",
        score: result.score,
        metadata: {
          documentId: result.metadata?.documentId,
          filename: result.metadata?.filename,
          userId: result.metadata?.userId,
          chunkIndex: result.metadata?.chunkIndex,
          createdAt: result.metadata?.createdAt,
        },
      }));

      return {
        results,
        message: `Found ${results.length} relevant document chunks.`,
        query: params.query,
      };
    } catch (error) {
      console.error("Vector search error:", error);
      return {
        results: [],
        message: "An error occurred while searching documents. Please try again.",
        query: params.query,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
}; 