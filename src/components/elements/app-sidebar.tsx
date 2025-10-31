"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  Key,
  Rocket,
  Search,
  Settings,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LupaIcon } from "@/components/icons/lupa";
import { LupaFullIcon } from "@/components/icons/lupa-full";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "./project-switcher";
import { SidebarNavLink } from "./sidebar-nav-link";

const STORAGE_KEY = "lupa-sidebar-collapsed";

export function AppSidebar() {
  const params = useParams<{ slug: string; projectId?: string }>();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem(STORAGE_KEY, String(newState));
  };

  const baseUrl = params.projectId
    ? `/orgs/${params.slug}/projects/${params.projectId}`
    : `/orgs/${params.slug}/projects`;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col z-50",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {!collapsed ? (
            <>
              <Link href="/" className="flex items-center px-1">
                <LupaFullIcon className="h-6" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapsed}
                className="size-7 shrink-0"
              >
                <ChevronLeft className="size-4" />
              </Button>
            </>
          ) : (
            <Link href="/" className="flex items-center justify-center w-full">
              <LupaIcon className="size-7" />
            </Link>
          )}
        </div>

        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="w-full h-7"
          >
            <ChevronRight className="size-4" />
          </Button>
        )}

        {params.projectId && (
          <>
            <ProjectSwitcher collapsed={collapsed} />
            <Separator />
          </>
        )}

        {params.projectId && (
          <nav className="space-y-0.5">
            <SidebarNavLink
              href={`${baseUrl}/documents`}
              icon={FileText}
              label="Documents"
              collapsed={collapsed}
            />
            <SidebarNavLink
              href={`${baseUrl}/ai-playground`}
              icon={Bot}
              label="AI Playground"
              collapsed={collapsed}
            />
            <SidebarNavLink
              href={`${baseUrl}/search-playground`}
              icon={Search}
              label="Search Playground"
              collapsed={collapsed}
            />
            <SidebarNavLink
              href={`${baseUrl}/mcp-playground`}
              icon={Workflow}
              label="MCP Playground"
              collapsed={collapsed}
            />
            <Separator />
            <SidebarNavLink
              href={`${baseUrl}/settings`}
              icon={Settings}
              label="Settings"
              collapsed={collapsed}
            />
            <SidebarNavLink
              href={`${baseUrl}/api-keys`}
              icon={Key}
              label="API Keys"
              collapsed={collapsed}
            />
            <SidebarNavLink
              href={`${baseUrl}/deployments`}
              icon={Rocket}
              label="Deployments"
              collapsed={collapsed}
            />
          </nav>
        )}
      </div>

      <div
        className={cn(
          "p-2 border-t border-sidebar-border",
          !collapsed && "space-y-2",
        )}
      >
        {!collapsed ? (
          <div className="flex items-center justify-between gap-2">
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/orgs/:slug/projects"
              afterSelectOrganizationUrl="/orgs/:slug/projects"
            />
            <UserButton />
          </div>
        ) : (
          <div className="flex justify-center">
            <UserButton />
          </div>
        )}
      </div>
    </aside>
  );
}
