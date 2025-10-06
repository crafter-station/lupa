"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
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

export function DocumentList({
  preloadedDocuments,
}: {
  preloadedDocuments: DocumentSelect[];
}) {
  const { projectId } = useParams<{ projectId: string }>();

  const { DocumentCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document }))
      .where(({ document }) => eq(document.project_id, projectId)),
  );

  const documents = React.useMemo(() => {
    const data = status === "ready" ? freshData : preloadedDocuments;
    return [...data].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [status, freshData, preloadedDocuments]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <Link
                  href={`/projects/${projectId}/documents/${document.id}`}
                  className="font-medium hover:underline"
                >
                  {document.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {document.description}
              </TableCell>
              <TableCell>
                {new Date(document.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                {new Date(document.updated_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
