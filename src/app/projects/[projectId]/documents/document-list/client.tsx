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
import { eq, useLiveQuery } from "@tanstack/react-db";
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
import type { DocumentSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
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

export function DocumentList({
  preloadedDocuments,
}: {
  preloadedDocuments: DocumentSelect[];
}) {
  const { projectId } = useParams<{
    projectId: string;
    path?: string[];
  }>();

  const { folder: currentFolder, documentId } = useFolderDocumentVersion();

  const { DocumentCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document }))
      .where(({ document }) => eq(document.project_id, projectId)),
  );

  const allDocuments = React.useMemo(() => {
    return status === "ready" ? freshData : preloadedDocuments;
  }, [status, freshData, preloadedDocuments]);

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
                            documentId
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
