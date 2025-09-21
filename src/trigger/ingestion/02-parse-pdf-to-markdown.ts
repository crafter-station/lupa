import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

export const parsePdfToMarkdownTask = schemaTask({
  id: "ingestion.parse-pdf-to-markdown",
  schema: z.object({
    document: z.object({
      id: z.string(),
      blobUrl: z.string(),
      filename: z.string(),
    }),
    userId: z.string(),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async ({ document, userId }) => {
    logger.log("Parsing PDF to markdown", {
      documentId: document.id,
      filename: document.filename,
      userId: userId,
    });

    const response = await fetch(document.blobUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch document: ${response.status} ${response.statusText}`
      );
    }

    const documentBuffer = await response.arrayBuffer();
    const formData = new FormData();
    formData.append("file", new Blob([documentBuffer], { type: "application/pdf" }), document.filename);
    formData.append("parsing_instruction", "Extract all text content while preserving structure and formatting. Include tables, headers, and maintain document hierarchy.");

    const llamaParseResponse = await fetch("https://api.cloud.llamaindex.ai/api/parsing/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
      },
      body: formData,
    });

    if (!llamaParseResponse.ok) {
      throw new Error(
        `LlamaParse API error: ${llamaParseResponse.status} ${llamaParseResponse.statusText}`
      );
    }

    const parseResult = await llamaParseResponse.json();
    const jobId = parseResult.id;

    let markdownContent = "";
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(
          `LlamaParse status check failed: ${statusResponse.status} ${statusResponse.statusText}`
        );
      }

      const statusResult = await statusResponse.json();

      if (statusResult.status === "SUCCESS") {
        const resultResponse = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
          headers: {
            "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
          },
        });

        if (!resultResponse.ok) {
          throw new Error(
            `Failed to get markdown result: ${resultResponse.status} ${resultResponse.statusText}`
          );
        }

        markdownContent = await resultResponse.text();
        break;
      } else if (statusResult.status === "ERROR") {
        throw new Error(`LlamaParse processing failed: ${statusResult.error || "Unknown error"}`);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!markdownContent) {
      throw new Error("Failed to get markdown content from LlamaParse after maximum attempts");
    }

    logger.log("PDF parsed to markdown successfully", {
      documentId: document.id,
      markdownLength: markdownContent.length,
      userId: userId,
    });

    return {
      markdownContent: markdownContent,
      jobId: jobId,
      processingTime: attempts * 2,
    };
  },
}); 