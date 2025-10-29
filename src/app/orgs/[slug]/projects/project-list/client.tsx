"use client";

import { useLiveQuery } from "@tanstack/react-db";
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
import type { ProjectSelect } from "@/db";
import { ProjectCollection } from "@/db/collections";
import type { ProjectListLoadingContextProps } from "./index";

export function ProjectListLiveQuery({
  preloadedProjects,
}: ProjectListLoadingContextProps) {
  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project })),
  );

  const projects = React.useMemo(() => {
    if (status !== "ready") {
      return [...preloadedProjects];
    }

    if (freshData.length === 0) return [];
    if (preloadedProjects.length === 0) return [...freshData];

    const lastFresh = freshData.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[freshData.length - 1];

    const lastPreloaded = preloadedProjects.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[preloadedProjects.length - 1];

    if (
      new Date(lastFresh.updated_at).getTime() >
      new Date(lastPreloaded.updated_at).getTime()
    ) {
      return [...freshData];
    }
    return [...preloadedProjects];
  }, [status, freshData, preloadedProjects]);

  return <ProjectListContent projects={projects} />;
}

export function ProjectListContent({
  projects,
}: {
  projects: ProjectSelect[];
}) {
  const { slug } = useParams<{ slug: string }>();

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
          {projects
            .toSorted(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Link
                    href={`/orgs/${slug}/projects/${project.id}`}
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
