import { type OpenAIResponsesProviderOptions, openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateInternalToken } from "@/lib/crypto/internal-token";
import { GET_DOCUMENT_CONTENTS_PROMPT } from "@/lib/prompts/get-document-contents.prompt";
import { SEARCH_KNOWLEDGE_PROMPT } from "@/lib/prompts/search-knowledge.prompt";
import { SYSTEM_PROMPT } from "@/lib/prompts/system.prompt";
import { getAPIBaseURL } from "@/lib/utils";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const {
      projectId,
      deploymentId,
      messages,
      model,
      documentIds,
      metadataFilters,
      contextFileNames,
    }: {
      projectId: string;
      deploymentId: string;
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

    const [project] = await db
      .select({
        name: schema.Project.name,
        description: schema.Project.description,
      })
      .from(schema.Project)
      .where(eq(schema.Project.id, projectId));

    if (!project) {
      throw new Error(`Project not found for id ${projectId}`);
    }

    const searchKnowledgePrompt = SEARCH_KNOWLEDGE_PROMPT(project);
    const getDocumentContentsPrompt = GET_DOCUMENT_CONTENTS_PROMPT(project);

    let systemPrompt = SYSTEM_PROMPT(project);

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
          description: searchKnowledgePrompt,
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

            const searchUrl = `${getAPIBaseURL(projectId)}/search/?${params.toString()}`;

            const internalToken = generateInternalToken(projectId);

            const response = await fetch(searchUrl, {
              headers: {
                "Deployment-Id": deploymentId,
                "X-Internal-Token": internalToken,
              },
            });

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
                    ...result.metadata,
                  },
                }),
              ),
            };
          },
        }),
        "get-document-contents": tool({
          description: getDocumentContentsPrompt,
          inputSchema: z.object({
            path: z
              .string()
              .describe(
                "The path of the document to retrieve the full content for",
              ),
          }),
          execute: async ({ path }) => {
            const snapshotUrl = `${getAPIBaseURL(projectId)}/cat/?${path}`;

            const internalToken = generateInternalToken(projectId);
            const response = await fetch(snapshotUrl, {
              headers: {
                "Deployment-Id": deploymentId,
                "X-Internal-Token": internalToken,
              },
            });

            if (!response.ok) {
              throw new Error(
                `Failed to fetch snapshot: ${response.statusText}`,
              );
            }

            const content = await response.text();

            return {
              path,
              content,
              contentLength: content.length,
            };
          },
        }),
      },
      stopWhen: stepCountIs(15),
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
