import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { LupaFullIcon } from "@/components/icons/lupa-full";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="px-2 py-0 items-center">
            <LupaFullIcon className="size-16" />
          </Link>
          <nav className="flex gap-2">
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/orgs/:slug/projects"
              afterSelectOrganizationUrl="/orgs/:slug/projects"
            />
            <UserButton />
          </nav>
        </div>
      </header>

      <main className="flex-grow">{children}</main>
    </div>
  );
}
