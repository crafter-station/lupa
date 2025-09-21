import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { put } from "@vercel/blob";

export const storeDocumentBlobTask = schemaTask({
  id: "ingestion.store-document-blob",
  schema: z.object({
    document: z.object({
      id: z.string(),
      url: z.string(),
      filename: z.string(),
    }),
    userId: z.string(),
    documentType: z.enum(["pdf", "docx", "txt", "other"]),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async ({ document, userId, documentType }) => {
    logger.log("Storing document in blob storage", {
      documentId: document.id,
      filename: document.filename,
      userId: userId,
      documentType: documentType,
    });

    const response = await fetch(document.url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch document: ${response.status} ${response.statusText}`
      );
    }

    const documentBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    const fileExtension = document.filename.split('.').pop() || documentType;
    const blobPath = `${userId}/documents/${document.id}.${fileExtension}`;

    const blob = await put(blobPath, documentBuffer, {
      access: "public",
      contentType: contentType,
      addRandomSuffix: true,
    });

    logger.log("Document stored successfully", {
      documentId: document.id,
      blobUrl: blob.url,
      userId: userId,
    });

    return {
      blobUrl: blob.url,
      pathname: blob.pathname,
      size: documentBuffer.byteLength,
      contentType: contentType,
    };
  },
}); 