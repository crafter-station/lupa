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

export const CreateChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().describe("Unique ID of the message"),
        role: z
          .enum(["user", "assistant", "system"])
          .describe("Role of the message sender"),
        content: z.string().describe("Text content of the message"),
      }),
    )
    .describe("Conversation messages including user and assistant turns"),
  model: z
    .string()
    .default("gpt-5")
    .describe("Model name to use for the chat (e.g., gpt-5)"),
});

export const ErrorResponseSchema = z.object({
  error: z.string().describe("Error message"),
});

/**
 * Create a chat session using an OpenAI model with integrated knowledge search.
 * @description Creates a conversational session with an AI model (`gpt-5` by default) that can query a knowledge base for contextual information using the `search-knowledge` tool.
 * @param projectId Path parameter representing the project ID.
 * @param deploymentId Path parameter representing the deployment ID.
 * @body CreateChatRequestSchema
 * @response 200 application/stream+json:Stream of chat responses in UIMessage format
 * @response 500:ErrorResponseSchema:Internal server error
 * @openapi
 */
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
      system:
        "You are a helpful assistant with access to a knowledge base through the search-knowledge tool. When users ask questions, search the knowledge base first to provide accurate, context-aware answers based on the available documents.",
      tools: {
        "search-knowledge": tool({
          description:
            "Search the knowledge base for relevant information. Use this tool whenever you need to find specific information or answer questions based on the indexed documents.",
          inputSchema: z.object({
            query: z
              .string()
              .describe("The search query to find relevant information"),
          }),
          execute: async ({ query }) => {
            const searchUrl = `${request.headers.get("origin")}/api/search?projectId=${projectId}&deploymentId=${deploymentId}&query=${encodeURIComponent(query)}`;

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
                    snapshotId: result.metadata.snapshotId,
                    documentId: result.metadata.documentId,
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
