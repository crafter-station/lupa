import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { initializeDefaultParsers, parseDocument } from "@/lib/parsers";

export const parseFileTask = schemaTask({
  id: "parse-file",
  schema: z.object({
    blobUrl: z.string(),
    filename: z.string(),
    mimeType: z.string().optional(),
    parsingInstruction: z.string().optional(),
    parserName: z.string().optional(),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async (payload) => {
    initializeDefaultParsers();

    const result = await parseDocument({
      document: {
        id: "temp-doc-id",
        blobUrl: payload.blobUrl,
        filename: payload.filename,
        mimeType: payload.mimeType,
      },
      userId: "temp-user-id",
      parsingInstruction: payload.parsingInstruction,
      parserName: payload.parserName,
    });

    return {
      markdown: result.markdownContent,
      metadata: result.metadata,
      parser: result.parser,
      processingTime: result.processingTime,
      jobId: result.jobId,
    };
  },
});
