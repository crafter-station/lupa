// tree /path/to/folder --depth 2
// display directory tree structure
// users will hit https://<projectId>.lupa.build/api/tree?folder=/path&depth=2

import { and, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { normalizeFolderPath } from "@/lib/folder-utils";

export const preferredRegion = ["iad1"];

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

async function getDirectoryTree(
  deploymentId: string,
  folderParam: string,
  depthParam: string,
) {
  "use cache: remote";
  cacheLife({
    stale: 2592000,
    revalidate: 2592000,
    expire: 2592000,
  });
  cacheTag(`tree:${deploymentId}:${folderParam}:${depthParam}`);

  const targetFolder = normalizeFolderPath(decodeURIComponent(folderParam));
  const maxDepth = Number.parseInt(depthParam, 10);

  if (Number.isNaN(maxDepth) || maxDepth < 0) {
    throw new Error("Invalid depth parameter");
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
        eq(schema.Snapshot.status, "success"),
        targetFolder === "/"
          ? undefined
          : sql`${schema.SnapshotDeploymentRel.folder} LIKE ${`${targetFolder}%`}`,
      ),
    );

  const tree = buildTree(documents, targetFolder, maxDepth);

  return {
    path: targetFolder,
    depth: maxDepth,
    tree,
  };
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
    const { deploymentId, folder, depth } = await params;

    const response = await getDirectoryTree(deploymentId, folder, depth);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tree API error:", error);

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error instanceof Error) {
      if (error.message.includes("Invalid depth parameter")) {
        errorMessage = error.message;
        statusCode = 400;
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
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
      path: `${docPath}${doc.documentName}.md`,
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
        path: `${docPath}${doc.documentName}.md`,
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
