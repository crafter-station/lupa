import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ClientProviders } from "./client";

export const Providers = ({ children }: { children: ReactNode }) => {
  return (
    <ClientProviders>
      {children}
      <Toaster />
    </ClientProviders>
  );
};
