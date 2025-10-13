"use client";

import { useLiveQuery } from "@tanstack/react-db";
import Link from "next/link";
import * as React from "react";

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

import type { TopDocumentsListProps } from "./index";

export function TopDocumentsListLiveQuery({
  topDocumentsData,
  preloadedDocuments,
}: TopDocumentsListProps) {
  const { DocumentCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document })),
  );

  const documents = React.useMemo(() => {
    const data = status === "ready" ? freshData : preloadedDocuments;
    return [...data] as DocumentSelect[];
  }, [status, freshData, preloadedDocuments]);

  return (
    <TopDocumentsListContent
      topDocumentsData={topDocumentsData}
      documents={documents}
    />
  );
}

export function TopDocumentsListContent({
  topDocumentsData,
  documents,
}: {
  topDocumentsData: TopDocumentsListProps["topDocumentsData"];
  documents: DocumentSelect[];
}) {
  const documentMap = React.useMemo(() => {
    return new Map(documents.map((doc) => [doc.id, doc]));
  }, [documents]);

  const getDocumentUrl = (document: DocumentSelect) => {
    const folderPath = document.folder === "/" ? "" : document.folder.slice(1);
    const pathSegments = folderPath
      ? `${folderPath}/doc:${document.id}`
      : `doc:${document.id}`;
    return `/projects/${document.project_id}/documents/${pathSegments}`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">#</TableHead>
          <TableHead>Document</TableHead>
          <TableHead className="text-right">Appears</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {topDocumentsData.map((item, index) => {
          const document = documentMap.get(item.document_id);
          const displayPath = document
            ? `${document.folder}${document.name}`
            : item.document_id;

          return (
            <TableRow key={item.document_id}>
              <TableCell className="font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate font-mono text-xs"
                title={displayPath}
              >
                {document ? (
                  <Link
                    href={getDocumentUrl(document)}
                    className="hover:underline"
                  >
                    {displayPath}
                  </Link>
                ) : (
                  displayPath
                )}
              </TableCell>
              <TableCell className="text-right">
                {item.total_appearances.toLocaleString()}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
