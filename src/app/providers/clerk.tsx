import { ClerkProvider as ClerkProviderNative } from "@clerk/nextjs";
import { shadcn } from "@clerk/themes";
import { Suspense } from "react";

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense>
      <ClerkProviderNative
        appearance={{
          theme: shadcn,
        }}
      >
        {children}
      </ClerkProviderNative>
    </Suspense>
  );
};
