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
import type { SourceSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";

export function SourceList({
  preloadedSources,
}: {
  preloadedSources: SourceSelect[];
}) {
  const { bucketId } = useParams<{ bucketId: string }>();

  const { SourceCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ source: SourceCollection })
      .select(({ source }) => ({ ...source }))
      .where(({ source }) => eq(source.bucket_id, bucketId)),
  );

  const sources = React.useMemo(() => {
    const data = status === "ready" ? freshData : preloadedSources;
    return [...data].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [status, freshData, preloadedSources]);

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
          {sources.map((source) => (
            <TableRow key={source.id}>
              <TableCell>
                <Link
                  href={`/buckets/${bucketId}/sources/${source.id}`}
                  className="font-medium hover:underline"
                >
                  {source.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {source.description}
              </TableCell>
              <TableCell>
                {new Date(source.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {new Date(source.updated_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
