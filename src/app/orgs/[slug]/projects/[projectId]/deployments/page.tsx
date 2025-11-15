import { eq } from "drizzle-orm";
import Link from "next/link";
import { EnvironmentBadge } from "@/components/elements/environment-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateDeployment } from "./create-deployment";

export default async function DeploymentsPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  "use cache";

  const { slug, projectId } = await params;

  const deployments = await db
    .select()
    .from(schema.Deployment)
    .where(eq(schema.Deployment.project_id, projectId));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deployment environments
          </p>
        </div>
        <CreateDeployment />
      </div>
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
