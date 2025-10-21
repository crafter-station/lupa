// This wrapper enables the SignInButton to be loaded dynamically on the client-side only (disables SSR).
"use client";

import dynamic from "next/dynamic";

// The SignInButton is dynamically imported to ensure it only renders on the client,
// as Clerk session/context hooks rely on client environment.
export const SignInButton = dynamic(
  () =>
    import("./sign-in-button").then((mod) => ({ default: mod.SignInButton })),
  { ssr: false },
);
