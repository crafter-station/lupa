"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { EnvironmentBadge } from "@/components/elements/environment-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeploymentSelect } from "@/db";
import { DeploymentCollection } from "@/db/collections";

import type { DeploymentListLoadingContextProps } from "./index";

export function DeploymentListLiveQuery({
  preloadedDeployments,
}: DeploymentListLoadingContextProps) {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ deployment: DeploymentCollection })
      .select(({ deployment }) => ({ ...deployment }))
      .where(({ deployment }) => eq(deployment.project_id, projectId)),
  );

  const deployments = React.useMemo(() => {
    if (status !== "ready") {
      return [...preloadedDeployments];
    }

    const lastDeploymentFresh = freshData.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[freshData.length - 1];
    const lastDeploymentPreloaded = preloadedDeployments.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[preloadedDeployments.length - 1];

    if (
      new Date(lastDeploymentFresh.updated_at).getTime() >
      new Date(lastDeploymentPreloaded.updated_at).getTime()
    ) {
      return [...freshData];
    } else {
      return [...preloadedDeployments];
    }
  }, [status, freshData, preloadedDeployments]);

  return <DeploymentListContent deployments={deployments} />;
}

export function DeploymentListContent({
  deployments,
}: {
  deployments: DeploymentSelect[];
}) {
  const { projectId, slug } = useParams<{ projectId: string; slug: string }>();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="hidden lg:table-cell">ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-8"
              >
                No deployments yet. Create your first deployment to get started.
              </TableCell>
            </TableRow>
          ) : (
            deployments
              .toSorted(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              )
              .map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>
                    <Link
                      href={`/orgs/${slug}/projects/${projectId}/deployments/${deployment.id}`}
                      className="font-medium hover:underline"
                    >
                      {deployment.name}
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
                    <EnvironmentBadge environment={deployment.environment} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {new Date(deployment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {deployment.id}
                    </code>
                  </TableCell>
                </TableRow>
              ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
