import { schemaTask } from "@trigger.dev/sdk";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { firecrawl } from "@/lib/firecrawl";

// TODO: handle errors
export const processSnapshotTask = schemaTask({
  id: "process-snapshot",
  schema: z.object({
    snapshotId: z.string(),
  }),
  run: async ({ snapshotId }) => {
    const snapshots = await db
      .select()
      .from(schema.SourceSnapshot)
      .where(eq(schema.SourceSnapshot.id, snapshotId))
      .limit(1);

    if (!snapshots.length) {
      throw new Error(`Snapshot with id ${snapshotId} not found`);
    }

    const snapshot = snapshots[0];

    await db
      .update(schema.SourceSnapshot)
      .set({
        status: "running",
      })
      .where(eq(schema.SourceSnapshot.id, snapshotId));

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

    await db
      .update(schema.SourceSnapshot)
      .set({
        status: "success",
        markdown_url: url,
        metadata: {
          title: doc.metadata?.title,
          favicon: doc.metadata?.favicon as string | undefined,
          screenshot: doc.screenshot,
        },
      })
      .where(eq(schema.SourceSnapshot.id, snapshotId));
  },
});
