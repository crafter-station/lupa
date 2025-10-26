// mcp server
// users will hit https://<projectId>.lupa.build/api/mcp

import { eq, sql } from "drizzle-orm";
import { createMcpHandler } from "mcp-handler";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { GET_DOCUMENT_CONTENTS_PROMPT } from "@/lib/prompts/get-document-contents.prompt";
import { SEARCH_KNOWLEDGE_PROMPT } from "@/lib/prompts/search-knowledge.prompt";
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
  const { projectId, deploymentId, transport } = await params;

  const [project] = await db
    .select({
      name: schema.Project.name,
      description: schema.Project.description,
    })
    .from(schema.Project)
    .where(eq(schema.Project.id, projectId))
    .limit(1);

  console.log(project);

  if (!project) {
    throw new Error(`Project not found for id ${projectId}`);
  }

  const searchKnowledgePrompt = SEARCH_KNOWLEDGE_PROMPT(project);
  const getDocumentContentsPrompt = GET_DOCUMENT_CONTENTS_PROMPT(project);

  console.log({
    projectId,
    deploymentId,
    transport,
    redis: process.env.REDIS_URL,
  });

  return createMcpHandler(
    (server) => {
      console.log("Server initialized");

      server.tool(
        "search-knowledge",
        searchKnowledgePrompt,
        {
          query: z
            .string()
            .describe("The search query to find relevant information"),
        },
        async ({ query }) => {
          let response: Response;
          console.log("calling search api");

          response = await fetch(
            `${getAPIBaseURL(projectId)}/search/?query=${encodeURIComponent(query)}`,
            {
              headers: {
                "Deployment-Id": deploymentId,
                Authorization: req.headers.get("Authorization")!,
              },
            },
          );

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
          let response: Response;

          response = await fetch(
            `${getAPIBaseURL(projectId)}/cat/?path=${encodeURIComponent(path)}`,
            {
              headers: {
                "Deployment-Id": deploymentId,
                Authorization: req.headers.get("Authorization")!,
              },
            },
          );

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
      basePath: "/api",
      maxDuration: 60,
      verboseLogs: true,
    },
  )(req);
};
export { handler as GET, handler as POST, handler as DELETE };
