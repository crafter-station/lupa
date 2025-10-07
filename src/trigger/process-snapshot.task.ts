import { schemaTask } from "@trigger.dev/sdk";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { firecrawl } from "@/lib/firecrawl";
import { extractMetadata } from "@/lib/metadata";

// TODO: handle errors
export const processSnapshotTask = schemaTask({
  id: "process-snapshot",
  schema: z.object({
    snapshotId: z.string(),
  }),
  run: async ({ snapshotId }) => {
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

    const doc = await firecrawl.scrape(snapshot.url, {
      formats: [
        "markdown",
        {
          type: "screenshot",
          fullPage: true,
        },
      ],
    });

    if (!doc.markdown) {
      throw new Error("Markdown content is missing");
    }

    const { url } = await put(`parsed/${snapshot.id}.md`, doc.markdown, {
      access: "public",
    });

    const documents = await db
      .select()
      .from(schema.Document)
      .where(eq(schema.Document.id, snapshot.document_id))
      .limit(1);

    const document = documents[0];

    const extractedMetadata = document?.metadata_schema
      ? await extractMetadata(doc.markdown, document.metadata_schema)
      : {};

    await db
      .update(schema.Snapshot)
      .set({
        status: "success",
        markdown_url: url,
        metadata: {
          title: doc.metadata?.title,
          favicon: doc.metadata?.favicon as string | undefined,
          screenshot: doc.screenshot,
        },
        extracted_metadata: extractedMetadata,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Snapshot.id, snapshotId));
  },
});
