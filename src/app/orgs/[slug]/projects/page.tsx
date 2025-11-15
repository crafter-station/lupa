import { eq } from "drizzle-orm";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { clerk } from "@/clients/clerk";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateProject } from "./create-project";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  "use cache";
  const { slug } = await params;

  const org = await clerk.organizations.getOrganization({
    slug: slug,
  });

  const projects = await db
    .select()
    .from(schema.Project)
    .where(eq(schema.Project.org_id, org.id));

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProject />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {projects.map((project) => (
          <div key={project.id} className="p-4 border rounded-lg">
            <div className="flex flex-col justify-between h-full">
              <div>
                <h2 className="text-lg font-semibold">{project.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {project.description?.slice(0, 100)}
                </p>
              </div>
              <Link
                href={`/orgs/${slug}/projects/${project.id}/documents`}
                className="px-2 py-1 rounded-lg bg-muted flex gap-2 items-center text-xs justify-end w-max ml-auto hover:bg-primary hover:text-primary-foreground transition-all"
              >
                View Project <ArrowRightIcon className="size-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
