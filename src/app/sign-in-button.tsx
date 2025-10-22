"use client";

import { useSession } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SignInButton() {
  const { isSignedIn } = useSession();

  if (isSignedIn)
    return (
      <Button variant="outline" className="w-24" asChild>
        <Link href="/app">Build</Link>
      </Button>
    );

  return (
    <Button variant="outline" className="w-24" asChild>
      <a
        href={`${process.env.NEXT_PUBLIC_CLERK_ACCOUNTS_DOMAIN}/sign-in`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Sign in
      </a>
    </Button>
  );
}
