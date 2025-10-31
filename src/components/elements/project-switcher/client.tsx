"use client";

import { useLiveQuery } from "@tanstack/react-db";
import { useParams, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectCollection } from "@/db/collections";
import type { ProjectSelect } from "@/db/schema";
import { cn } from "@/lib/utils";

import type { ProjectSwitcherProps } from "./index";

export function ProjectSwitcherLiveQuery({ collapsed }: ProjectSwitcherProps) {
  const { data: projects = [] } = useLiveQuery((q) =>
    q
      .from({ project: ProjectCollection })
      .select(({ project }) => ({ ...project })),
  );

  return <ProjectSwitcherContent projects={projects} collapsed={collapsed} />;
}

export function ProjectSwitcherContent({
  projects,
  collapsed,
}: {
  projects: ProjectSelect[];
  collapsed: boolean;
}) {
  const params = useParams<{ slug: string; projectId?: string }>();
  const router = useRouter();

  const handleProjectChange = (projectId: string) => {
    router.push(`/orgs/${params.slug}/projects/${projectId}`);
  };

  if (collapsed) {
    return null;
  }

  return (
    <Select value={params.projectId} onValueChange={handleProjectChange}>
      <SelectTrigger className={cn("w-full justify-between")}>
        <SelectValue placeholder="Select project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
