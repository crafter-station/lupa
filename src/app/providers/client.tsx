"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

// biome-ignore lint/style/noNonNullAssertion: convex url is not null
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </ConvexBetterAuthProvider>
  );
}
