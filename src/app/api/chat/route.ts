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
import { GET_FILE_TREE_PROMPT } from "@/lib/prompts/get-file-tree.prompt";
import { SEARCH_KNOWLEDGE_PROMPT } from "@/lib/prompts/search-knowledge.prompt";
import { SYSTEM_PROMPT } from "@/lib/prompts/system.prompt";
import { getAPIBaseURL } from "@/lib/utils";

export const preferredRegion = ["iad1", "gru1"];
export const maxDuration = 120;

async function fetchFileContent(
  projectId: string,
  deploymentId: string,
  filePath: string,
): Promise<string> {
  const internalToken = generateInternalToken(projectId);
  const catUrl = `${getAPIBaseURL(projectId)}/cat/?path=${encodeURIComponent(filePath)}`;

  const response = await fetch(catUrl, {
    headers: {
      "Deployment-Id": deploymentId,
      "X-Internal-Token": internalToken,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch file ${filePath}: ${response.statusText}`);
  }

  return await response.text();
}

export async function POST(request: Request) {
  try {
    const {
      projectId,
      deploymentId: requestDeploymentId,
      messages,
      model,
      reasoningEffort,
      reasoningSummary,
    }: {
      projectId: string;
      deploymentId?: string | null;
      messages: UIMessage[];
      model: string;
      reasoningEffort?: "minimal" | "low" | "medium" | "high";
      reasoningSummary?: "auto" | "detailed";
    } = await request.json();

    const [project] = await db
      .select({
        name: schema.Project.name,
        description: schema.Project.description,
        productionDeploymentId: schema.Project.production_deployment_id,
      })
      .from(schema.Project)
      .where(eq(schema.Project.id, projectId));

    if (!project) {
      throw new Error(`Project not found for id ${projectId}`);
    }

    let deploymentId = requestDeploymentId;

    if (project.productionDeploymentId) {
      deploymentId = project.productionDeploymentId;
    } else {
      throw new Error(
        "Project doesnt have a production deployment. You must specify a deployment id.",
      );
    }

    const fileMentionRegex = /@(\/[\w\-/.]+)/g;
    const processedMessages = await Promise.all(
      messages.map(async (message) => {
        if (message.role !== "user") {
          return message;
        }

        const textPart = message.parts.find((part) => part.type === "text");
        if (!textPart || textPart.type !== "text") {
          return message;
        }

        const mentions = [...textPart.text.matchAll(fileMentionRegex)];
        if (mentions.length === 0) {
          return message;
        }

        const fileContents = await Promise.all(
          mentions.map(async (match) => {
            const filePath = match[1];
            try {
              const content = await fetchFileContent(
                projectId,
                deploymentId,
                filePath,
              );
              return `\n\n[File: ${filePath}]\n${content}`;
            } catch (error) {
              console.error(`Error fetching file ${filePath}:`, error);
              return `\n\n[File: ${filePath}]\n[Error: Could not fetch file content]`;
            }
          }),
        );

        return {
          ...message,
          parts: message.parts.map((part) =>
            part.type === "text"
              ? { ...part, text: part.text + fileContents.join("") }
              : part,
          ),
        };
      }),
    );

    const searchKnowledgePrompt = SEARCH_KNOWLEDGE_PROMPT(project);
    const getDocumentContentsPrompt = GET_DOCUMENT_CONTENTS_PROMPT(project);
    const getFileTreePrompt = GET_FILE_TREE_PROMPT(project);

    const systemPrompt = SYSTEM_PROMPT(project);

    const result = streamText({
      model: openai.responses(model || "gpt-5"),
      providerOptions: {
        openai: {
          reasoningEffort: reasoningEffort || "medium",
          reasoningSummary: reasoningSummary || "detailed",
          include: ["reasoning.encrypted_content"],
        } satisfies OpenAIResponsesProviderOptions,
      },
      messages: convertToModelMessages(processedMessages),
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
            const snapshotUrl = `${getAPIBaseURL(projectId)}/cat/?path=${encodeURIComponent(path)}`;

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

            return content;
          },
        }),
        "get-file-tree": tool({
          description: getFileTreePrompt,
          inputSchema: z.object({
            folder: z
              .string()
              .describe(
                "The path of the document to retrieve the full content for. All folders must start and end with /. No special characters are allowed, just letters, numbers and '-','_'. The path must be absolute. Example: /folder1/folder2/, /, /path-to/folder/ ",
              ),
            depth: z
              .number()
              .min(0)
              .describe(
                "The depth of the file tree to retrieve. 0 will return all files and folders, until the maximum depth is reached. If depth is greater than 0, only files and folders within the specified depth will be returned. For example, if depth 1 will return only the files and folders in the current directory.",
              ),
          }),
          execute: async ({ folder, depth }) => {
            const snapshotUrl = `${getAPIBaseURL(projectId)}/tree/?folder=${encodeURIComponent(folder)}&depth=${encodeURIComponent(depth)}`;

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

            const content = await response.json();

            return content;
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
