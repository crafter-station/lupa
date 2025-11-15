"use client";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectSelect } from "@/db/schema";
import { cn } from "@/lib/utils";

export function ProjectSwitcherContent({
  projects,
}: {
  projects: ProjectSelect[];
}) {
  const params = useParams<{ slug: string; projectId?: string }>();
  const router = useRouter();

  const handleProjectChange = React.useCallback(
    (projectId: string) => {
      if (projectId && projectId !== params.projectId) {
        router.push(`/orgs/${params.slug}/projects/${projectId}`);
      }
    },
    [router, params],
  );

  return (
    <Select value={params.projectId} onValueChange={handleProjectChange}>
      <SelectTrigger className={cn("w-full justify-between -mt-9")}>
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
