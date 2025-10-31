"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SidebarNavLinkProps = {
  href: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
};

export function SidebarNavLink({
  href,
  icon: Icon,
  label,
  collapsed,
}: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all hover:bg-sidebar-accent",
        isActive &&
          "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
        collapsed && "justify-center",
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
