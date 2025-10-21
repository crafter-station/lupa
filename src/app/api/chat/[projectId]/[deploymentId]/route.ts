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
    const {
      messages,
      model,
      documentIds,
      metadataFilters,
      contextFileNames,
    }: {
      messages: UIMessage[];
      model: string;
      documentIds?: string[];
      metadataFilters?: Array<{
        key: string;
        operator: string;
        value: string | number | boolean;
      }>;
      contextFileNames?: string[];
    } = await request.json();

    let systemPrompt =
      "You are a helpful assistant with access to a knowledge base through the search-knowledge tool. When users ask questions, search the knowledge base first to provide accurate, context-aware answers based on the available documents.";

    if (contextFileNames && contextFileNames.length > 0) {
      systemPrompt += `\n\n[CONTEXT]: The user has selected specific files: ${contextFileNames.join(", ")}. When they ask about "this document", "these files", or use similar references, they are referring to these specific files. Always use the search-knowledge tool to find information from these documents when answering questions about them.`;
    }

    if (metadataFilters && metadataFilters.length > 0) {
      const filterDesc = metadataFilters
        .map((f) => `${f.key} ${f.operator} ${f.value}`)
        .join(", ");
      systemPrompt += `\n\n[FILTERS]: Apply these metadata filters when searching: ${filterDesc}`;
    }

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
      system: systemPrompt,
      tools: {
        "search-knowledge": tool({
          description:
            "Search the knowledge base for relevant information. Use this tool whenever you need to find specific information or answer questions based on the indexed documents. The search can be filtered by document IDs if context filters are active.",
          inputSchema: z.object({
            query: z
              .string()
              .describe("The search query to find relevant information"),
          }),
          execute: async ({ query }) => {
            const params = new URLSearchParams({
              query: encodeURIComponent(query),
            });

            if (documentIds && documentIds.length > 0) {
              params.set("documentIds", documentIds.join(","));
            }

            if (metadataFilters && metadataFilters.length > 0) {
              for (const filter of metadataFilters) {
                const value = `${filter.operator}${filter.value}`;
                params.set(`metadata.${filter.key}`, value);
              }
            }

            const searchUrl = `${request.headers.get("origin")}/api/search/${projectId}/${deploymentId}?${params.toString()}`;

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
                    documentName?: string;
                    documentPath?: string;
                    fileName?: string;
                    chunkIndex: number;
                  };
                }) => ({
                  id: result.id,
                  score: result.score,
                  content: result.data,
                  metadata: {
                    snapshotId: result.metadata.snapshotId,
                    documentId: result.metadata.documentId,
                    documentName: result.metadata.documentName,
                    documentPath: result.metadata.documentPath,
                    fileName: result.metadata.fileName,
                    chunkIndex: result.metadata.chunkIndex,
                  },
                }),
              ),
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
