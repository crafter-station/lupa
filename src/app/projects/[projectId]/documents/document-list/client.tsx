"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { FileText, Folder } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
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
                <TableRow>
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
                </TableRow>
              )}
              {items.map((item) => {
                if (item.type === "folder") {
                  const folderUrl = `/projects/${projectId}/documents${item.path}`;
                  return (
                    <TableRow key={item.path}>
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
                    </TableRow>
                  );
                }

                const documentUrl = `/projects/${projectId}/documents${currentFolder}doc:${item.document.id}`;
                return (
                  <TableRow
                    key={item.document.id}
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
                  </TableRow>
                );
              })}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
