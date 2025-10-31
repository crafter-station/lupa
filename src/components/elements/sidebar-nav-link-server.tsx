import type { LucideIcon } from "lucide-react";
import { SidebarNavLink } from "./sidebar-nav-link";

type SidebarNavLinkServerProps = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export function SidebarNavLinkServer({
  href,
  icon: Icon,
  label,
}: SidebarNavLinkServerProps) {
  return (
    <SidebarNavLink href={href} label={label}>
      <Icon className="size-4" />
    </SidebarNavLink>
  );
}
