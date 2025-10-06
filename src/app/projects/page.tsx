import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateProject } from "./create-project";
import { ProjectList } from "./project-list";

export const revalidate = 60;

export default async function ProjectsPage() {
  const preloadedProjects = await db.select().from(schema.Project);

  return (
    <>
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProject />
      </div>
      <ProjectList preloadedProjects={preloadedProjects} />
    </>
  );
}
