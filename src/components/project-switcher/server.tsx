import { db } from "@/db";
import * as schema from "@/db/schema";
import { ProjectSwitcherClient } from "./client";

export const ProjectSwitcherServer = async () => {
  const projects = await db.select().from(schema.Project);

  return <ProjectSwitcherClient preloadedProjects={projects} />;
};
