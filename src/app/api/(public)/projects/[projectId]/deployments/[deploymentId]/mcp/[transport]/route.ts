// mcp server
// users will hit https://<projectId>.lupa.build/api/mcp

import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { z } from "zod-v3";
import { redis } from "@/db/redis";
import { getAPIBaseURL } from "@/lib/utils";

const handler = async (
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      deploymentId: string;
      transport: string;
    }>;
  },
) => {
  const { projectId, deploymentId } = await params;

  const searchKnowledgePrompt = await redis.get<string>(
    `search-knowledge-prompt:${projectId}:${deploymentId}`,
  );

  if (!searchKnowledgePrompt) {
    throw new Error(
      `Search knowledge prompt not found for project ${projectId} and deployment ${deploymentId}`,
    );
  }

  const getDocumentContentsPrompt = await redis.get<string>(
    `get-document-contents-prompt:${projectId}:${deploymentId}`,
  );

  if (!getDocumentContentsPrompt) {
    throw new Error(
      `Get document contents prompt not found for project ${projectId} and deployment ${deploymentId}`,
    );
  }

  return createMcpHandler(
    (server) => {
      server.tool(
        "search-knowledge",
        searchKnowledgePrompt,
        {
          query: z
            .string()
            .describe("The search query to find relevant information"),
        },
        async ({ query }) => {
          const searchUrl = `${getAPIBaseURL(projectId)}/search/?query=${encodeURIComponent(query)}`;

          const response = await fetch(searchUrl, {
            headers: {
              Authorization: `Bearer ${process.env.LUPA_API_KEY}`,
              "Deployment-Id": deploymentId,
            },
          });

          if (!response.ok) {
            throw new Error(`Search failed: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
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
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        },
      );

      server.tool(
        "get-document-contents",
        getDocumentContentsPrompt,
        {
          path: z
            .string()
            .describe(
              "The path of the document to retrieve the full content for",
            ),
        },
        async ({ path }) => {
          const snapshotUrl = `${getAPIBaseURL(projectId)}/cat/?path=${path}`;

          const response = await fetch(snapshotUrl, {
            headers: {
              Authorization: `Bearer ${process.env.LUPA_API_KEY}`,
              "Deployment-Id": deploymentId,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
          }

          const content = await response.text();

          return {
            content: [
              {
                type: "text" as const,
                text: `# Document ${path}\n\nContent Length: ${content.length} characters\n\n${content}`,
              },
            ],
          };
        },
      );
    },
    {
      // Optional server options
    },
    {
      // Optional redis config
      redisUrl: process.env.REDIS_URL,
      basePath: `${getAPIBaseURL(projectId)}/`,
      maxDuration: 60,
      verboseLogs: true,
    },
  )(req);
};
export { handler as GET, handler as POST, handler as DELETE };
