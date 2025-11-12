"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Folder, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { InlineEditableFolder } from "@/components/elements/inline-editable-folder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DocumentSelect, SnapshotSelect } from "@/db";
import { DocumentCollection } from "@/db/collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { fetchMarkdown } from "@/hooks/use-markdown";
import { cn } from "@/lib/utils";

type FolderItem = {
  type: "folder";
  name: string;
  path: string;
};

type DocumentItem = {
  type: "document";
  document: DocumentSelect;
};

type ListItem = FolderItem | DocumentItem;

function DraggableDocumentRow({
  document,
  children,
  className,
  isUpdating,
}: {
  document: DocumentSelect;
  children: React.ReactNode;
  className?: string;
  isUpdating: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: document.id,
    data: { document },
  });

  return (
    <TableRow
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(className, {
        "opacity-50 cursor-grabbing": isDragging,
        "cursor-grab": !isDragging && !isUpdating,
        "opacity-70": isUpdating,
      })}
    >
      {children}
      {isUpdating && (
        <TableCell className="absolute right-2">
          <Loader2 className="h-4 w-4 animate-spin" />
        </TableCell>
      )}
    </TableRow>
  );
}

function DroppableFolderRow({
  folderPath,
  children,
}: {
  folderPath: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: folderPath,
    data: { folderPath },
  });

  return (
    <TableRow
      ref={setNodeRef}
      className={cn("transition-all duration-150", {
        "bg-blue-50 dark:bg-blue-950 scale-[1.01]": isOver,
      })}
    >
      {children}
    </TableRow>
  );
}

export function DocumentListContent({
  documents: allDocuments,
  snapshots: allSnapshots,
}: {
  documents: DocumentSelect[];
  snapshots: SnapshotSelect[];
}) {
  const { projectId, slug } = useParams<{
    projectId: string;
    slug: string;
  }>();
  const router = useRouter();

  const { folder: currentFolder, documentId } = useFolderDocumentVersion();
  const queryClient = useQueryClient();

  const [activeDocument, setActiveDocument] =
    React.useState<DocumentSelect | null>(null);
  const [updatingDocuments, setUpdatingDocuments] = React.useState<Set<string>>(
    new Set(),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const document = allDocuments.find((doc) => doc.id === active.id);
    if (document) {
      setActiveDocument(document);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDocument(null);

    if (!over || active.id === over.id) {
      return;
    }

    const documentId = active.id as string;
    const targetFolder = over.id as string;

    const document = allDocuments.find((doc) => doc.id === documentId);
    if (!document || document.folder === targetFolder) {
      return;
    }

    setUpdatingDocuments((prev) => new Set(prev).add(documentId));

    try {
      DocumentCollection.update(documentId, (doc) => {
        doc.folder = targetFolder;
        doc.updated_at = new Date().toISOString();
      });
      const newUrl = `/orgs/${slug}/projects/${projectId}/documents${targetFolder}doc:${document.id}`;
      router.push(newUrl);
    } catch (error) {
      toast.error(
        `Failed to move document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setUpdatingDocuments((prev) => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  const folderDocuments = React.useMemo(() => {
    return allDocuments.filter((doc) => doc.folder === currentFolder);
  }, [allDocuments, currentFolder]);

  const folderSnapshots = React.useMemo(() => {
    const folderDocumentIds = new Set(folderDocuments.map((d) => d.id));
    return allSnapshots.filter((snapshot) =>
      folderDocumentIds.has(snapshot.document_id),
    );
  }, [allSnapshots, folderDocuments]);

  React.useEffect(() => {
    if (folderSnapshots.length === 0) return;

    const latestSnapshotsByDocument = new Map<string, SnapshotSelect>();

    for (const snapshot of folderSnapshots) {
      const existing = latestSnapshotsByDocument.get(snapshot.document_id);
      if (
        !existing ||
        new Date(snapshot.created_at) > new Date(existing.created_at)
      ) {
        latestSnapshotsByDocument.set(snapshot.document_id, snapshot);
      }
    }

    for (const snapshot of latestSnapshotsByDocument.values()) {
      if (snapshot.markdown_url) {
        const markdownUrl = snapshot.markdown_url;
        queryClient.prefetchQuery({
          queryKey: ["markdown", markdownUrl],
          queryFn: () => fetchMarkdown(markdownUrl),
          staleTime: 10 * 60 * 1000,
        });
      }
    }
  }, [folderSnapshots, queryClient]);

  const getLatestSnapshot = (documentId: string): SnapshotSelect | null => {
    const docSnapshots = allSnapshots.filter(
      (s) => s.document_id === documentId,
    );
    if (docSnapshots.length === 0) return null;

    return docSnapshots.reduce((latest, current) =>
      new Date(current.created_at) > new Date(latest.created_at)
        ? current
        : latest,
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/5">Name</TableHead>
              <TableHead className="w-1/6">Folder</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Created</TableHead>
              <TableHead className="w-32">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground"
                >
                  No documents or folders in this location
                </TableCell>
              </TableRow>
            ) : (
              <>
                {currentFolder.length > 1 && (
                  <DroppableFolderRow
                    folderPath={`${currentFolder.split("/").slice(0, -2).join("/")}/`}
                  >
                    <TableCell>
                      <Link
                        href={`/orgs/${slug}/projects/${projectId}/documents/${currentFolder.split("/").slice(1, -2).join("/")}`}
                        className="font-medium hover:underline flex items-center gap-2"
                      >
                        <Folder className="h-4 w-4" />
                        ..
                      </Link>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-muted-foreground">
                      Folder
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </DroppableFolderRow>
                )}
                {items.map((item) => {
                  if (item.type === "folder") {
                    const folderUrl = `/orgs/${slug}/projects/${projectId}/documents${item.path}`;
                    return (
                      <DroppableFolderRow
                        key={item.path}
                        folderPath={item.path}
                      >
                        <TableCell>
                          <Link
                            href={folderUrl}
                            className="font-medium hover:underline flex items-center gap-2"
                          >
                            <Folder className="h-4 w-4" />
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-muted-foreground">
                          Folder
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </DroppableFolderRow>
                    );
                  }

                  const documentUrl = `/orgs/${slug}/projects/${projectId}/documents${currentFolder}doc:${item.document.id}`;
                  const isUpdating = updatingDocuments.has(item.document.id);
                  const latestSnapshot = getLatestSnapshot(item.document.id);

                  return (
                    <DraggableDocumentRow
                      key={item.document.id}
                      document={item.document}
                      isUpdating={isUpdating}
                      className={cn({
                        "bg-muted": item.document.id === documentId,
                      })}
                    >
                      <TableCell>
                        <Link
                          href={
                            documentId === item.document.id
                              ? `/orgs/${slug}/projects/${projectId}/documents${currentFolder}`
                              : documentUrl
                          }
                          className="font-medium hover:underline flex items-center gap-2"
                        >
                          {latestSnapshot?.type === "website" ? (
                            <Globe className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                          {item.document.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <InlineEditableFolder
                          value={item.document.folder}
                          onSave={async (newFolder) => {
                            setUpdatingDocuments((prev) =>
                              new Set(prev).add(item.document.id),
                            );
                            try {
                              DocumentCollection.update(
                                item.document.id,
                                (doc) => {
                                  doc.folder = newFolder;
                                  doc.updated_at = new Date().toISOString();
                                },
                              );
                            } catch (error) {
                              toast.error(
                                `Failed to update folder: ${error instanceof Error ? error.message : "Unknown error"}`,
                              );
                              throw error;
                            } finally {
                              setUpdatingDocuments((prev) => {
                                const next = new Set(prev);
                                next.delete(item.document.id);
                                return next;
                              });
                            }
                          }}
                          documents={allDocuments}
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.document.description}
                      </TableCell>
                      <TableCell>
                        {documentId
                          ? new Date(
                              item.document.created_at,
                            ).toLocaleDateString()
                          : new Date(item.document.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {documentId
                          ? new Date(
                              item.document.updated_at,
                            ).toLocaleDateString()
                          : new Date(item.document.updated_at).toLocaleString()}
                      </TableCell>
                    </DraggableDocumentRow>
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>
      </div>
      <DragOverlay>
        {activeDocument ? (
          <div className="flex items-center gap-2 rounded-md bg-background border p-2 shadow-lg opacity-90">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{activeDocument.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
