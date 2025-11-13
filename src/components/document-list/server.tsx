import { and, eq, like } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DocumentListClient } from "./client";
import { getItems } from "./get-items";
import type { ServerProps } from "./props";

export const DocumentListServer = async ({
  projectId,
  folder,
  orgSlug,
}: ServerProps) => {
  "use cache";
  cacheLife("hours");
  cacheTag(`docs-${projectId}`);

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
    orgSlug,
  });

  return (
    <DocumentListClient
      preloadedItems={items}
      folder={folder}
      projectId={projectId}
      orgSlug={orgSlug}
    />
  );
};
