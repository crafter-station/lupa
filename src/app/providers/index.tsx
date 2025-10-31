import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { ClientProviders } from "./client";

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <NuqsAdapter>
      <ClientProviders>
        {children}
        <Toaster />
      </ClientProviders>
    </NuqsAdapter>
  );
};
