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
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Folder, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DocumentSelect, SnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { fetchMarkdown } from "@/hooks/use-markdown";
import { cn } from "@/lib/utils";
import type { DocumentListLoadingContextProps } from "./index";

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

export function DocumentListLiveQuery({
  preloadedDocuments,
  preloadedSnapshots,
}: DocumentListLoadingContextProps) {
  const { projectId } = useParams<{
    projectId: string;
    path?: string[];
  }>();

  const { DocumentCollection, SnapshotCollection } = useCollections();

  const { data: freshDocuments, status: documentsStatus } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document }))
      .where(({ document }) => eq(document.project_id, projectId)),
  );

  const allDocuments = React.useMemo(() => {
    const data =
      documentsStatus === "ready" ? freshDocuments : preloadedDocuments;
    return [...data];
  }, [documentsStatus, freshDocuments, preloadedDocuments]);

  const { data: freshSnapshots, status: snapshotsStatus } = useLiveQuery((q) =>
    q
      .from({ snapshot: SnapshotCollection })
      .select(({ snapshot }) => ({ ...snapshot }))
      .where(({ snapshot }) =>
        inArray(
          snapshot.document_id,
          allDocuments.map((d) => d.id),
        ),
      ),
  );

  const allSnapshots = React.useMemo(() => {
    const data =
      snapshotsStatus === "ready" ? freshSnapshots : preloadedSnapshots;
    return [...data];
  }, [snapshotsStatus, freshSnapshots, preloadedSnapshots]);

  return (
    <DocumentListContent documents={allDocuments} snapshots={allSnapshots} />
  );
}

export function DocumentListContent({
  documents: allDocuments,
  snapshots: allSnapshots,
}: {
  documents: DocumentSelect[];
  snapshots: SnapshotSelect[];
}) {
  const { projectId } = useParams<{
    projectId: string;
    path?: string[];
  }>();

  const { DocumentCollection } = useCollections();

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
      });
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

  const items = React.useMemo(() => {
    const folders = new Set<string>();
    const documentsInPath: DocumentSelect[] = [];

    for (const doc of allDocuments) {
      const docFolder = doc.folder;

      if (docFolder === currentFolder) {
        documentsInPath.push(doc);
      } else if (
        docFolder.startsWith(currentFolder) &&
        docFolder !== currentFolder
      ) {
        const relativePath = docFolder.slice(currentFolder.length);
        const nextSegment = relativePath.split("/")[0];
        if (nextSegment) {
          folders.add(nextSegment);
        }
      }
    }

    const result: ListItem[] = [];

    for (const folderName of Array.from(folders).sort()) {
      result.push({
        type: "folder",
        name: folderName,
        path: `${currentFolder}${folderName}/`,
      });
    }

    for (const doc of documentsInPath.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )) {
      result.push({
        type: "document",
        document: doc,
      });
    }

    return result;
  }, [allDocuments, currentFolder]);

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
              <TableHead className="w-1/4">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-1/4">Created</TableHead>
              <TableHead className="w-1/4">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
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
                        href={`/projects/${projectId}/documents/${currentFolder.split("/").slice(1, -2).join("/")}`}
                        className="font-medium hover:underline flex items-center gap-2"
                      >
                        <Folder className="h-4 w-4" />
                        ..
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      Folder
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </DroppableFolderRow>
                )}
                {items.map((item) => {
                  if (item.type === "folder") {
                    const folderUrl = `/projects/${projectId}/documents${item.path}`;
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
                        <TableCell className="text-muted-foreground">
                          Folder
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                      </DroppableFolderRow>
                    );
                  }

                  const documentUrl = `/projects/${projectId}/documents${currentFolder}doc:${item.document.id}`;
                  const isUpdating = updatingDocuments.has(item.document.id);
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
                              ? `/projects/${projectId}/documents${currentFolder}`
                              : documentUrl
                          }
                          className="font-medium hover:underline flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          {item.document.name}
                        </Link>
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
