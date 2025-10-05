"use client";

import { useLiveQuery } from "@tanstack/react-db";
import Link from "next/link";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BucketSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";

export function BucketList({
  preloadedBuckets,
}: {
  preloadedBuckets: BucketSelect[];
}) {
  const { BucketCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ bucket: BucketCollection })
      .select(({ bucket }) => ({ ...bucket })),
  );

  const buckets = React.useMemo(() => {
    const data = status === "ready" ? freshData : preloadedBuckets;
    return [...data].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [status, freshData, preloadedBuckets]);

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
          {buckets.map((bucket) => (
            <TableRow key={bucket.id}>
              <TableCell>
                <Link
                  href={`/buckets/${bucket.id}`}
                  className="font-medium hover:underline"
                >
                  {bucket.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {bucket.description}
              </TableCell>
              <TableCell>
                {new Date(bucket.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                {new Date(bucket.updated_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
