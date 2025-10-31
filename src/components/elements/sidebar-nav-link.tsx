"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SidebarNavLinkProps = {
  href: string;
  label: string;
  children: React.ReactNode;
};

export function SidebarNavLink({ href, label, children }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md h-8 text-sm hover:bg-sidebar-accent relative overflow-hidden",
        isActive &&
          "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
      )}
      title={label}
    >
      <div className="flex items-center justify-center w-10 shrink-0">
        {children}
      </div>
      <span className="truncate transition-opacity duration-300 opacity-100 group-data-[sidebar-collapsed=true]/layout:opacity-0">
        {label}
      </span>
    </Link>
  );
}
