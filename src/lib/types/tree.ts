export interface TreeFile {
  type: "file";
  name: string;
  path: string;
  metadata: {
    chunks_count: number;
    tokens_count: number;
  } & Record<string, unknown>;
}

export interface TreeDirectory {
  type: "directory";
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = TreeFile | TreeDirectory;

export interface TreeResponse {
  path: string;
  depth: number;
  tree: TreeNode[];
}
