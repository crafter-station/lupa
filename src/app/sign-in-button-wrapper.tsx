"use client";

import dynamic from "next/dynamic";

export const SignInButton = dynamic(
  () =>
    import("./sign-in-button").then((mod) => ({ default: mod.SignInButton })),
  { ssr: false },
);
