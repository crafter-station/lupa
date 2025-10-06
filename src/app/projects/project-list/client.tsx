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
import type { ProjectSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";

export function ProjectList({
  preloadedProjects,
}: {
  preloadedProjects: ProjectSelect[];
}) {
  const { ProjectCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project })),
  );

  const projects = React.useMemo(() => {
    const data = status === "ready" ? freshData : preloadedProjects;
    return [...data].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [status, freshData, preloadedProjects]);

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
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium hover:underline"
                >
                  {project.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {project.description}
              </TableCell>
              <TableCell>
                {new Date(project.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                {new Date(project.updated_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
