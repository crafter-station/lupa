import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DocumentViewerClient } from "./client";
import type { ServerProps } from "./props";

export const DocumentViewerServer = async ({
  projectId,
  folder,
  documentName,
}: ServerProps) => {
  let document = null;
  let latestSnapshot = null;

  if (documentName) {
    const [foundDocument] = await db
      .select()
      .from(schema.Document)
      .where(
        and(
          eq(schema.Document.project_id, projectId),
          eq(schema.Document.folder, folder),
          eq(schema.Document.name, documentName),
        ),
      )
      .limit(1);

    document = foundDocument || null;

    if (document) {
      const snapshots = await db
        .select()
        .from(schema.Snapshot)
        .where(eq(schema.Snapshot.document_id, document.id))
        .orderBy(desc(schema.Snapshot.created_at))
        .limit(1);

      latestSnapshot = snapshots[0] || null;
    }
  }

  return (
    <DocumentViewerClient
      projectId={projectId}
      folder={folder}
      documentName={documentName}
      preloadedDocument={document}
      preloadedLatestSnapshot={latestSnapshot}
    />
  );
};
