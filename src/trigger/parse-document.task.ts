import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { extractMetadata } from "@/lib/metadata";
import { initializeDefaultParsers, parseDocument } from "@/lib/parsers";

export const parseDocumentTask = schemaTask({
  id: "ingestion.parse-document",
  schema: z.object({
    document: z.object({
      id: z.string(),
      blobUrl: z.string(),
      filename: z.string(),
      mimeType: z.string().optional(),
    }),
    userId: z.string(),
    parsingInstruction: z.string().optional(),
    parserName: z.string().optional(),
    snapshotId: z.string().optional(),
  }),
  retry: {
    maxAttempts: 3,
  },
  run: async (payload) => {
    logger.log("Starting document parsing", {
      documentId: payload.document.id,
      filename: payload.document.filename,
      mimeType: payload.document.mimeType,
      userId: payload.userId,
      parserName: payload.parserName || "auto-detect",
    });

    if (payload.snapshotId) {
      await db
        .update(schema.Snapshot)
        .set({
          status: "running",
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Snapshot.id, payload.snapshotId));
    }

    try {
      initializeDefaultParsers();

      const result = await parseDocument({
        document: payload.document,
        userId: payload.userId,
        parsingInstruction: payload.parsingInstruction,
        parserName: payload.parserName,
      });

      logger.log("Document parsing completed", {
        documentId: payload.document.id,
        parser: result.parser,
        markdownLength: result.markdownContent.length,
        processingTime: result.processingTime,
        jobId: result.jobId,
      });

      if (payload.snapshotId) {
        const { url: markdownUrl } = await put(
          `parsed/${payload.snapshotId}.md`,
          result.markdownContent,
          {
            access: "public",
          },
        );

        const documents = await db
          .select()
          .from(schema.Document)
          .where(eq(schema.Document.id, payload.document.id))
          .limit(1);

        const document = documents[0];

        const extractedMetadata = document?.metadata_schema
          ? await extractMetadata(
              result.markdownContent,
              document.metadata_schema,
            )
          : {};

        await db
          .update(schema.Snapshot)
          .set({
            status: "success",
            markdown_url: markdownUrl,
            metadata: {
              file_name: payload.document.filename,
              file_size: result.metadata?.wordCount
                ? result.metadata.wordCount * 6
                : undefined,
            } as schema.UploadMetadata,
            extracted_metadata: extractedMetadata,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Snapshot.id, payload.snapshotId));

        logger.log("Snapshot updated", {
          snapshotId: payload.snapshotId,
          markdownUrl,
        });
      }

      return result;
    } catch (error) {
      logger.error("Document parsing failed", {
        documentId: payload.document.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (payload.snapshotId) {
        await db
          .update(schema.Snapshot)
          .set({
            status: "error",
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Snapshot.id, payload.snapshotId));
      }

      throw error;
    }
  },
});
