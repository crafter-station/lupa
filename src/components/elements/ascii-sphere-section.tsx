"use client";

import dynamic from "next/dynamic";

const AsciiSphere = dynamic(
  () =>
    import("@/components/elements/ascii-sphere").then((mod) => mod.AsciiSphere),
  { ssr: false },
);

export function AsciiSphereSection() {
  return (
    <section className="relative py-24 overflow-hidden border-t border-border">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-primary/5 to-background">
        <AsciiSphere />
      </div>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold animate-fade-in-up">
            Built for Modern AI Workflows
          </h2>
          <p className="text-lg text-muted-foreground animate-fade-in-up animation-delay-100 max-w-2xl mx-auto">
            Designed for production RAG systems with real-time updates,
            comprehensive analytics, and seamless integration with your favorite
            AI frameworks.
          </p>
        </div>
      </div>
    </section>
  );
}
