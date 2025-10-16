import { type OpenAIResponsesProviderOptions, openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const maxDuration = 120;

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; deploymentId: string }>;
  },
) {
  try {
    const { projectId, deploymentId } = await params;
    const { messages, model }: { messages: UIMessage[]; model: string } =
      await request.json();

    const result = streamText({
      model: openai.responses(model || "gpt-5"),
      providerOptions: {
        openai: {
          reasoningEffort: "low",
          reasoningSummary: "detailed",
          include: ["reasoning.encrypted_content"],
        } satisfies OpenAIResponsesProviderOptions,
      },
      messages: convertToModelMessages(messages),
      system: `You are a helpful assistant with access to a knowledge base through two complementary tools:

1. **search-knowledge**: Returns CHUNKS (partial text excerpts) from documents matching your semantic search query. Each result includes:
   - content: A text chunk from the document (not the full document)
   - score: Similarity score
   - metadata: Contains snapshotId, documentId, chunkIndex, and other document metadata
   
2. **get-snapshot-contents**: Returns the COMPLETE markdown content of a specific document snapshot.

**When to use each tool:**

Use search-knowledge to:
- Discover which documents contain relevant information
- Find specific facts, data points, or keywords
- Get a quick overview of available information
- Locate documents when you don't know which ones are relevant

You MUST use get-snapshot-contents when:
- Users explicitly ask to summarize, analyze, review, or explain an entire document
- Search results show the same snapshotId appearing multiple times (indicating high relevance)
- Users request detailed information that requires understanding full document context
- Users ask questions that span multiple sections of a document
- You need to provide comprehensive answers that go beyond isolated text fragments
- Users ask "what does this document say about..." or similar holistic questions
- Users want comparisons across different parts of the same document

**Recommended workflow:**
1. Start with search-knowledge to find relevant snapshots
2. Examine the snapshotId field in the metadata of search results
3. If the same snapshotId appears in multiple results OR the user's question requires complete context, immediately call get-snapshot-contents with that snapshotId
4. Use the full document content to provide thorough, well-informed answers
5. Always prefer complete document context over fragmented chunks when the question demands depth

**Important**: Search results are CHUNKS, not full documents. Don't assume you have complete information from search alone. When in doubt about whether you need more context, use get-snapshot-contents.`,
      tools: {
        "search-knowledge": tool({
          description:
            "Search the knowledge base and return up to 5 relevant CHUNKS (text excerpts) with similarity scores and metadata. Each result is a partial excerpt from a document, not the complete document. Results include metadata with snapshotId (use this to retrieve full documents with get-snapshot-contents), documentId, chunkIndex, and other document metadata. Use this tool to discover which documents contain information related to your query.",
          inputSchema: z.object({
            query: z
              .string()
              .describe("The search query to find relevant information"),
          }),
          execute: async ({ query }) => {
            const searchUrl = `${request.headers.get("origin")}/api/search/${projectId}/${deploymentId}/${encodeURIComponent(query)}`;

            const response = await fetch(searchUrl);

            if (!response.ok) {
              throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json();

            return {
              query: data.query,
              resultsCount: data.results.length,
              results: data.results.map(
                (result: {
                  id: string;
                  score: number;
                  data: string;
                  metadata: {
                    snapshotId: string;
                    documentId: string;
                    chunkIndex: number;
                  };
                }) => ({
                  id: result.id,
                  score: result.score,
                  content: result.data,
                  metadata: {
                    ...result.metadata,
                  },
                }),
              ),
            };
          },
        }),
        "get-snapshot-contents": tool({
          description:
            "Retrieve the COMPLETE markdown content of a specific document snapshot. Use this tool when: (1) the same snapshotId appears repeatedly in search results, indicating high relevance; (2) users ask to summarize, analyze, review, or explain a document; (3) you need full document context to answer comprehensively; (4) users request detailed information spanning multiple sections; (5) the question requires understanding the complete document rather than isolated fragments. Always use this after search-knowledge identifies relevant snapshots. Input the snapshotId from search results metadata.",
          inputSchema: z.object({
            snapshotId: z
              .string()
              .describe("The snapshot ID to retrieve the full content for"),
          }),
          execute: async ({ snapshotId }) => {
            const snapshotUrl = `${request.headers.get("origin")}/api/snapshots/${snapshotId}`;

            const response = await fetch(snapshotUrl);

            if (!response.ok) {
              throw new Error(
                `Failed to fetch snapshot: ${response.statusText}`,
              );
            }

            const content = await response.text();

            return {
              snapshotId,
              content,
              contentLength: content.length,
            };
          },
        }),
      },
      stopWhen: stepCountIs(15), // Stop after maximum 10 steps
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
