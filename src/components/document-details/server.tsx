import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DocumentDetailsClient } from "./client";
import type { ServerProps } from "./props";

export const DocumentDetailsServer = async ({
  projectId,
  folder,
  documentName,
}: ServerProps) => {
  let document = null;

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
  }

  return (
    <DocumentDetailsClient
      projectId={projectId}
      folder={folder}
      documentName={documentName}
      preloadedDocument={document}
    />
  );
};
