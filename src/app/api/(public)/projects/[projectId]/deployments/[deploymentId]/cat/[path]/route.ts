// cat /path/to/file.md
// display file contents
// users will hit https://<projectId>.lupa.build/api/cat/?path=/path/to/file.md

import { and, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ApiError, ErrorCode, handleApiError } from "@/lib/api-error";
import {
  CatPathSchema,
  DocumentNameSchema,
  FolderPathSchema,
} from "@/lib/validation";

export const preferredRegion = ["iad1"];

async function getDocumentContent(
  deploymentId: string,
  folder: string,
  documentName: string,
) {
  "use cache: remote";
  cacheLife({
    stale: 2592000,
    revalidate: 2592000,
    expire: 2592000,
  });
  cacheTag(`cat:${deploymentId}:${folder}:${documentName}`);

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
        eq(schema.SnapshotDeploymentRel.folder, folder),
        eq(schema.SnapshotDeploymentRel.name, documentName),
        eq(schema.Snapshot.status, "success"),
      ),
    )
    .limit(1);

  if (!snapshot) {
    return null;
  }

  const blobUrl = `${process.env.VERCEL_BLOB_STORAGE_ROOT_DOMAIN}/parsed/${snapshot.snapshot_id}.md`;

  const blobResponse = await fetch(blobUrl);

  if (!blobResponse.ok) {
    return null;
  }

  const text = await blobResponse.text();

  return text;
}

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
    const { deploymentId, path } = await params;

    const validatedPath = CatPathSchema.parse(path);

    const parts = validatedPath.split("/");
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

    const body = await getDocumentContent(deploymentId, folder, documentName);

    if (!body) {
      throw new ApiError(
        ErrorCode.DOCUMENT_NOT_FOUND,
        "Document not found in the selected deployment",
        404,
      );
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
