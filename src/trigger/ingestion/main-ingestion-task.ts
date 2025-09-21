import { schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { metadata } from "@trigger.dev/sdk/v3";
import { validateDocumentTask } from "./00-validate-document";
import { storeDocumentBlobTask } from "./01-store-document-blob";
import { parsePdfToMarkdownTask } from "./02-parse-pdf-to-markdown";
import { storeMarkdownBlobTask } from "./03-store-markdown-blob";
import { extractMetadataLayoutTask } from "./04-extract-metadata-layout";
import { splitAndVectorizeTask } from "./05-split-and-vectorize";

export const mainIngestionTask = schemaTask({
  id: "ingestion.main",
  schema: z.object({
    document: z.object({
      id: z.string(),
      url: z.string(),
      filename: z.string(),
    }),
    userId: z.string(),
  }),
  retry: {
    maxAttempts: 1,
  },
  run: async ({ document, userId }) => {
    try {
      metadata.set("status", "validating_document");
      const documentValidation = await tasks.triggerAndWait<typeof validateDocumentTask>(
        "ingestion.validate-document",
        {
          document: {
            id: document.id,
            url: document.url,
            filename: document.filename,
          },
          userId,
        },
        {
          tags: [userId, "ingestion"],
        }
      );
      if (!documentValidation.ok) {
        throw new Error(`Document validation failed: ${documentValidation.error}`);
      }

    metadata.set("status", "storing_document_blob");
    const documentBlob = await tasks.triggerAndWait<typeof storeDocumentBlobTask>(
      "ingestion.store-document-blob",
      {
        document: {
          id: document.id,
          url: document.url,
          filename: document.filename,
        },
        userId,
        documentType: documentValidation.output.documentType,
      },
      {
        tags: [userId, "ingestion"],
      }
    );
    if (!documentBlob.ok) {
      throw new Error(`Document storage failed: ${documentBlob.error}`);
    }

    if (documentValidation.output.documentType === "pdf") {
      metadata.set("status", "parsing_pdf_to_markdown");
      const markdownResult = await tasks.triggerAndWait<typeof parsePdfToMarkdownTask>(
        "ingestion.parse-pdf-to-markdown",
        {
          document: {
            id: document.id,
            blobUrl: documentBlob.output.blobUrl,
            filename: document.filename,
          },
          userId,
        },
        {
          tags: [userId, "ingestion"],
        }
      );
      if (!markdownResult.ok) {
        throw new Error(`PDF parsing failed: ${markdownResult.error}`);
      }

      metadata.set("status", "storing_markdown_blob");
      const markdownBlob = await tasks.triggerAndWait<typeof storeMarkdownBlobTask>(
        "ingestion.store-markdown-blob",
        {
          document: {
            id: document.id,
            filename: document.filename,
          },
          markdownContent: markdownResult.output.markdownContent,
          userId,
        },
        {
          tags: [userId, "ingestion"],
        }
      );
      if (!markdownBlob.ok) {
        throw new Error(`Markdown storage failed: ${markdownBlob.error}`);
      }

      metadata.set("status", "extracting_metadata_layout");
      const metadataLayout = await tasks.triggerAndWait<typeof extractMetadataLayoutTask>(
        "ingestion.extract-metadata-layout",
        {
          document: {
            id: document.id,
            blobUrl: documentBlob.output.blobUrl,
            filename: document.filename,
          },
          markdownContent: markdownResult.output.markdownContent,
          userId,
        },
        {
          tags: [userId, "ingestion"],
        }
      );
      if (!metadataLayout.ok) {
        throw new Error(`Metadata extraction failed: ${metadataLayout.error}`);
      }

      metadata.set("status", "splitting_and_vectorizing");
      const vectorization = await tasks.triggerAndWait<typeof splitAndVectorizeTask>(
        "ingestion.split-and-vectorize",
        {
          document: {
            id: document.id,
            filename: document.filename,
          },
          contentId: metadataLayout.output.contentId,
          markdownContent: markdownResult.output.markdownContent,
          layoutElements: metadataLayout.output.layoutElements,
          userId,
        },
        {
          tags: [userId, "ingestion"],
        }
      );
      if (!vectorization.ok) {
        throw new Error(`Vectorization failed: ${vectorization.error}`);
      }

      metadata.set("status", "completed");

      return {
        success: true,
        documentId: document.id,
        contentId: metadataLayout.output.contentId,
        documentBlobUrl: documentBlob.output.blobUrl,
        markdownBlobUrl: markdownBlob.output.blobUrl,
        totalChunks: vectorization.output.totalChunks,
        uploadedVectors: vectorization.output.uploadedVectors,
        processingSteps: 6,
      };
    } else {
      metadata.set("status", "processing_non_pdf");
      const response = await fetch(documentBlob.output.blobUrl);
      const textContent = await response.text();

      metadata.set("status", "extracting_metadata_layout");
      const metadataLayout = await tasks.triggerAndWait<typeof extractMetadataLayoutTask>(
        "ingestion.extract-metadata-layout",
        {
          document: {
            id: document.id,
            blobUrl: documentBlob.output.blobUrl,
            filename: document.filename,
          },
          markdownContent: textContent,
          userId,
        },
        {
          tags: [userId, "ingestion"],
        }
      );
      if (!metadataLayout.ok) {
        throw new Error(`Metadata extraction failed: ${metadataLayout.error}`);
      }

      metadata.set("status", "splitting_and_vectorizing");
      const vectorization = await tasks.triggerAndWait<typeof splitAndVectorizeTask>(
        "ingestion.split-and-vectorize",
        {
          document: {
            id: document.id,
            filename: document.filename,
          },
          contentId: metadataLayout.output.contentId,
          markdownContent: textContent,
          layoutElements: metadataLayout.output.layoutElements,
          userId,
        },
        {
          tags: [userId, "ingestion"],
        }
      );
      if (!vectorization.ok) {
        throw new Error(`Vectorization failed: ${vectorization.error}`);
      }

      metadata.set("status", "completed");

      return {
        success: true,
        documentId: document.id,
        contentId: metadataLayout.output.contentId,
        documentBlobUrl: documentBlob.output.blobUrl,
        markdownBlobUrl: null,
        totalChunks: vectorization.output.totalChunks,
        uploadedVectors: vectorization.output.uploadedVectors,
        processingSteps: 4,
      };
    }
    } catch (error) {
      console.error(`[INGESTION] Document ${document.id} processing failed:`, error);

      // Re-throw the error to let the trigger system handle it
      throw error;
    }
  },
}); 