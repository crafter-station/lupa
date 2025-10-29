// cat /path/to/file.md
// display file contents
// users will hit https://<projectId>.lupa.build/api/cat/?path=/path/to/file.md

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DocumentNameSchema, FolderPathSchema } from "@/lib/validation";

export const preferredRegion = "iad1";
export const revalidate = false;
export const dynamic = "force-static";

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

    const parts = path.split("/");
    const rawDocumentName = parts.pop();
    const rawFolder = `${parts.join(`/`)}/`;

    const { folder, documentName } = z
      .object({
        folder: FolderPathSchema,
        documentName: DocumentNameSchema,
      })
      .parse({
        folder: rawFolder,
        documentName: rawDocumentName?.split(".")[0],
      });

    console.log({ deploymentId, folder, documentName });

    const [deployment] = await db
      .select()
      .from(schema.Deployment)
      .where(
        and(
          eq(schema.Deployment.id, deploymentId),
          eq(schema.Deployment.project_id, projectId),
        ),
      )
      .limit(1);

    if (!deployment) {
      return new Response("Deployment not found", { status: 404 });
    }

    const [snapshot] = await db
      .select({
        snapshot_id: schema.Snapshot.id,
      })
      .from(schema.SnapshotDeploymentRel)
      .innerJoin(
        schema.Snapshot,
        eq(schema.SnapshotDeploymentRel.snapshot_id, schema.Snapshot.id),
      )
      .where(
        and(
          eq(schema.SnapshotDeploymentRel.deployment_id, deploymentId),
          eq(schema.SnapshotDeploymentRel.org_id, deployment.org_id),
          eq(schema.SnapshotDeploymentRel.folder, folder),
          eq(schema.SnapshotDeploymentRel.name, documentName),
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
