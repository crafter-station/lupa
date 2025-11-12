import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DocumentListClient } from "./client";
import { getItems } from "./get-items";
import type { ServerProps } from "./props";

export const DocumentListServer = async ({
  projectId,
  folder,
}: ServerProps) => {
  const documents = await db
    .select()
    .from(schema.Document)
    .where(
      and(
        eq(schema.Document.project_id, projectId),
        like(schema.Document.folder, `${folder}%`),
      ),
    );

  const items = getItems({
    folder,
    documents,
    projectId,
    orgSlug: "the-cave",
  });

  return (
    <DocumentListClient
      preloadedItems={items}
      folder={folder}
      projectId={projectId}
    />
  );
};
