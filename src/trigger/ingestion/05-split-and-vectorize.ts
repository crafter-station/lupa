import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { Index } from "@upstash/vector";

const vectorChunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.any()),
});

export const splitAndVectorizeTask = schemaTask({
  id: "ingestion.split-and-vectorize",
  schema: z.object({
    document: z.object({
      id: z.string(),
      filename: z.string(),
    }),
    contentId: z.string(),
    markdownContent: z.string(),
    layoutElements: z.array(z.object({
      type: z.enum(["header", "paragraph", "table", "list", "image", "footer"]),
      content: z.string(),
      boundingBox: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        page: z.number(),
      }),
      metadata: z.record(z.string(), z.any()).optional(),
    })).default([]),
    userId: z.string(),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async ({ document, contentId, markdownContent, layoutElements, userId }) => {
    logger.log("Splitting content and creating sparse vector embeddings", {
      documentId: document.id,
      contentId: contentId,
      markdownLength: markdownContent.length,
      layoutElementsCount: layoutElements.length,
      userId: userId,
    });

    const index = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });

    const chunks = [];
    const chunkSize = 1000;
    const chunkOverlap = 200;

    for (let i = 0; i < markdownContent.length; i += chunkSize - chunkOverlap) {
      const chunk = markdownContent.slice(i, i + chunkSize);
      const chunkId = `${document.id}_chunk_${Math.floor(i / (chunkSize - chunkOverlap))}`;
      
      const relatedLayoutElements = layoutElements.filter(element => {
        const elementText = element.content.toLowerCase();
        const chunkText = chunk.toLowerCase();
        return elementText.length > 0 && chunkText.includes(elementText.substring(0, Math.min(50, elementText.length)));
      });

      chunks.push({
        id: chunkId,
        content: chunk,
        metadata: {
          documentId: document.id,
          contentId: contentId,
          filename: document.filename,
          userId: userId,
          chunkIndex: Math.floor(i / (chunkSize - chunkOverlap)),
          chunkSize: chunk.length,
          layoutElements: relatedLayoutElements,
          createdAt: new Date().toISOString(),
        },
      });
    }

    const vectorData = [];
    for (const chunk of chunks) {
      vectorData.push({
        id: chunk.id,
        data: chunk.content,
        metadata: chunk.metadata,
      });
    }

    const batchSize = 100;
    let uploadedCount = 0;
    
    for (let i = 0; i < vectorData.length; i += batchSize) {
      const batch = vectorData.slice(i, i + batchSize);
      await index.upsert(batch);
      uploadedCount += batch.length;
    }

    logger.log("Content vectorized and uploaded successfully", {
      documentId: document.id,
      contentId: contentId,
      totalChunks: chunks.length,
      uploadedVectors: uploadedCount,
      userId: userId,
    });

    return {
      totalChunks: chunks.length,
      uploadedVectors: uploadedCount,
      vectorIds: vectorData.map(v => v.id),
      chunkSizes: chunks.map(c => c.content.length),
    };
  },
}); 