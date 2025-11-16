import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { fetchMarkdown } from "@/hooks/use-markdown";
import { SnapshotDetailsContent } from "./content";
import type { ServerProps } from "./props";

export const SnapshotDetails = async ({ selectedDocument }: ServerProps) => {
  let latestSnapshot = null;
  let markdownContent = null;

  if (selectedDocument) {
    const snapshots = await db
      .select()
      .from(schema.Snapshot)
      .where(eq(schema.Snapshot.document_id, selectedDocument.id))
      .orderBy(desc(schema.Snapshot.created_at))
      .limit(1);

    latestSnapshot = snapshots[0] ?? null;

    if (latestSnapshot?.markdown_url) {
      try {
        markdownContent = await fetchMarkdown(latestSnapshot.markdown_url);
      } catch (error) {
        console.error("Failed to fetch markdown:", error);
        markdownContent = null;
      }
    }
  }

  return (
    <SnapshotDetailsContent
      selectedDocument={selectedDocument}
      latestSnapshot={latestSnapshot}
      markdownContent={markdownContent}
    />
  );
};
