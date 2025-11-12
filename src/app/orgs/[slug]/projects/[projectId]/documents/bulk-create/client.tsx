"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { CheckCircle2, Circle, Loader2, Trash2, XCircle } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { FolderPathSelector } from "@/components/elements/folder-path-selector";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RefreshFrequency } from "@/db";
import { DocumentCollection, SnapshotCollection } from "@/db/collections";
import { generateId } from "@/lib/generate-id";

type DiscoveredLink = {
  id: string;
  url: string;
  title: string;
  description: string;
  name: string;
  folder: string;
  refresh_frequency: RefreshFrequency | "none";
  enhance: boolean;
};

export function BulkCreateClient() {
  const { projectId, slug } = useParams<{ projectId: string; slug: string }>();
  const router = useRouter();

  const [rootUrl, setRootUrl] = React.useState("");
  const [rootFolder, setRootFolder] = React.useState("/");
  const [limit, setLimit] = React.useState(50);
  const [shouldFetch, setShouldFetch] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [discoveredLinks, setDiscoveredLinks] = React.useState<
    DiscoveredLink[]
  >([]);
  const [snapshotIds, setSnapshotIds] = React.useState<string[]>([]);
  const [runHandle, setRunHandle] = React.useState<{
    id: string;
    publicAccessToken: string;
  } | null>(null);

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

  const { data: firecrawlData, isLoading: isMapping } = useQuery({
    queryKey: ["firecrawl-map", rootUrl, limit],
    queryFn: async () => {
      const response = await fetch("/api/firecrawl/map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: rootUrl, limit }),
      });

      const data = (await response.json()) as {
        success: boolean;
        links?: Array<{
          url: string;
          title?: string;
          description?: string;
          folder?: string;
        }>;
        error?: string;
      };

      if (!data.success || !data.links) {
        throw new Error(data.error || "Failed to discover links");
      }

      return data.links;
    },
    enabled: shouldFetch && !!rootUrl,
  });

  React.useEffect(() => {
    if (firecrawlData && shouldFetch) {
      const initialLinks = firecrawlData
        .map((link) => ({
          id: generateId(),
          url: link.url,
          title: link.title || "",
          description: link.description || "",
          name: link.title || extractNameFromUrl(link.url),
          folder: link.folder || rootFolder,
          refresh_frequency: "none" as const,
          enhance: false,
        }))
        .sort((a, b) => a.url.localeCompare(b.url));

      setDiscoveredLinks(initialLinks);
      setShouldFetch(false);
    }
  }, [firecrawlData, shouldFetch, extractNameFromUrl, rootFolder]);

  const handleDiscover = React.useCallback(() => {
    if (!rootUrl) return;
    setShouldFetch(true);
  }, [rootUrl]);

  const handleCreateAll = React.useCallback(async () => {
    if (discoveredLinks.length === 0) return;

    setIsCreating(true);

    const documentsToCreate = discoveredLinks.map((link) => ({
      id: generateId(),
      folder: link.folder,
      name: link.name,
      description: link.description || null,
      url: link.url,
      refresh_frequency: link.refresh_frequency,
      enhance: link.enhance,
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
        created_count: number;
        snapshot_ids: string[];
        run_id: string;
        public_access_token: string;
      };

      setSnapshotIds(data.snapshot_ids);
      setRunHandle({
        id: data.run_id,
        publicAccessToken: data.public_access_token,
      });
    } catch (error) {
      console.error("Failed to create documents:", error);
      setIsCreating(false);
    }
  }, [discoveredLinks, projectId]);

  const getDuplicateInfo = React.useCallback(
    (link: DiscoveredLink) => {
      const existsInDB = allDocuments.some(
        (doc) => doc.folder === link.folder && doc.name === link.name,
      );

      const duplicateInList =
        discoveredLinks.filter(
          (l) =>
            l.id !== link.id &&
            l.folder === link.folder &&
            l.name === link.name,
        ).length > 0;

      return { existsInDB, duplicateInList };
    },
    [allDocuments, discoveredLinks],
  );

  const totalDuplicates = React.useMemo(() => {
    return discoveredLinks.filter((link) => {
      const { existsInDB, duplicateInList } = getDuplicateInfo(link);
      return existsInDB || duplicateInList;
    }).length;
  }, [discoveredLinks, getDuplicateInfo]);

  const toggleAllEnhance = () => {
    const allEnhanced = discoveredLinks.every((link) => link.enhance);
    setDiscoveredLinks((links) =>
      links.map((link) => ({ ...link, enhance: !allEnhanced })),
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

  const handleBack = React.useCallback(() => {
    setDiscoveredLinks([]);
    setRootUrl("");
    setShouldFetch(false);
  }, []);

  const allEnhanced = discoveredLinks.every((link) => link.enhance);
  const someEnhanced = discoveredLinks.some((link) => link.enhance);

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
              {discoveredLinks.length} links discovered
            </p>
          </div>
          <Button variant="outline" onClick={handleBack} disabled={isCreating}>
            Back
          </Button>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="min-w-[300px]">URL</TableHead>
                <TableHead className="min-w-[200px]">Folder Path</TableHead>
                <TableHead className="min-w-[150px]">
                  Refresh Schedule
                </TableHead>
                <TableHead className="min-w-[100px]">
                  <div className="flex items-center justify-center gap-2">
                    <Checkbox
                      checked={allEnhanced}
                      ref={(el) => {
                        if (el) {
                          const button = el.querySelector("button");
                          if (button) {
                            (
                              button as HTMLButtonElement & {
                                indeterminate?: boolean;
                              }
                            ).indeterminate = someEnhanced && !allEnhanced;
                          }
                        }
                      }}
                      onCheckedChange={toggleAllEnhance}
                      disabled={isCreating}
                      aria-label="Toggle all AI enhance"
                    />
                    <span>AI Enhance</span>
                  </div>
                </TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discoveredLinks.map((link) => {
                const { existsInDB, duplicateInList } = getDuplicateInfo(link);
                const hasDuplicate = existsInDB || duplicateInList;

                return (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          value={link.name}
                          onChange={(e) => {
                            const sanitized = e.target.value
                              .trim()
                              .replace(/\s+/g, "-")
                              .replace(/[^a-zA-Z0-9_-]/g, "");
                            updateLink(link.id, "name", sanitized);
                          }}
                          disabled={isCreating}
                          className={
                            hasDuplicate
                              ? "text-sm border-destructive"
                              : "text-sm"
                          }
                        />
                        {hasDuplicate && (
                          <p className="text-xs text-destructive">
                            {existsInDB
                              ? "Exists in database"
                              : "Duplicate in list"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={link.description}
                        onChange={(e) =>
                          updateLink(link.id, "description", e.target.value)
                        }
                        disabled={isCreating}
                        placeholder="Add description..."
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={link.url}
                        onChange={(e) =>
                          updateLink(link.id, "url", e.target.value)
                        }
                        disabled={isCreating}
                        className="text-sm font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          value={link.folder}
                          onChange={(e) =>
                            updateLink(link.id, "folder", e.target.value)
                          }
                          disabled={isCreating}
                          className="text-sm font-mono"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={link.refresh_frequency}
                        onValueChange={(value) =>
                          updateLink(
                            link.id,
                            "refresh_frequency",
                            value as RefreshFrequency | "none",
                          )
                        }
                        disabled={isCreating}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={link.enhance}
                        onCheckedChange={(checked) =>
                          updateLink(link.id, "enhance", checked === true)
                        }
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
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalDuplicates > 0 && (
          <div className="p-4 border border-destructive bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              {totalDuplicates} duplicate document name
              {totalDuplicates !== 1 ? "s" : ""} detected. Please rename or
              remove duplicates before creating.
            </p>
          </div>
        )}

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button
            onClick={handleCreateAll}
            disabled={
              isCreating || discoveredLinks.length === 0 || totalDuplicates > 0
            }
            size="lg"
            className="shadow-lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Create ${discoveredLinks.length} Document${discoveredLinks.length !== 1 ? "s" : ""}`
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

        <div className="space-y-2">
          <Label htmlFor="limit">Link Limit</Label>
          <Input
            id="limit"
            type="number"
            min="1"
            max="1000"
            placeholder="50"
            value={limit}
            onChange={(e) =>
              setLimit(Number.parseInt(e.target.value, 10) || 50)
            }
            disabled={isMapping}
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
