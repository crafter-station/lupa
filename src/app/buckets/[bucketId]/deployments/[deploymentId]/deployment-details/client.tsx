"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { useParams } from "next/navigation";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DeploymentSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { SearchPlayground } from "../search-playground";

export function DeploymentDetails({
  preloadedDeployment,
}: {
  preloadedDeployment: DeploymentSelect;
}) {
  const { deploymentId } = useParams<{ deploymentId: string }>();

  const { DeploymentCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ deployment: DeploymentCollection })
      .select(({ deployment }) => ({ ...deployment }))
      .where(({ deployment }) => eq(deployment.id, deploymentId)),
  );

  const deployment = React.useMemo(() => {
    const data = status === "ready" ? freshData : [preloadedDeployment];
    return data[0];
  }, [status, freshData, preloadedDeployment]);

  if (!deployment) {
    return <div>Deployment not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deployment Details</h1>
        <p className="text-sm text-muted-foreground">{deployment.id}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Current deployment status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
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
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Changes Detected:</span>
                  <span className="text-sm">
                    {deployment.changes_detected ? "Yes" : "No"}
                  </span>
                </div>
                {deployment.vector_index_id && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Vector Index ID:
                    </span>
                    <span className="text-sm">
                      {deployment.vector_index_id}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
              <CardDescription>Creation and update information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Created:</span>
                  <span className="text-sm">
                    {new Date(deployment.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Updated:</span>
                  <span className="text-sm">
                    {new Date(deployment.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Endpoint</CardTitle>
              <CardDescription>Try the search in your app</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <code className="block rounded bg-muted p-2 text-xs break-all">
                  GET https://www.lupa.build/api/search?q=peru&deploymentId=
                  {deployment.id}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
        {deployment.status === "ready" && (
          <SearchPlayground deploymentId={deployment.id} />
        )}
      </div>
    </div>
  );
}
