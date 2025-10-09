import { logger } from "@trigger.dev/sdk/v3";
import {
  getDefaultParsingInstruction,
  getMimeTypeFromFilename,
} from "../file-types";
import type {
  DocumentParser,
  ParseDocumentInput,
  ParseDocumentOutput,
  SupportedFileType,
} from "../types";

const LLAMAPARSE_SUPPORTED_TYPES: SupportedFileType[] = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/html",
];

interface LlamaParseUploadResponse {
  id: string;
  status: string;
}

interface LlamaParseStatusResponse {
  status: "PENDING" | "SUCCESS" | "ERROR";
  error?: string;
}

export class LlamaParseDocumentParser implements DocumentParser {
  readonly name = "llamaparse";
  readonly supportedTypes = LLAMAPARSE_SUPPORTED_TYPES;

  private readonly apiKey: string;
  private readonly baseUrl = "https://api.cloud.llamaindex.ai/api/parsing";
  private readonly maxPollingAttempts = 30;
  private readonly pollingIntervalMs = 2000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LLAMA_CLOUD_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("LLAMA_CLOUD_API_KEY is required for LlamaParse");
    }
  }

  canParse(mimeType: string, filename: string): boolean {
    const detectedMimeType = mimeType || getMimeTypeFromFilename(filename);
    if (!detectedMimeType) return false;
    return this.supportedTypes.includes(detectedMimeType as SupportedFileType);
  }

  async parse(input: ParseDocumentInput): Promise<ParseDocumentOutput> {
    const { document, userId, parsingInstruction } = input;

    logger.log("Starting document parsing with LlamaParse", {
      documentId: document.id,
      filename: document.filename,
      mimeType: document.mimeType,
      userId,
    });

    const response = await fetch(document.blobUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch document: ${response.status} ${response.statusText}`,
      );
    }

    const documentBuffer = await response.arrayBuffer();
    const mimeType =
      document.mimeType || getMimeTypeFromFilename(document.filename);

    if (!mimeType) {
      throw new Error(
        `Unable to determine MIME type for file: ${document.filename}`,
      );
    }

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([documentBuffer], { type: mimeType }),
      document.filename,
    );

    const instruction =
      parsingInstruction ||
      getDefaultParsingInstruction(mimeType as SupportedFileType);
    formData.append("parsing_instruction", instruction);

    const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `LlamaParse upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`,
      );
    }

    const uploadResult: LlamaParseUploadResponse = await uploadResponse.json();
    const jobId = uploadResult.id;

    logger.log("Document uploaded to LlamaParse", {
      documentId: document.id,
      jobId,
    });

    const markdownContent = await this.pollForResult(jobId, document.id);
    const processingTime = this.maxPollingAttempts * this.pollingIntervalMs;

    logger.log("Document parsed successfully with LlamaParse", {
      documentId: document.id,
      jobId,
      markdownLength: markdownContent.length,
      userId,
    });

    return {
      markdownContent,
      parser: this.name,
      jobId,
      processingTime,
      metadata: {
        wordCount: markdownContent.split(/\s+/).length,
      },
    };
  }

  private async pollForResult(
    jobId: string,
    documentId: string,
  ): Promise<string> {
    let attempts = 0;

    while (attempts < this.maxPollingAttempts) {
      const statusResponse = await fetch(`${this.baseUrl}/job/${jobId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(
          `LlamaParse status check failed: ${statusResponse.status} ${statusResponse.statusText}`,
        );
      }

      const statusResult: LlamaParseStatusResponse =
        await statusResponse.json();

      if (statusResult.status === "SUCCESS") {
        return await this.getMarkdownResult(jobId);
      }

      if (statusResult.status === "ERROR") {
        throw new Error(
          `LlamaParse processing failed: ${statusResult.error || "Unknown error"}`,
        );
      }

      attempts++;
      logger.log("Polling LlamaParse job", {
        documentId,
        jobId,
        attempt: attempts,
        status: statusResult.status,
      });

      await new Promise((resolve) =>
        setTimeout(resolve, this.pollingIntervalMs),
      );
    }

    throw new Error(
      `Failed to get parse result after ${this.maxPollingAttempts} attempts`,
    );
  }

  private async getMarkdownResult(jobId: string): Promise<string> {
    const resultResponse = await fetch(
      `${this.baseUrl}/job/${jobId}/result/markdown`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (!resultResponse.ok) {
      throw new Error(
        `Failed to get markdown result: ${resultResponse.status} ${resultResponse.statusText}`,
      );
    }

    const result = await resultResponse.json();

    // LlamaParse returns { markdown: "...", job_metadata: {...} }
    if (typeof result === "object" && result.markdown) {
      return result.markdown;
    }

    // Fallback: if it's a string response, return as-is
    if (typeof result === "string") {
      return result;
    }

    throw new Error("Unexpected response format from LlamaParse");
  }
}

export function createLlamaParseParser(apiKey?: string): DocumentParser {
  return new LlamaParseDocumentParser(apiKey);
}
