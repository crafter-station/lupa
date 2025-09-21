import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
// import { generateObject, openai } from "ai"; // Temporarily commented out due to import issues
import { randomUUID } from "crypto";

const boundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  page: z.number(),
});

const layoutElementSchema = z.object({
  type: z.enum(["header", "paragraph", "table", "list", "image", "footer"]),
  content: z.string(),
  boundingBox: boundingBoxSchema,
  metadata: z.record(z.string(), z.any()).optional(),
});

const documentMetadataSchema = z.object({
  title: z.string().nullable(),
  author: z.string().nullable(),
  subject: z.string().nullable(),
  keywords: z.array(z.string()).default([]),
  createdAt: z.string().nullable(),
  modifiedAt: z.string().nullable(),
  pageCount: z.number(),
  language: z.string().nullable(),
  layoutElements: z.array(layoutElementSchema).default([]),
});

export const extractMetadataLayoutTask = schemaTask({
  id: "ingestion.extract-metadata-layout",
  schema: z.object({
    document: z.object({
      id: z.string(),
      blobUrl: z.string(),
      filename: z.string(),
    }),
    markdownContent: z.string(),
    userId: z.string(),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async ({ document, markdownContent, userId }) => {
    logger.log("Extracting metadata and layout information", {
      documentId: document.id,
      markdownLength: markdownContent.length,
      userId: userId,
    });

    const response = await fetch(document.blobUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch document: ${response.status} ${response.statusText}`
      );
    }

    const documentBuffer = await response.arrayBuffer();

    // TODO: Re-enable AI metadata extraction when import issues are resolved
    // const { object } = await generateObject({
    //   model: openai("gpt-4o-mini"),
    //   schema: documentMetadataSchema,
    //   temperature: 0.1,
    //   messages: [...],
    // });

    // Generate a content ID for vectorization (used for Upstash metadata enrichment)
    const contentId = randomUUID();

    // Mock response for now - replace with actual AI extraction later
    const mockMetadata = {
      title: document.filename,
      author: null,
      subject: null,
      keywords: [],
      createdAt: null,
      modifiedAt: null,
      pageCount: 1,
      language: null,
      layoutElements: [],
    };

    logger.log("Metadata and layout extracted successfully (mock data)", {
      documentId: document.id,
      contentId: contentId,
      layoutElementsCount: mockMetadata.layoutElements.length,
      userId: userId,
    });

    return {
      contentId: contentId,
      title: mockMetadata.title,
      author: mockMetadata.author,
      subject: mockMetadata.subject,
      keywords: mockMetadata.keywords,
      pageCount: mockMetadata.pageCount,
      language: mockMetadata.language,
      layoutElements: mockMetadata.layoutElements,
    };
  },
}); 