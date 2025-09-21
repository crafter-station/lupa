import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

export const validateDocumentTask = schemaTask({
  id: "ingestion.validate-document",
  schema: z.object({
    document: z.object({
      id: z.string(),
      url: z.string(),
      filename: z.string(),
    }),
    userId: z.string(),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async ({ document, userId }) => {
    logger.log("Validating uploaded document (pass-through)", {
      documentId: document.id,
      filename: document.filename,
      userId: userId,
    });

    const response = await fetch(document.url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch document from URL: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type");
    const fileExtension = document.filename.split('.').pop()?.toLowerCase();
    
    let documentType: "pdf" | "docx" | "txt" | "other" = "other";
    
    if (contentType?.includes("pdf") || fileExtension === "pdf") {
      documentType = "pdf";
    } else if (contentType?.includes("wordprocessingml") || fileExtension === "docx") {
      documentType = "docx";
    } else if (contentType?.includes("text") || fileExtension === "txt") {
      documentType = "txt";
    }

    logger.log("Document validation completed (pass-through)", {
      documentId: document.id,
      documentType: documentType,
      contentType: contentType,
      fileExtension: fileExtension,
    });

    return {
      isValid: true,
      documentType: documentType,
      confidence: 1.0,
      reason: "Validation bypassed - all documents accepted",
    };
  },
}); 