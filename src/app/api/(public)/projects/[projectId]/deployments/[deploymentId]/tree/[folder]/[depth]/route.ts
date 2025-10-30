// tree /path/to/folder --depth 2
// display directory tree structure
// users will hit https://<projectId>.lupa.build/api/tree?folder=/path&depth=2

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { normalizeFolderPath } from "@/lib/folder-utils";

export const preferredRegion = "iad1";
export const revalidate = false;
export const dynamic = "force-static";

interface TreeFile {
  type: "file";
  name: string;
  path: string;
  metadata: {
    chunks_count: number;
    tokens_count: number;
  } & {};
}

interface TreeDirectory {
  type: "directory";
  name: string;
  path: string;
  children: TreeNode[];
}

type TreeNode = TreeFile | TreeDirectory;

interface TreeResponse {
  path: string;
  depth: number;
  tree: TreeNode[];
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      projectId: string;
      deploymentId: string;
      folder: string;
      depth: string;
    }>;
  },
) {
  try {
    const {
      projectId,
      deploymentId,
      folder: folderParam,
      depth: depthParam,
    } = await params;

    const targetFolder = normalizeFolderPath(decodeURIComponent(folderParam));
    const maxDepth = Number.parseInt(depthParam, 10);

    if (Number.isNaN(maxDepth) || maxDepth < 0) {
      return new Response(
        JSON.stringify({ error: "Invalid depth parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

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
      return new Response(JSON.stringify({ error: "Deployment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const documents = await db
      .select({
        documentId: schema.Snapshot.document_id,
        documentName: schema.SnapshotDeploymentRel.name,
        documentPath: schema.SnapshotDeploymentRel.folder,
        snapshotId: schema.Snapshot.id,
        chunksCount: schema.Snapshot.chunks_count,
        tokensCount: schema.Snapshot.tokens_count,
        metadata: schema.Snapshot.metadata,
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
          eq(schema.Snapshot.status, "success"),
          targetFolder === "/"
            ? undefined
            : sql`${schema.SnapshotDeploymentRel.folder} LIKE ${targetFolder + "%"}`,
        ),
      );

    const tree = buildTree(documents, targetFolder, maxDepth);

    const response: TreeResponse = {
      path: targetFolder,
      depth: maxDepth,
      tree,
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tree API error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

function buildTree(
  documents: Array<{
    documentId: string;
    documentName: string;
    documentPath: string;
    snapshotId: string;
    chunksCount: number | null;
    tokensCount: number | null;
    metadata: object | null;
  }>,
  rootPath: string,
  maxDepth: number,
): TreeNode[] {
  const rootSegments =
    rootPath === "/" ? [] : rootPath.split("/").filter(Boolean);
  const rootDepth = rootSegments.length;

  const filteredDocs = documents.filter((doc) => {
    const docPath = normalizeFolderPath(doc.documentPath);
    return docPath.startsWith(rootPath) || rootPath === "/";
  });

  const directoryMap = new Map<string, TreeDirectory>();

  for (const doc of filteredDocs) {
    const docPath = normalizeFolderPath(doc.documentPath);
    const segments = docPath === "/" ? [] : docPath.split("/").filter(Boolean);

    const relativeSegments = segments.slice(rootDepth);
    const depth = relativeSegments.length;

    if (maxDepth > 0 && depth >= maxDepth) {
      continue;
    }

    let currentPath = rootPath;
    for (let i = 0; i < relativeSegments.length; i++) {
      const segment = relativeSegments[i];
      const parentPath = currentPath;
      currentPath =
        currentPath === "/" ? `/${segment}/` : `${currentPath}${segment}/`;

      if (!directoryMap.has(currentPath)) {
        const dir: TreeDirectory = {
          type: "directory",
          name: segment,
          path: currentPath,
          children: [],
        };
        directoryMap.set(currentPath, dir);

        if (parentPath === rootPath) {
          continue;
        }

        const parent = directoryMap.get(parentPath);
        if (parent) {
          parent.children.push(dir);
        }
      }
    }

    const fileNode: TreeFile = {
      type: "file",
      name: doc.documentName,
      path: `${docPath}${doc.documentName}`,
      metadata: {
        chunks_count: doc.chunksCount || 0,
        tokens_count: doc.tokensCount || 0,
        ...(doc.metadata || {}),
      },
    };

    if (docPath === rootPath) {
      continue;
    }

    const parent = directoryMap.get(docPath);
    if (parent) {
      parent.children.push(fileNode);
    }
  }

  const rootChildren: TreeNode[] = [];

  for (const [path, dir] of directoryMap.entries()) {
    if (
      path !== rootPath &&
      path.split("/").filter(Boolean).length === rootDepth + 1
    ) {
      const segments = path.split("/").filter(Boolean);
      if (segments.length === rootDepth + 1) {
        rootChildren.push(dir);
      }
    }
  }

  for (const doc of filteredDocs) {
    const docPath = normalizeFolderPath(doc.documentPath);
    if (docPath === rootPath) {
      const fileNode: TreeFile = {
        type: "file",
        name: doc.documentName,
        path: `${docPath}${doc.documentName}`,
        metadata: {
          chunks_count: doc.chunksCount || 0,
          tokens_count: doc.tokensCount || 0,
          ...(doc.metadata || {}),
        },
      };
      rootChildren.push(fileNode);
    }
  }

  rootChildren.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "directory" ? -1 : 1;
  });

  for (const node of rootChildren) {
    if (node.type === "directory") {
      sortTreeChildren(node);
    }
  }

  return rootChildren;
}

function sortTreeChildren(dir: TreeDirectory): void {
  dir.children.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "directory" ? -1 : 1;
  });

  for (const child of dir.children) {
    if (child.type === "directory") {
      sortTreeChildren(child);
    }
  }
}
