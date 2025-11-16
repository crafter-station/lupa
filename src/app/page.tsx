import Link from "next/link";
import { HeroBackground } from "@/components/elements/hero-background";
import { StaticCodeBlock } from "@/components/elements/static-code-block";
import { ThemeSwitcherMultiButton } from "@/components/elements/theme-switcher-multi-button";
import { ClerkIcon } from "@/components/icons/clerk";
import { GlobantIcon } from "@/components/icons/globant";
import { KeboIcon } from "@/components/icons/kebo";
import { LupaFullIcon } from "@/components/icons/lupa-full";
import { YunoIcon } from "@/components/icons/yuno";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { highlightCode } from "@/lib/highlight";
import { rootDomain } from "@/lib/utils";
import { SignInButton } from "./sign-in-button-wrapper";

const FOOTER_YEAR = 2025;

const AGENT_CODE = `import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = streamText({
  model: openai.responses('gpt-5'),
  tools: {
    'search-knowledge': tool({
      description: 'Search knowledge base, returns chunks',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const res = await fetch(\`https://${rootDomain}/api/search\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            deploymentId,
            query
          })
        });
        return res.json();
      }
    }),
    'get-snapshot-contents': tool({
      description: 'Get full document content',
      parameters: z.object({ snapshotId: z.string() }),
      execute: async ({ snapshotId }) => {
        const res = await fetch(
          \`https://${rootDomain}/api/snapshots/\${snapshotId}\`
        );
        return res.text();
      }
    })
  }
});`;

const RAG_CODE = `// Multi-step RAG with reasoning
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

const result = streamText({
  model: openai.responses('gpt-5'),
  providerOptions: {
    openai: {
      reasoningEffort: 'low',
      reasoningSummary: 'detailed'
    }
  },
  tools: {
    'search-knowledge': searchTool,
    'get-snapshot-contents': getSnapshotTool
  },
  stopWhen: stepCountIs(15)
});

// Agent workflow:
// 1. User asks question
// 2. Agent searches knowledge base
// 3. Agent sees snapshotId repeated in results
// 4. Agent retrieves full document content
// 5. Agent reasons over complete context
// 6. Agent provides comprehensive answer`;

export default async function Home() {
  const agentCodeHtml = await highlightCode(AGENT_CODE, "typescript");
  const ragCodeHtml = await highlightCode(RAG_CODE, "typescript");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="px-2 py-0 items-center">
            <LupaFullIcon className="size-16  md:size-18" />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-6">
            <a
              href={`https://docs.${rootDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
            <a
              href="#pricing"
              className="hidden sm:inline text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </a>
            <SignInButton />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full px-4 py-12 sm:py-16 md:py-24 sm:px-6 lg:px-8 overflow-hidden">
          <HeroBackground />

          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 animate-fade-in-up">
              Alpha
            </Badge>
            <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl animate-fade-in-up animation-delay-100">
              The Knowledge Platform for{" "}
              <span className="bg-gradient-to-r from-[#80a665] via-[#4d9375] to-[#5eaab5] dark:from-[#80a665] dark:via-[#4d9375] dark:to-[#5eaab5] bg-clip-text text-transparent animate-gradient">
                AI Agents
              </span>
            </h1>
            <p className="mb-8 text-base sm:text-lg lg:text-xl text-muted-foreground animate-fade-in-up animation-delay-200">
              Keep your knowledge base fresh with automatic syncing. Search with
              semantic precision. Serve complete context to your agents. All in
              one platform built for production RAG systems.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-fade-in-up animation-delay-300">
              <Button size="lg" asChild className="group">
                <a
                  href={`${process.env.NEXT_PUBLIC_CLERK_ACCOUNTS_DOMAIN}/waitlist`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join the Waitlist
                  <span className="ml-2 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href={`https://docs.${rootDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Docs
                </a>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto mt-12 sm:mt-16 max-w-5xl animate-fade-in-up animation-delay-400">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-lg blur-lg animate-pulse-glow" />
            <div className="relative rounded-lg border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-3 sm:px-4 py-2 sm:py-3 bg-card">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-500" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-[10px] sm:text-xs text-muted-foreground font-mono">
                  agent.ts
                </span>
              </div>
              <StaticCodeBlock
                html={agentCodeHtml}
                code={AGENT_CODE}
                className="border-0 rounded-none"
              />
            </div>
            <div className="absolute -right-2 sm:-right-4 -top-2 sm:-top-4 rounded-md bg-primary px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-105">
              AI SDK compatible
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 py-12 sm:py-16">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-6 sm:mb-8 text-center text-xs sm:text-sm text-muted-foreground animate-fade-in">
              Used by engineers at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
              <div className="flex h-10 w-24 sm:h-12 sm:w-32 items-center justify-center transition-all hover:scale-110 animate-fade-in animation-delay-100">
                <ClerkIcon className="h-20 w-20 sm:size-24 scale-120 fill-foreground" />
              </div>
              <div className="flex -mb-2 items-center justify-center transition-all hover:scale-110 animate-fade-in animation-delay-200">
                <YunoIcon className="h-24 w-24 sm:size-32 fill-foreground" />
              </div>
              <div className="flex h-10 w-24 sm:h-12 sm:w-32 items-center justify-center transition-all hover:scale-110 animate-fade-in animation-delay-300">
                <KeboIcon className="h-24 sm:h-32 mb-5 fill-foreground" />
              </div>
              <div className="flex h-10 w-24 sm:h-12 sm:w-32 items-center justify-center transition-all hover:scale-110 animate-fade-in animation-delay-400">
                <GlobantIcon className="h-24 sm:h-32 scale-110 -mb-1 fill-foreground" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-gradient-to-br from-primary/5 via-background to-accent/5 py-12 sm:py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 sm:mb-16 text-center">
              <h2 className="mb-4 text-2xl sm:text-3xl font-bold animate-fade-in-up">
                Built for Builders Who've Been There
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground animate-fade-in-up animation-delay-100">
                Stop fighting your knowledge base. Start building.
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
              <div className="group relative animate-fade-in-up animation-delay-200">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-accent/50 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-300" />
                <div className="relative flex flex-col h-full rounded-lg border border-border bg-card p-6 shadow-sm">
                  <svg
                    className="mb-4 h-8 w-8 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <title>Quote</title>
                    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
                  </svg>
                  <blockquote className="mb-4 flex-1 text-base sm:text-lg">
                    "Set it to refresh daily and forget about it. My docs are
                    always up-to-date without any manual work."
                  </blockquote>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    — AI Engineer at YC Startup
                  </p>
                </div>
              </div>

              <div className="group relative animate-fade-in-up animation-delay-300">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/50 to-primary/50 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-300" />
                <div className="relative flex flex-col h-full rounded-lg border border-border bg-card p-6 shadow-sm">
                  <svg
                    className="mb-4 h-8 w-8 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <title>Quote</title>
                    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
                  </svg>
                  <blockquote className="mb-4 flex-1 text-base sm:text-lg">
                    "Search results come back in under 50ms. Our users actually
                    notice the difference."
                  </blockquote>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    — Full-stack Developer, Enterprise SaaS
                  </p>
                </div>
              </div>

              <div className="group relative animate-fade-in-up animation-delay-400">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-accent/50 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-300" />
                <div className="relative flex flex-col h-full rounded-lg border border-border bg-card p-6 shadow-sm">
                  <svg
                    className="mb-4 h-8 w-8 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <title>Quote</title>
                    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
                  </svg>
                  <blockquote className="mb-4 flex-1 text-base sm:text-lg">
                    "I've built RAG systems before. This is the first one that
                    didn't make me want to pull my hair out."
                  </blockquote>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    — Senior Engineer at AI Startup
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative border-t border-border py-12 sm:py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-accent/5 via-transparent to-primary/5" />

          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:gap-12 md:grid-cols-2 lg:grid-cols-4">
              <div className="group animate-fade-in-up animation-delay-100">
                <div className="mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Sync Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg sm:text-xl font-semibold">
                  Automatic sync
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Schedule daily, weekly, or monthly refreshes for websites.
                  Upload new file versions anytime. Changes are automatically
                  detected, processed, and deployed. Your knowledge stays fresh
                  without manual work.
                </p>
              </div>

              <div className="group animate-fade-in-up animation-delay-150">
                <div className="mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Search Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg sm:text-xl font-semibold">
                  Semantic search
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Vector search returns ranked chunks with similarity scores in
                  under 50ms. Find relevant content across your entire knowledge
                  base. Perfect for discovery and quick answers.
                </p>
              </div>

              <div className="group animate-fade-in-up animation-delay-200">
                <div className="mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Document Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg sm:text-xl font-semibold">
                  Full document retrieval
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Get complete markdown content of any document snapshot.
                  Multi-step agents search to discover, then retrieve full
                  context for comprehensive, accurate answers.
                </p>
              </div>

              <div className="group animate-fade-in-up animation-delay-300">
                <div className="mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-110">
                  <svg
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <title>Charts</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg sm:text-xl font-semibold">
                  Production analytics
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Monitor query patterns, document hits, zero-result searches,
                  and performance metrics. Optimize your RAG pipeline with
                  real-time insights powered by Tinybird.
                </p>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 text-center animate-fade-in animation-delay-400">
              <p className="text-xs sm:text-sm text-muted-foreground px-4">
                Already syncing automatically. Coming soon: advanced filtering,
                metadata search, and folder-level operations
              </p>
            </div>
          </div>
        </section>

        <section className="relative border-t border-border py-12 sm:py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-accent/5 via-transparent to-primary/5" />

          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="mb-4 text-2xl sm:text-3xl font-bold animate-fade-in-up">
                Complete workflow: Sync, Search, Serve
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground animate-fade-in-up animation-delay-100 px-4">
                From automatic updates to intelligent retrieval. Your knowledge
                base works for you, not the other way around.
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
              <div className="space-y-3 sm:space-y-4 animate-fade-in-up animation-delay-200">
                <div className="flex items-start gap-3 sm:gap-4 group">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-110">
                    1
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm sm:text-base font-semibold">
                      Knowledge stays fresh automatically
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Set refresh schedules for websites or upload new file
                      versions. Lupa detects changes, processes content, and
                      updates your deployments without manual intervention.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 group">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-110">
                    2
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm sm:text-base font-semibold">
                      Agents search with semantic precision
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Search API returns top 5 semantic matches with scores in
                      under 50ms. Agent identifies relevant documents by
                      snapshotId for deeper analysis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:gap-4 group">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-semibold text-primary-foreground transition-transform group-hover:scale-110">
                    3
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm sm:text-base font-semibold">
                      Full context drives accurate answers
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      When needed, agents fetch complete document content for
                      comprehensive reasoning. With full context and OpenAI
                      Responses, they deliver thorough, well-informed answers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-in-up animation-delay-300">
                <StaticCodeBlock
                  html={ragCodeHtml}
                  code={RAG_CODE}
                  className="border-0 rounded-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative border-t border-border py-12 sm:py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 animate-gradient" />

          <div className="container mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-2xl sm:text-3xl font-bold animate-fade-in-up">
              Build smarter AI agents
            </h2>
            <p className="mb-8 text-base sm:text-lg text-muted-foreground animate-fade-in-up animation-delay-100 px-4">
              Join engineering teams building production AI agents with Lupa
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center animate-fade-in-up animation-delay-200">
              <Button size="lg" asChild className="group">
                <a
                  href={`${process.env.NEXT_PUBLIC_CLERK_ACCOUNTS_DOMAIN}/waitlist`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join the Waitlist
                  <span className="ml-2 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com/crafter-station/lupa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 sm:py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid grid-cols-1 gap-1">
              <LupaFullIcon className="size-24 h-8" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                The Knowledge Platform for AI Agents
              </p>
              <ThemeSwitcherMultiButton />
            </div>

            <div>
              <h4 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold">
                Product
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a
                    href={`https://docs.${rootDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#changelog"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Changelog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold">
                Resources
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a
                    href="#blog"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#examples"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Examples
                  </a>
                </li>
                <li>
                  <a
                    href="#status"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Status
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-3 sm:mb-4 text-xs sm:text-sm font-semibold">
                Company
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li>
                  <a
                    href="#about"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/crafter-station/lupa"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://twitter.com"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Twitter
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 sm:mt-12 border-t border-border pt-6 sm:pt-8 text-center text-xs sm:text-sm text-muted-foreground">
            © {FOOTER_YEAR} Lupa. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
