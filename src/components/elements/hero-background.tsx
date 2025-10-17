"use client";

import dynamic from "next/dynamic";

const AsciiSphere = dynamic(
  () =>
    import("@/components/elements/ascii-sphere").then((mod) => mod.AsciiSphere),
  { ssr: false },
);

export function HeroBackground() {
  return (
    <>
      <div className="absolute inset-0 -z-30 grid-pattern" />
      <div className="absolute inset-0 -z-20 opacity-20">
        <AsciiSphere />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-gradient" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
    </>
  );
}
