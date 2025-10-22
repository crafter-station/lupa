import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { clerk } from "@/lib/clerk";
import { CreateProject } from "./create-project-wrapper";
import { ProjectList } from "./project-list";

export const revalidate = 30;

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const org = await clerk.organizations.getOrganization({
    slug: slug,
  });

  const preloadedProjects = await db
    .select()
    .from(schema.Project)
    .where(eq(schema.Project.org_id, org.id));

  return (
    <>
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProject />
      </div>
      <ProjectList preloadedProjects={preloadedProjects} />
    </>
  );
}
