import { eq } from "drizzle-orm";
import { clerk } from "@/clients/clerk";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ProjectSwitcherContent } from "./content";

export const ProjectSwitcher = async ({ org_slug }: { org_slug: string }) => {
  const org = await clerk.organizations.getOrganization({
    slug: org_slug,
  });

  const projects = await db
    .select()
    .from(schema.Project)
    .where(eq(schema.Project.org_id, org.id));

  return <ProjectSwitcherContent projects={projects} />;
};
