import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { put } from "@vercel/blob";

export const storeMarkdownBlobTask = schemaTask({
  id: "ingestion.store-markdown-blob",
  schema: z.object({
    document: z.object({
      id: z.string(),
      filename: z.string(),
    }),
    markdownContent: z.string(),
    userId: z.string(),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async ({ document, markdownContent, userId }) => {
    logger.log("Storing markdown in blob storage", {
      documentId: document.id,
      markdownLength: markdownContent.length,
      userId: userId,
    });

    const markdownBuffer = Buffer.from(markdownContent, "utf-8");
    const blobPath = `${userId}/markdown/${document.id}.md`;

    const blob = await put(blobPath, markdownBuffer, {
      access: "public",
      contentType: "text/markdown",
      addRandomSuffix: true,
    });

    logger.log("Markdown stored successfully", {
      documentId: document.id,
      blobUrl: blob.url,
      userId: userId,
    });

    return {
      blobUrl: blob.url,
      pathname: blob.pathname,
      size: markdownBuffer.length,
      contentType: "text/markdown",
    };
  },
}); 