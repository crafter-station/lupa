// This wrapper enables the SignInButton to be loaded dynamically on the client-side only (disables SSR).
"use client";

import dynamic from "next/dynamic";

// The SignInButton is dynamically imported to ensure it only renders on the client,
// but im not sure if it's necessary since we are using ClerkProvider in the layout.tsx file. TODO: check with @Railly
export const SignInButton = dynamic(
  () =>
    import("./sign-in-button").then((mod) => ({ default: mod.SignInButton })),
  { ssr: false },
);
