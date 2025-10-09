"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type * as React from "react";

import { CollectionsProvider } from "./collections";
import { FolderDocumentVersionProvider } from "./folder-document-version";

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <FolderDocumentVersionProvider>
        <CollectionsProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </QueryClientProvider>
        </CollectionsProvider>
      </FolderDocumentVersionProvider>
    </NuqsAdapter>
  );
}
