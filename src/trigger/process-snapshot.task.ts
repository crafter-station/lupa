import { queue, schemaTask } from "@trigger.dev/sdk";
import { put } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";
import { encoding_for_model } from "tiktoken";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { extractMetadata } from "@/lib/metadata";
import { enhanceMdTask } from "./enhance-md";
import { parseFileTask } from "./parsers/file";
import { parseWebsiteTask } from "./parsers/website";

export const processSnapshotTask = schemaTask({
  id: "process-snapshot",
  schema: z.object({
    snapshotId: z.string(),
    parsingInstruction: z.string().optional(),
    parserName: z.string().optional(),
  }),
  run: async ({ snapshotId, parsingInstruction, parserName }, { ctx }) => {
    const snapshots = await db
      .select()
      .from(schema.Snapshot)
      .where(eq(schema.Snapshot.id, snapshotId))
      .limit(1);

    if (!snapshots.length) {
      throw new Error(`Snapshot with id ${snapshotId} not found`);
    }

    const snapshot = snapshots[0];

    await db
      .update(schema.Snapshot)
      .set({
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Snapshot.id, snapshotId));

    let markdown: string;

    if (snapshot.type === "website") {
      const doc = await parseWebsiteTask.triggerAndWait(
        { url: snapshot.url, enhance: snapshot.enhance },
        {
          queue: ctx.queue.name.startsWith("parsing-queue")
            ? `website-${ctx.queue.name}`
            : undefined,
        },
      );

      if (!doc.ok) {
        throw new Error(`Failed to parse website at ${snapshot.url}`);
      }

      if (!doc.output.markdown) {
        throw new Error("Markdown content is missing");
      }

      if (snapshot.enhance && doc.output.rawText) {
        const enhancedDoc = await enhanceMdTask.triggerAndWait({
          rawText: doc.output.rawText,
          markdown: doc.output.markdown,
        });

        if (!enhancedDoc.ok) {
          throw new Error(`Failed to enhance markdown`);
        }

        markdown = enhancedDoc.output;
      } else {
        markdown = doc.output.markdown;
      }
    } else if (snapshot.type === "upload") {
      const filename = snapshot.url.split("/").pop() || "file";

      const result = await parseFileTask.triggerAndWait({
        blobUrl: snapshot.url,
        filename,
        parsingInstruction,
        parserName,
      });

      if (!result.ok) {
        throw new Error(`Failed to parse file at ${snapshot.url}`);
      }

      if (!result.output.markdown) {
        throw new Error("Markdown content is missing");
      }

      markdown = result.output.markdown;
    } else {
      throw new Error(`Unknown snapshot type: ${snapshot.type}`);
    }

    const { url } = await put(`parsed/${snapshot.id}.md`, markdown, {
      access: "public",
      allowOverwrite: true,
    });

    const documents = await db
      .select()
      .from(schema.Document)
      .where(eq(schema.Document.id, snapshot.document_id))
      .limit(1);

    const document = documents[0];

    const previousSnapshots = await db
      .select()
      .from(schema.Snapshot)
      .where(eq(schema.Snapshot.document_id, snapshot.document_id))
      .orderBy(desc(schema.Snapshot.created_at))
      .limit(2);

    let previous: schema.SnapshotSelect | undefined;

    let hasChanged = true;
    if (previousSnapshots.length === 2) {
      previous = previousSnapshots[1];
      if (previous.markdown_url) {
        try {
          const previousMarkdownResponse = await fetch(previous.markdown_url);
          const previousMarkdown = await previousMarkdownResponse.text();
          hasChanged = previousMarkdown !== markdown;
        } catch (error) {
          console.error("Failed to fetch previous markdown:", error);
        }
      }
    }

    let metadata: Record<string, unknown> | undefined;
    if (previous?.metadata && Object.keys(previous.metadata).length > 0) {
      metadata = previous.metadata;
    } else {
      metadata = await extractMetadata(markdown, document.metadata_schema);
    }

    const enc = encoding_for_model("gpt-4o");
    const tokens = enc.encode(markdown);
    const tokensCount = tokens.length;
    enc.free();

    await db
      .update(schema.Snapshot)
      .set({
        status: "success",
        markdown_url: url,
        metadata,
        changes_detected: hasChanged,
        tokens_count: tokensCount,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Snapshot.id, snapshotId));
  },
});

export const parsingQueue1 = queue({
  name: "parsing-queue-1",
  concurrencyLimit: 1,
});

export const parsingQueue2 = queue({
  name: "parsing-queue-2",
  concurrencyLimit: 1,
});

export const parsingQueue3 = queue({
  name: "parsing-queue-3",
  concurrencyLimit: 1,
});

export const parsingQueue4 = queue({
  name: "parsing-queue-4",
  concurrencyLimit: 1,
});

export const parsingQueue5 = queue({
  name: "parsing-queue-5",
  concurrencyLimit: 1,
});

export const parsingQueue6 = queue({
  name: "parsing-queue-6",
  concurrencyLimit: 1,
});

export const parsingQueue7 = queue({
  name: "parsing-queue-7",
  concurrencyLimit: 1,
});
