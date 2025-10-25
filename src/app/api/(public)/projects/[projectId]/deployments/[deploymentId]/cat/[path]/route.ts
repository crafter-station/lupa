// cat /path/to/file.md
// display file contents

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      deploymentId: string;
      path: string;
    }>;
  },
) {
  try {
    const { projectId, deploymentId, path } = await params;

    const folder = `/${path.split("/").slice(0, -1).join("/")}`;
    const documentName = path.split("/").pop();

    if (!documentName) {
      return new Response("Invalid path", { status: 400 });
    }

    const [snapshot] = await db
      .select({
        snapshot_id: schema.Snapshot.id,
      })
      .from(schema.Document)
      .innerJoin(
        schema.Snapshot,
        eq(schema.Snapshot.document_id, schema.Document.id),
      )
      .innerJoin(
        schema.SnapshotDeploymentRel,
        and(
          eq(schema.SnapshotDeploymentRel.snapshot_id, schema.Snapshot.id),
          eq(schema.SnapshotDeploymentRel.deployment_id, deploymentId),
        ),
      )
      .where(
        and(
          eq(schema.Document.project_id, projectId),
          eq(schema.Document.folder, folder),
          eq(schema.Document.name, documentName),
          eq(schema.Snapshot.status, "success"),
        ),
      )
      .limit(1);

    if (!snapshot) {
      return new Response("Document not found in the selected deployment", {
        status: 404,
      });
    }

    const blobUrl = `${process.env.VERCEL_BLOB_STORAGE_ROOT_DOMAIN}/parsed/${snapshot.snapshot_id}.md`;

    const blobResponse = await fetch(blobUrl);

    if (!blobResponse.ok) {
      return new Response("Document content not found", { status: 404 });
    }

    return new Response(blobResponse.body, {
      headers: {
        "Content-Type": "text/markdown",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
