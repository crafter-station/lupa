"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { InlineEditableField } from "@/components/elements/inline-editable-field";
import { InlineEditableFolder } from "@/components/elements/inline-editable-folder";
import { InlineEditableRefreshSettings } from "@/components/elements/inline-editable-refresh-settings";
import { InlineEditableTextarea } from "@/components/elements/inline-editable-textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { RefreshFrequency } from "@/db";
import { DocumentCollection } from "@/db/collections";
import { useMarkdown } from "@/hooks/use-markdown";
import type { ContentProps } from "./props";

export function DocumentViewerContent({
  projectId,
  folder,
  document,
  latestSnapshot,
}: ContentProps) {
  const router = useRouter();
  const { slug } = useParams<{
    slug: string;
  }>();

  const handleUpdateName = React.useCallback(
    (name: string) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.name = name;
        doc.updated_at = new Date().toISOString();
      });
    },
    [document],
  );

  const handleUpdateDescription = React.useCallback(
    (description: string | null) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.description = description;
        doc.updated_at = new Date().toISOString();
      });
    },
    [document],
  );

  const handleUpdateFolder = React.useCallback(
    (newFolder: string) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.folder = newFolder;
        doc.updated_at = new Date().toISOString();
      });
      const newUrl = `/orgs/${slug}/projects/${projectId}/documents${newFolder}${document.name}`;
      router.push(newUrl);
    },
    [router, projectId, document, slug],
  );

  const handleUpdateRefreshSettings = React.useCallback(
    (_enabled: boolean, frequency: RefreshFrequency | null) => {
      if (!document) return;
      DocumentCollection.update(document.id, (doc) => {
        doc.refresh_frequency = frequency;
        doc.updated_at = new Date().toISOString();
      });
    },
    [document],
  );

  const validateName = React.useCallback(
    (_name: string) => {
      if (!document)
        return {
          valid: false,
          message: "Document not found",
        };

      return {
        valid: true,
        message: undefined,
      };
    },
    [document],
  );

  const {
    data: markdown,
    isLoading: loading,
    isError,
  } = useMarkdown(latestSnapshot?.markdown_url);

  const backUrl = `/orgs/${slug}/projects/${projectId}/documents${folder}`;

  if (!document) {
    return (
      <div className="border-l flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p>Select a document to view</p>
      </div>
    );
  }

  if (!latestSnapshot) {
    return (
      <div className="border-l flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p>No snapshot available for this document</p>
        <Button variant="outline" asChild>
          <Link href={backUrl}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border-l space-y-2 pb-4">
      <div className="space-y-2 sticky top-0 bg-background pb-2 border-b mb-2 z-10">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <div className="flex items-center gap-2">
              <InlineEditableField
                value={document.name}
                onSave={handleUpdateName}
                onValidate={validateName}
                className="text-xl font-semibold"
                required
                sanitizeName
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <InlineEditableTextarea
              value={document.description}
              onSave={handleUpdateDescription}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Folder</Label>
            <InlineEditableFolder
              value={document.folder}
              onSave={handleUpdateFolder}
              projectId={projectId}
              className="text-sm"
            />
          </div>

          {latestSnapshot.type === "website" && (
            <div>
              <Label className="text-xs text-muted-foreground">
                Refresh Schedule
              </Label>
              <InlineEditableRefreshSettings
                refreshFrequency={document.refresh_frequency}
                onSave={handleUpdateRefreshSettings}
                className="text-sm"
              />
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Updated: {new Date(document.updated_at).toLocaleString()}
          </div>
        </div>

        <Separator />
      </div>

      <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-2">
        <div className="flex items-center gap-2">
          <Badge>{latestSnapshot.status}</Badge>
          <Badge variant="secondary">{latestSnapshot.type}</Badge>
          {latestSnapshot.type === "website" && latestSnapshot.url && (
            <>
              <span>•</span>
              <a
                href={latestSnapshot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {latestSnapshot.url}
              </a>
            </>
          )}
          <span>•</span>
          <span>{new Date(latestSnapshot.created_at).toLocaleString()}</span>
          {latestSnapshot.chunks_count && (
            <>
              <span>•</span>
              <span>{latestSnapshot.chunks_count} chunks</span>
            </>
          )}
          {latestSnapshot.tokens_count && (
            <>
              <span>•</span>
              <span>{latestSnapshot.tokens_count} tokens</span>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="raw" className="w-full">
        <div className="flex justify-between items-center mb-2">
          <TabsList>
            <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
            <TabsTrigger value="rendered">Rendered</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="raw" className="mt-0">
          <div className="border rounded-lg bg-muted/50 max-h-[calc(100vh-28.5rem)] overflow-auto">
            <div className="p-4">
              {loading && (
                <p className="text-sm text-muted-foreground">
                  Loading content...
                </p>
              )}
              {!loading && markdown && (
                <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                  {markdown}
                </pre>
              )}
              {!loading && !markdown && !isError && (
                <p className="text-sm text-muted-foreground">
                  No content available
                </p>
              )}
              {isError && (
                <p className="text-sm text-red-600">Failed to load content</p>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="rendered" className="mt-0">
          <div className="border rounded-lg bg-muted/50 max-h-[calc(100vh-28.5rem)] overflow-auto">
            <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
              {loading && (
                <p className="text-sm text-muted-foreground">
                  Loading content...
                </p>
              )}
              {!loading && markdown && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdown}
                </ReactMarkdown>
              )}
              {!loading && !markdown && !isError && (
                <p className="text-sm text-muted-foreground">
                  No content available
                </p>
              )}
              {isError && (
                <p className="text-sm text-red-600">Failed to load content</p>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="metadata" className="mt-0">
          <div className="border rounded-lg bg-muted/50 max-h-[calc(100vh-28.5rem)] overflow-auto">
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Snapshot Metadata
                </h3>
                <pre className="text-xs whitespace-pre font-mono overflow-x-auto">
                  {JSON.stringify(latestSnapshot.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
