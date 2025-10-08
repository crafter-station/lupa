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

import type { DeploymentSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";

import type { DeploymentListLoadingContextProps } from "./index";

export function DeploymentListLiveQuery({
  preloadedDeployments,
}: DeploymentListLoadingContextProps) {
  const { projectId } = useParams<{ projectId: string }>();

  const { DeploymentCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ deployment: DeploymentCollection })
      .select(({ deployment }) => ({ ...deployment }))
      .where(({ deployment }) => eq(deployment.project_id, projectId)),
  );

  const deployments = React.useMemo(() => {
    const data = status === "ready" ? freshData : preloadedDeployments;
    return [...data];
  }, [status, freshData, preloadedDeployments]);

  return <DeploymentListContent deployments={deployments} />;
}

export function DeploymentListContent({
  deployments,
}: {
  deployments: DeploymentSelect[];
}) {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Changes Detected</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments
            .toSorted(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell>
                  <Link
                    href={`/projects/${projectId}/deployments/${deployment.id}`}
                    className="font-medium hover:underline"
                  >
                    {deployment.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      deployment.status === "ready"
                        ? "bg-green-50 text-green-700 ring-green-600/20"
                        : deployment.status === "building"
                          ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                          : deployment.status === "queued"
                            ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                            : deployment.status === "error"
                              ? "bg-red-50 text-red-700 ring-red-600/20"
                              : "bg-gray-50 text-gray-700 ring-gray-600/20"
                    }`}
                  >
                    {deployment.status}
                  </span>
                </TableCell>
                <TableCell>
                  {deployment.changes_detected ? "Yes" : "No"}
                </TableCell>
                <TableCell>
                  {new Date(deployment.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  {new Date(deployment.updated_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
