"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { CheckCircle2, Circle, Loader2, Trash2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { FolderPathSelector } from "@/components/elements/folder-path-selector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { generateId } from "@/lib/generate-id";

type DiscoveredLink = {
  id: string;
  url: string;
  title: string;
  description: string;
  name: string;
  folder: string;
  enabled: boolean;
};

export function BulkCreateClient() {
  const { projectId, slug } = useParams<{ projectId: string; slug: string }>();
  const router = useRouter();
  const { folder: contextFolder } = useFolderDocumentVersion();

  const [rootUrl, setRootUrl] = React.useState("");
  const [rootFolder, setRootFolder] = React.useState(contextFolder ?? "/");
  const [isMapping, setIsMapping] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [discoveredLinks, setDiscoveredLinks] = React.useState<
    DiscoveredLink[]
  >([]);
  const [snapshotIds, setSnapshotIds] = React.useState<string[]>([]);
  const [runHandle, setRunHandle] = React.useState<{
    id: string;
    publicAccessToken: string;
  } | null>(null);

  const { DocumentCollection, SnapshotCollection } = useCollections();

  const { data: allDocuments = [] } = useLiveQuery(
    (q) =>
      q
        .from({ document: DocumentCollection })
        .select(({ document }) => ({ ...document }))
        .where(({ document }) => eq(document.project_id, projectId)),
    [],
  );

  const { data: allSnapshots = [] } = useLiveQuery(
    (q) =>
      q
        .from({ snapshot: SnapshotCollection })
        .select(({ snapshot }) => ({ ...snapshot })),
    [],
  );

  const snapshots = React.useMemo(
    () => allSnapshots.filter((s) => snapshotIds.includes(s.id)),
    [allSnapshots, snapshotIds],
  );

  const { run } = useRealtimeRun(runHandle?.id, {
    accessToken: runHandle?.publicAccessToken,
    enabled: !!runHandle,
  });

  const extractNameFromUrl = React.useCallback((url: string): string => {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      return pathParts[pathParts.length - 1] || parsed.hostname;
    } catch {
      return "Untitled Document";
    }
  }, []);

  const ensureSlashes = React.useCallback((path: string): string => {
    if (!path) return "/";
    let result = path;
    if (!result.startsWith("/")) result = `/${result}`;
    if (!result.endsWith("/")) result = `${result}/`;
    return result;
  }, []);

  const handleDiscover = React.useCallback(async () => {
    if (!rootUrl) return;

    setIsMapping(true);
    try {
      const response = await fetch("/api/firecrawl/map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: rootUrl, limit: 50 }),
      });

      const data = (await response.json()) as {
        success: boolean;
        links?: Array<{ url: string; title?: string; description?: string }>;
        error?: string;
      };

      if (!data.success || !data.links) {
        throw new Error(data.error || "Failed to discover links");
      }

      setDiscoveredLinks(
        data.links.map((link) => ({
          id: generateId(),
          url: link.url,
          title: link.title || "",
          description: link.description || "",
          name: link.title || extractNameFromUrl(link.url),
          folder: "",
          enabled: true,
        })),
      );
    } catch (error) {
      console.error("Failed to discover links:", error);
    } finally {
      setIsMapping(false);
    }
  }, [rootUrl, extractNameFromUrl]);

  const handleCreateAll = React.useCallback(async () => {
    const enabled = discoveredLinks.filter((d) => d.enabled);
    if (enabled.length === 0) return;

    setIsCreating(true);

    const documentsToCreate = enabled.map((link) => ({
      id: generateId(),
      folder: ensureSlashes(rootFolder + link.folder),
      name: link.name,
      description: link.description || null,
      url: link.url,
    }));

    try {
      const response = await fetch("/api/documents/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          documents: documentsToCreate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create documents: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        txid: number;
        created_count: number;
        snapshot_ids: string[];
        run_id: string;
        public_access_token: string;
      };

      if (data.success) {
        setSnapshotIds(data.snapshot_ids);
        setRunHandle({
          id: data.run_id,
          publicAccessToken: data.public_access_token,
        });
      }
    } catch (error) {
      console.error("Failed to create documents:", error);
      setIsCreating(false);
    }
  }, [discoveredLinks, rootFolder, projectId, ensureSlashes]);

  const selectAll = () => {
    setDiscoveredLinks((links) =>
      links.map((link) => ({ ...link, enabled: true })),
    );
  };

  const deselectAll = () => {
    setDiscoveredLinks((links) =>
      links.map((link) => ({ ...link, enabled: false })),
    );
  };

  const deleteLink = (id: string) => {
    setDiscoveredLinks((links) => links.filter((link) => link.id !== id));
  };

  const updateLink = (
    id: string,
    field: keyof DiscoveredLink,
    value: string | boolean,
  ) => {
    setDiscoveredLinks((links) =>
      links.map((link) =>
        link.id === id ? { ...link, [field]: value } : link,
      ),
    );
  };

  const handleBack = () => {
    setDiscoveredLinks([]);
    setRootUrl("");
  };

  const enabledCount = discoveredLinks.filter((d) => d.enabled).length;

  const getSnapshotStatus = (snapshotId: string) => {
    const snapshot = snapshots.find((s) => s.id === snapshotId);
    return snapshot?.status ?? "queued";
  };

  const completedCount = snapshots.filter((s) => s.status === "success").length;
  const errorCount = snapshots.filter((s) => s.status === "error").length;
  const progressPercent = snapshotIds.length
    ? (completedCount / snapshotIds.length) * 100
    : 0;

  if (isCreating && runHandle) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Creating Documents...</h1>
          <p className="text-sm text-muted-foreground">
            {completedCount + errorCount} of {snapshotIds.length} completed
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="grid gap-2">
          {snapshotIds.map((snapshotId, index) => {
            const status = getSnapshotStatus(snapshotId);
            const snapshot = snapshots.find((s) => s.id === snapshotId);
            const doc = snapshot
              ? allDocuments.find((d) => d.id === snapshot.document_id)
              : null;

            return (
              <div
                key={snapshotId}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                {status === "success" && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
                {status === "error" && (
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                )}
                {status === "running" && (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                )}
                {status === "queued" && (
                  <Circle className="h-5 w-5 text-gray-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {doc?.name ?? `Document ${index + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {snapshot?.url ?? "Processing..."}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground capitalize shrink-0">
                  {status}
                </span>
              </div>
            );
          })}
        </div>

        {errorCount > 0 && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              {errorCount} document{errorCount !== 1 ? "s" : ""} failed to
              process. They will still be available in your documents list for
              retry.
            </p>
          </div>
        )}

        {run?.isCompleted && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setRunHandle(null);
                setSnapshotIds([]);
              }}
            >
              Stay Here
            </Button>
            <Button
              onClick={() => {
                const successfulSnapshots = snapshots.filter(
                  (s) => s.status === "success",
                );
                if (successfulSnapshots.length > 0) {
                  const firstSnapshot = successfulSnapshots[0];
                  const doc = allDocuments.find(
                    (d) => d.id === firstSnapshot.document_id,
                  );
                  if (doc) {
                    router.push(
                      `/orgs/${slug}/projects/${projectId}/documents/${doc.folder}doc:${doc.id}`,
                    );
                  }
                }
              }}
            >
              View Documents
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (discoveredLinks.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Bulk Create Documents</h1>
            <p className="text-sm text-muted-foreground">
              Root folder: {rootFolder} • {discoveredLinks.length} links
              discovered
            </p>
          </div>
          <Button variant="outline" onClick={handleBack} disabled={isCreating}>
            Back
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">✓</TableHead>
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead className="w-[35%]">URL</TableHead>
                <TableHead className="w-[20%]">Relative Folder</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discoveredLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(e) =>
                        updateLink(link.id, "enabled", e.target.checked)
                      }
                      disabled={isCreating}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={link.name}
                      onChange={(e) =>
                        updateLink(link.id, "name", e.target.value)
                      }
                      disabled={isCreating}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={link.url}
                      onChange={(e) =>
                        updateLink(link.id, "url", e.target.value)
                      }
                      disabled={isCreating}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={link.folder}
                      onChange={(e) =>
                        updateLink(link.id, "folder", e.target.value)
                      }
                      placeholder="e.g., api/"
                      disabled={isCreating}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteLink(link.id)}
                      disabled={isCreating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleCreateAll}
            disabled={isCreating || enabledCount === 0}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${enabledCount} Document${enabledCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Bulk Create Documents from Website</h1>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rootUrl">Website URL</Label>
          <Input
            id="rootUrl"
            type="url"
            placeholder="https://docs.example.com"
            value={rootUrl}
            onChange={(e) => setRootUrl(e.target.value)}
            disabled={isMapping}
          />
        </div>

        <div className="space-y-2">
          <Label>Root Folder</Label>
          <FolderPathSelector
            documents={allDocuments}
            initialFolder={rootFolder}
            onChange={setRootFolder}
          />
        </div>

        <Button onClick={handleDiscover} disabled={isMapping || !rootUrl}>
          {isMapping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Discovering Links...
            </>
          ) : (
            "Discover Links"
          )}
        </Button>
      </div>
    </div>
  );
}
