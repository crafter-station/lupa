"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FolderTree,
  Hash,
  Search,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import {
  CodeBlock,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeploymentId } from "@/hooks/use-deployment-id";
import type { SearchResponse } from "@/lib/types/search";
import type {
  TreeDirectory,
  TreeFile,
  TreeNode,
  TreeResponse,
} from "@/lib/types/tree";
import { cn } from "@/lib/utils";

type APIType = "search" | "tree" | "cat";

async function searchDeployment(
  query: string,
  projectId: string,
  deploymentId: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, projectId, deploymentId }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json();

    if (errorData.error?.details && Array.isArray(errorData.error.details)) {
      const messages = errorData.error.details
        .map((d: { message?: string }) => d.message)
        .filter(Boolean)
        .join(", ");
      throw new Error(messages || errorData.error?.message || "Search failed");
    }

    throw new Error(errorData.error?.message || "Search failed");
  }

  return response.json();
}

async function treeDeployment(
  folder: string,
  depth: string,
  projectId: string,
  deploymentId: string,
  signal?: AbortSignal,
): Promise<TreeResponse> {
  const response = await fetch("/api/tree", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId, deploymentId, path: folder, depth }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json();

    if (errorData.error?.details && Array.isArray(errorData.error.details)) {
      const messages = errorData.error.details
        .map((d: { message?: string }) => d.message)
        .filter(Boolean)
        .join(", ");
      throw new Error(
        messages || errorData.error?.message || "Tree request failed",
      );
    }

    throw new Error(errorData.error?.message || "Tree request failed");
  }

  return response.json();
}

async function catDocument(
  path: string,
  projectId: string,
  deploymentId: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/cat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId, deploymentId, path }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json();

    if (errorData.error?.details && Array.isArray(errorData.error.details)) {
      const messages = errorData.error.details
        .map((d: { message?: string }) => d.message)
        .filter(Boolean)
        .join(", ");
      throw new Error(
        messages || errorData.error?.message || "Cat request failed",
      );
    }

    throw new Error(errorData.error?.message || "Cat request failed");
  }

  return response.text();
}

function generateCodeSnippet(
  language: "curl" | "javascript" | "python",
  apiType: APIType,
  deploymentId: string,
  params: { query?: string; folder?: string; depth?: string; path?: string },
) {
  const { query = "", folder = "/", depth = "0", path = "" } = params;

  if (apiType === "search") {
    const exampleQuery = query || "YOUR_QUERY";

    switch (language) {
      case "curl":
        return `curl -X GET "https://api.lupa.dev/v1/search/?query=${encodeURIComponent(exampleQuery)}" \\
  -H "Authorization: Bearer lupa_sk_live_..." \\
  -H "Deployment-Id: ${deploymentId || "YOUR_DEPLOYMENT_ID"}"`;

      case "javascript":
        return `const response = await fetch('https://api.lupa.dev/v1/search/?query=${encodeURIComponent(exampleQuery)}', {
  headers: {
    'Authorization': 'Bearer lupa_sk_live_...',
    'Deployment-Id': '${deploymentId || "YOUR_DEPLOYMENT_ID"}'
  }
});

const data = await response.json();
console.log(data.results);`;

      case "python":
        return `import requests

response = requests.get(
    'https://api.lupa.dev/v1/search/',
    params={'query': '${exampleQuery}'},
    headers={
        'Authorization': 'Bearer lupa_sk_live_...',
        'Deployment-Id': '${deploymentId || "YOUR_DEPLOYMENT_ID"}'
    }
)

data = response.json()
print(data['results'])`;
    }
  } else if (apiType === "tree") {
    const exampleFolder = folder || "/";
    const exampleDepth = depth || "0";

    switch (language) {
      case "curl":
        return `curl -X GET "https://api.lupa.dev/v1/tree/?folder=${encodeURIComponent(exampleFolder)}&depth=${exampleDepth}" \\
  -H "Authorization: Bearer lupa_sk_live_..." \\
  -H "Deployment-Id: ${deploymentId || "YOUR_DEPLOYMENT_ID"}"`;

      case "javascript":
        return `const response = await fetch('https://api.lupa.dev/v1/tree/?folder=${encodeURIComponent(exampleFolder)}&depth=${exampleDepth}', {
  headers: {
    'Authorization': 'Bearer lupa_sk_live_...',
    'Deployment-Id': '${deploymentId || "YOUR_DEPLOYMENT_ID"}'
  }
});

const data = await response.json();
console.log(data.tree);`;

      case "python":
        return `import requests

response = requests.get(
    'https://api.lupa.dev/v1/tree/',
    params={'folder': '${exampleFolder}', 'depth': ${exampleDepth}},
    headers={
        'Authorization': 'Bearer lupa_sk_live_...',
        'Deployment-Id': '${deploymentId || "YOUR_DEPLOYMENT_ID"}'
    }
)

data = response.json()
print(data['tree'])`;
    }
  } else {
    const examplePath = path || "/path/to/file.md";

    switch (language) {
      case "curl":
        return `curl -X GET "https://api.lupa.dev/v1/cat${examplePath}" \\
  -H "Authorization: Bearer lupa_sk_live_..." \\
  -H "Deployment-Id: ${deploymentId || "YOUR_DEPLOYMENT_ID"}"`;

      case "javascript":
        return `const response = await fetch('https://api.lupa.dev/v1/cat${examplePath}', {
  headers: {
    'Authorization': 'Bearer lupa_sk_live_...',
    'Deployment-Id': '${deploymentId || "YOUR_DEPLOYMENT_ID"}'
  }
});

const content = await response.text();
console.log(content);`;

      case "python":
        return `import requests

response = requests.get(
    'https://api.lupa.dev/v1/cat${examplePath}',
    headers={
        'Authorization': 'Bearer lupa_sk_live_...',
        'Deployment-Id': '${deploymentId || "YOUR_DEPLOYMENT_ID"}'
    }
)

content = response.text
print(content)`;
    }
  }
}

function highlightQuery(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  try {
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    let matchCounter = 0;
    let textCounter = 0;

    return parts.map((part) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        const key = `match-${matchCounter}`;
        matchCounter++;
        return (
          <mark
            key={key}
            className="bg-yellow-200 dark:bg-yellow-900/50 rounded px-0.5"
          >
            {part}
          </mark>
        );
      }
      const key = `text-${textCounter}`;
      textCounter++;
      return <React.Fragment key={key}>{part}</React.Fragment>;
    });
  } catch {
    return text;
  }
}

function getScoreBadgeVariant(score: number) {
  if (score >= 0.02) return "default";
  if (score >= 0.01) return "secondary";
  return "outline";
}

function getDocumentFullPath(
  metadata: SearchResponse["results"][0]["metadata"],
): string {
  const documentMetadata = (metadata as Record<string, unknown>).document as
    | { path?: string }
    | undefined;

  if (documentMetadata?.path) {
    return documentMetadata.path;
  }

  const folder = metadata.documentPath || "/";
  const name = metadata.documentName || "untitled";
  return `${folder}${name}.md`;
}

interface SearchResultCardProps {
  result: SearchResponse["results"][0];
  query: string;
  index: number;
}

function SearchResultCard({ result, query, index }: SearchResultCardProps) {
  const [metadataOpen, setMetadataOpen] = useState(false);

  const chunkMetadata = (result.metadata as Record<string, unknown>).chunk as
    | { index?: number }
    | undefined;

  const documentPath = getDocumentFullPath(result.metadata);

  const chunkIndex = chunkMetadata?.index ?? result.metadata.chunkIndex ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card
        className={cn(
          "group hover:border-primary/50 transition-all duration-200 flex flex-col",
          "overflow-hidden py-3",
        )}
      >
        <CardHeader className="p-3 pb-2 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <code className="text-xs font-mono font-semibold truncate flex-1">
              {result.id}
            </code>
            <Badge
              variant={getScoreBadgeVariant(result.score)}
              className="shrink-0 font-mono text-xs tabular-nums"
            >
              {(result.score * 100).toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Hash className="size-3" />
              Chunk {chunkIndex}
            </span>
            <span>•</span>
            <span className="truncate font-mono">{documentPath}</span>
          </div>
        </CardHeader>

        <CardContent className="p-3 shrink-0">
          <ScrollArea className="h-[180px]">
            <div className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
              {highlightQuery(result.data, query)}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="flex-col items-stretch p-2 border-t shrink-0">
          <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full justify-between"
              >
                <span>{metadataOpen ? "Hide" : "Show"} Metadata</span>
                {metadataOpen ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-2">
              <ScrollArea className="h-[200px]">
                <pre className="text-xs font-mono bg-muted/50 p-2 rounded whitespace-pre-wrap">
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

interface TreeNodeViewProps {
  node: TreeNode;
  level?: number;
}

function TreeNodeView({ node, level = 0 }: TreeNodeViewProps) {
  const [isOpen, setIsOpen] = useState(level < 2);

  if (node.type === "file") {
    const fileNode = node as TreeFile;
    return (
      <div className={cn("flex items-start gap-2 py-1", level > 0 && "ml-4")}>
        <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono truncate">{fileNode.name}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {fileNode.metadata.chunks_count} chunks
            </Badge>
            <Badge variant="outline" className="text-xs shrink-0">
              {fileNode.metadata.tokens_count} tokens
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {fileNode.path}
          </p>
        </div>
      </div>
    );
  }

  const dirNode = node as TreeDirectory;
  return (
    <div className={level > 0 ? "ml-4" : ""}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1 hover:bg-muted/50 rounded px-2 -mx-2 w-full text-left"
      >
        <FolderTree
          className={cn(
            "size-4 text-muted-foreground shrink-0 transition-transform",
            isOpen && "rotate-90",
          )}
        />
        <span className="text-sm font-mono font-medium">{dirNode.name}/</span>
        <Badge variant="secondary" className="text-xs">
          {dirNode.children.length}
        </Badge>
      </button>
      {isOpen && (
        <div className="mt-1">
          {dirNode.children.map((child, idx) => (
            <TreeNodeView
              key={`${child.path}-${idx}`}
              node={child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function APIPlayground() {
  const { projectId } = useParams<{
    projectId: string;
  }>();
  const [deploymentId] = useDeploymentId();

  const [activeAPI, setActiveAPI] = useState<APIType>("search");
  const [apiRefOpen, setApiRefOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [treeFolder, setTreeFolder] = useState("/");
  const [treeDepth, setTreeDepth] = useState("0");
  const [catPath, setCatPath] = useState("");

  const searchResult = useQuery({
    queryKey: ["search", deploymentId, searchQuery],
    queryFn: ({ signal }) => {
      if (!deploymentId) throw new Error("Deployment ID is required");
      return searchDeployment(searchQuery, projectId, deploymentId, signal);
    },
    enabled:
      searchQuery.trim().length > 0 && !!deploymentId && activeAPI === "search",
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const treeResult = useQuery({
    queryKey: ["tree", deploymentId, treeFolder, treeDepth],
    queryFn: ({ signal }) => {
      if (!deploymentId) throw new Error("Deployment ID is required");
      return treeDeployment(
        treeFolder,
        treeDepth,
        projectId,
        deploymentId,
        signal,
      );
    },
    enabled: !!deploymentId && activeAPI === "tree",
    retry: false,
  });

  const catResult = useQuery({
    queryKey: ["cat", deploymentId, catPath],
    queryFn: ({ signal }) => {
      if (!deploymentId) throw new Error("Deployment ID is required");
      return catDocument(catPath, projectId, deploymentId, signal);
    },
    enabled: catPath.trim().length > 0 && !!deploymentId && activeAPI === "cat",
    retry: false,
  });

  const getCodeSnippetParams = () => {
    if (activeAPI === "search") {
      return { query: searchQuery };
    } else if (activeAPI === "tree") {
      return { folder: treeFolder, depth: treeDepth };
    } else {
      return { path: catPath };
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 space-y-3">
        <div className="flex items-center gap-3">
          <Tabs
            value={activeAPI}
            onValueChange={(v) => setActiveAPI(v as APIType)}
          >
            <TabsList>
              <TabsTrigger value="search" className="gap-2">
                <Search className="size-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="tree" className="gap-2">
                <FolderTree className="size-4" />
                Tree
              </TabsTrigger>
              <TabsTrigger value="cat" className="gap-2">
                <FileText className="size-4" />
                Cat
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setApiRefOpen(!apiRefOpen)}
            className="gap-2 ml-auto"
          >
            {apiRefOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            API Reference
          </Button>
        </div>

        <AnimatePresence>
          {apiRefOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border bg-muted/30 p-4">
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl" className="mt-3">
                    <CodeBlock
                      code={generateCodeSnippet(
                        "curl",
                        activeAPI,
                        deploymentId || "",
                        getCodeSnippetParams(),
                      )}
                      language="bash"
                    >
                      <CodeBlockCopyButton />
                    </CodeBlock>
                  </TabsContent>
                  <TabsContent value="javascript" className="mt-3">
                    <CodeBlock
                      code={generateCodeSnippet(
                        "javascript",
                        activeAPI,
                        deploymentId || "",
                        getCodeSnippetParams(),
                      )}
                      language="javascript"
                    >
                      <CodeBlockCopyButton />
                    </CodeBlock>
                  </TabsContent>
                  <TabsContent value="python" className="mt-3">
                    <CodeBlock
                      code={generateCodeSnippet(
                        "python",
                        activeAPI,
                        deploymentId || "",
                        getCodeSnippetParams(),
                      )}
                      language="python"
                    >
                      <CodeBlockCopyButton />
                    </CodeBlock>
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {activeAPI === "search" && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search your knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 h-12 text-base",
                  searchResult.isLoading && "pr-10",
                )}
                autoFocus
              />
              {searchResult.isLoading && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Search className="size-4 text-muted-foreground" />
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {!searchQuery.trim() && (
              <div className="h-full rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-center p-8">
                <div className="space-y-6 max-w-md">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "reverse",
                    }}
                    className="mx-auto w-fit"
                  >
                    <div className="relative">
                      <Search className="size-16 text-muted-foreground/60" />
                      <motion.div
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                        className="absolute inset-0"
                      >
                        <Sparkles className="size-16 text-primary/40" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <div className="space-y-2">
                    <p className="text-xl font-medium text-muted-foreground">
                      Search your knowledge base
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                      Start typing to search in real-time using semantic vector
                      search
                    </p>
                  </div>
                </div>
              </div>
            )}

            {searchResult.isError && searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
              >
                <p className="text-sm text-destructive font-medium">
                  Search Error
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {searchResult.error instanceof Error
                    ? searchResult.error.message
                    : "Search failed"}
                </p>
              </motion.div>
            )}

            {searchResult.data && searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col gap-3"
              >
                <div className="shrink-0 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found{" "}
                    <span className="font-semibold text-foreground">
                      {searchResult.data.results.length}
                    </span>{" "}
                    results
                  </p>
                  {searchResult.data.results.length > 0 && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {searchResult.data.query}
                    </Badge>
                  )}
                </div>

                {searchResult.data.results.length === 0 ? (
                  <div className="flex-1 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-center p-8">
                    <div className="space-y-2 max-w-sm">
                      <Search className="size-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-sm font-medium text-muted-foreground">
                        No results found
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Try a different search query
                      </p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="space-y-3 pr-4">
                      {searchResult.data.results.map((result, idx) => (
                        <SearchResultCard
                          key={result.id}
                          result={result}
                          query={searchQuery}
                          index={idx}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {activeAPI === "tree" && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="shrink-0 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tree-folder">Folder Path</Label>
              <Input
                id="tree-folder"
                type="text"
                placeholder="/"
                value={treeFolder}
                onChange={(e) => setTreeFolder(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tree-depth">Depth</Label>
              <Input
                id="tree-depth"
                type="number"
                min="0"
                placeholder="0"
                value={treeDepth}
                onChange={(e) => setTreeDepth(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {treeResult.isLoading && (
              <div className="h-full rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <FolderTree className="size-8 text-muted-foreground mx-auto" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Loading tree...
                  </p>
                </div>
              </div>
            )}

            {treeResult.isError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
              >
                <p className="text-sm text-destructive font-medium">
                  Tree Error
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {treeResult.error instanceof Error
                    ? treeResult.error.message
                    : "Failed to load tree"}
                </p>
              </motion.div>
            )}

            {treeResult.data && (
              <Card className="h-full flex flex-col">
                <CardHeader className="shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm">
                        {treeResult.data.path}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {treeResult.data.tree.length} items
                      </p>
                    </div>
                    <Badge variant="outline">
                      Depth: {treeResult.data.depth}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-4">
                  <ScrollArea className="h-full">
                    <div className="space-y-1">
                      {treeResult.data.tree.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No files or directories found
                        </div>
                      ) : (
                        treeResult.data.tree.map((node, idx) => (
                          <TreeNodeView
                            key={`${node.path}-${idx}`}
                            node={node}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeAPI === "cat" && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="shrink-0 space-y-2">
            <Label htmlFor="cat-path">File Path</Label>
            <Input
              id="cat-path"
              type="text"
              placeholder="/path/to/file.md"
              value={catPath}
              onChange={(e) => setCatPath(e.target.value)}
            />
          </div>

          <div className="flex-1 min-h-0">
            {!catPath.trim() && (
              <div className="h-full rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center text-center p-8">
                <div className="space-y-6 max-w-md">
                  <FileText className="size-16 text-muted-foreground/60 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-xl font-medium text-muted-foreground">
                      View file contents
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                      Enter a file path to retrieve and display its contents
                    </p>
                  </div>
                </div>
              </div>
            )}

            {catResult.isLoading && catPath.trim() && (
              <div className="h-full rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <FileText className="size-8 text-muted-foreground mx-auto" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">
                    Loading file...
                  </p>
                </div>
              </div>
            )}

            {catResult.isError && catPath.trim() && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-4"
              >
                <p className="text-sm text-destructive font-medium">
                  Cat Error
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  {catResult.error instanceof Error
                    ? catResult.error.message
                    : "Failed to load file"}
                </p>
              </motion.div>
            )}

            {catResult.data && catPath.trim() && (
              <Card className="h-full flex flex-col">
                <CardHeader className="shrink-0">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm truncate">{catPath}</p>
                    <Badge variant="outline">
                      {catResult.data.length} chars
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-4">
                  <ScrollArea className="h-full">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {catResult.data}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
