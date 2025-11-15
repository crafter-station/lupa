import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Bot, FileText, Key, Rocket, Search, Workflow } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { SidebarNavLinkServer } from "@/components/elements/sidebar-nav-link-server";
import { SidebarToggleButton } from "@/components/elements/sidebar-toggle-button";
import { LupaIcon } from "@/components/icons/lupa";
import { LupaFullIcon } from "@/components/icons/lupa-full";
import { ProjectSwitcher } from "@/components/project-switcher";
import { Separator } from "@/components/ui/separator";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; projectId: string }>;
}) {
  "use cache";

  const { slug, projectId } = await params;

  const baseUrl = `/orgs/${slug}/projects/${projectId}`;

  return (
    <div
      id="app-layout"
      className="group/layout flex h-screen overflow-hidden"
      data-sidebar-collapsed="true"
    >
      <aside className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-[width] duration-300 flex flex-col z-50 w-56 group-data-[sidebar-collapsed=true]/layout:w-10">
        <div className="flex-1 overflow-y-auto py-2">
          <div className="space-y-1.5 mb-2">
            <div className="h-7 flex items-center relative overflow-hidden">
              <div className="flex items-center justify-center w-10 shrink-0 ml-0.5">
                <Link href="/" className="flex items-center justify-center">
                  <LupaIcon className="size-7" />
                </Link>
              </div>

              <div className="flex items-center gap-2 transition-opacity duration-300 absolute left-10 opacity-100 group-data-[sidebar-collapsed=true]/layout:opacity-0 group-data-[sidebar-collapsed=true]/layout:pointer-events-none">
                <Link href="/" className="flex items-center">
                  <LupaFullIcon className="h-6" />
                </Link>
                <SidebarToggleButton variant="expanded" />
              </div>
            </div>

            <SidebarToggleButton variant="collapsed" />
            <div className="h-9 opacity-100 transition-opacity duration-300 group-data-[sidebar-collapsed=true]/layout:opacity-0 group-data-[sidebar-collapsed=true]/layout:pointer-events-none">
              <ProjectSwitcher org_slug={slug} />
            </div>
          </div>

          <Separator className="mb-2" />

          <nav className="space-y-0.5">
            <SidebarNavLinkServer
              href={`${baseUrl}/documents`}
              icon={FileText}
              label="Documents"
            />
            <SidebarNavLinkServer
              href={`${baseUrl}/deployments`}
              icon={Rocket}
              label="Deployments"
            />
            <SidebarNavLinkServer
              href={`${baseUrl}/ai-playground`}
              icon={Bot}
              label="AI Playground"
            />
            <SidebarNavLinkServer
              href={`${baseUrl}/search-playground`}
              icon={Search}
              label="Search Playground"
            />
            <SidebarNavLinkServer
              href={`${baseUrl}/mcp-playground`}
              icon={Workflow}
              label="MCP Playground"
            />
            <Separator />
            <SidebarNavLinkServer
              href={`${baseUrl}/api-keys`}
              icon={Key}
              label="API Keys"
            />
          </nav>
        </div>

        <div className="py-1.5 border-t border-sidebar-border">
          <div className="flex items-center justify-between gap-2 space-y-2 opacity-100 transition-opacity duration-300 group-data-[sidebar-collapsed=true]/layout:opacity-0 group-data-[sidebar-collapsed=true]/layout:hidden">
            <Suspense>
              <OrganizationSwitcher
                afterCreateOrganizationUrl="/orgs/:slug/projects"
                afterSelectOrganizationUrl="/orgs/:slug/projects"
              />
            </Suspense>
            <Suspense>
              <UserButton />
            </Suspense>
          </div>

          <div className="hidden justify-center group-data-[sidebar-collapsed=true]/layout:flex">
            <UserButton />
          </div>
        </div>
      </aside>
      <main
        id="main-content"
        data-collapsed="false"
        className="flex-1 overflow-y-auto transition-all duration-300 ml-56 group-data-[sidebar-collapsed=true]/layout:ml-10"
      >
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
