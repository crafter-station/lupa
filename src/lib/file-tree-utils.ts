export interface TreeFile {
  type: "file";
  name: string;
  path: string;
  metadata: {
    chunks_count: number;
    tokens_count: number;
  };
}

export interface TreeDirectory {
  type: "directory";
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeDirectory;

export interface FileTreeResponse {
  path: string;
  depth: number;
  tree: TreeNode[];
}

export function flattenTree(nodes: TreeNode[]): TreeFile[] {
  const files: TreeFile[] = [];

  function traverse(node: TreeNode) {
    if (node.type === "file") {
      files.push(node);
    } else if (node.type === "directory") {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return files;
}
