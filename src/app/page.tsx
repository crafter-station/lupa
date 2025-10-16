import Link from "next/link";
import { StaticCodeBlock } from "@/components/elements/static-code-block";
import { ClerkIcon } from "@/components/icons/clerk";
import { GlobantIcon } from "@/components/icons/globant";
import { KeboIcon } from "@/components/icons/kebo";
import { YunoIcon } from "@/components/icons/yuno";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { highlightCode } from "@/lib/highlight";

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
        const res = await fetch(
          \`https://lupa.build/api/search?projectId=\${projectId}&deploymentId=\${deploymentId}&query=\${query}\`
        );
        return res.json();
      }
    }),
    'get-snapshot-contents': tool({
      description: 'Get full document content',
      parameters: z.object({ snapshotId: z.string() }),
      execute: async ({ snapshotId }) => {
        const res = await fetch(
          \`https://lupa.build/api/snapshots/\${snapshotId}\`
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
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono font-bold">
              L
            </div>
            <span className="text-lg font-semibold">Lupa</span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="https://docs.lupa.build"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Docs
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </a>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              Alpha
            </Badge>
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              The Knowledge Platform for AI Agents
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Semantic search and full document retrieval APIs for building
              production RAG systems. From chunks to complete context in
              milliseconds.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/projects">Start Building</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://docs.lupa.build"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Docs
                </a>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="rounded-lg border border-border bg-card shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-card">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  agent.ts
                </span>
              </div>
              <StaticCodeBlock
                html={agentCodeHtml}
                code={AGENT_CODE}
                className="border-0 rounded-none"
              />
            </div>
            <div className="absolute -right-4 -top-4 rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow-lg">
              AI SDK compatible
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/30 py-16">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Used by engineers at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
              <div className="flex h-12 w-32 items-center justify-center">
                <ClerkIcon className="size-24 scale-120 fill-foreground" />
              </div>
              <div className="flex -mb-2 items-center justify-center">
                <YunoIcon className="size-32 fill-foreground" />
              </div>
              <div className="flex h-12 w-32 items-center justify-center">
                <KeboIcon className="h-32 mb-5 fill-foreground" />
              </div>
              <div className="flex h-12 w-32 items-center justify-center">
                <GlobantIcon className="h-32 scale-110 -mb-1 fill-foreground" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-3">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg
                    className="h-6 w-6"
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
                <h3 className="mb-2 text-xl font-semibold">
                  Semantic search API
                </h3>
                <p className="text-muted-foreground">
                  Vector search returns ranked chunks with similarity scores.
                  Find relevant content across your knowledge base in under
                  50ms. Perfect for discovery and quick answers.
                </p>
              </div>

              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg
                    className="h-6 w-6"
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
                <h3 className="mb-2 text-xl font-semibold">
                  Full document retrieval
                </h3>
                <p className="text-muted-foreground">
                  Get complete markdown content of any document snapshot.
                  Multi-step agents use search to find, then retrieve full
                  context for comprehensive answers.
                </p>
              </div>

              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <svg
                    className="h-6 w-6"
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
                <h3 className="mb-2 text-xl font-semibold">
                  Production analytics
                </h3>
                <p className="text-muted-foreground">
                  Monitor agent queries, document hits, zero-result searches,
                  and retrieval performance. Optimize your RAG pipeline with
                  real-time insights.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                More powerful APIs coming soon: list files in a directory,
                filter by folder, filter by metadata, and more
              </p>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">
                Two APIs, unlimited possibilities
              </h2>
              <p className="text-muted-foreground">
                Combine semantic search with full document retrieval for
                production-grade RAG systems
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    1
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">
                      Agent searches knowledge base
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Search API returns top 5 semantic matches with scores and
                      metadata. Agent identifies relevant documents by
                      snapshotId.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    2
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">
                      Retrieve full document context
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      When same snapshotId appears in multiple results, agent
                      fetches complete markdown content for comprehensive
                      analysis.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    3
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">
                      Reasoning produces accurate answers
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      With OpenAI Responses reasoning and complete document
                      context, agents provide thorough, well-informed answers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <StaticCodeBlock
                  html={ragCodeHtml}
                  code={RAG_CODE}
                  className="border-0 rounded-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-24">
          <div className="container mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold">Build smarter AI agents</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join engineering teams building production AI agents with Lupa
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/projects">Get API Keys</Link>
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

      <footer className="border-t border-border py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground font-mono">
                  L
                </div>
                <span className="font-semibold">Lupa</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The Knowledge Platform for AI Agents
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://docs.lupa.build"
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
              <h4 className="mb-4 text-sm font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm">
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
              <h4 className="mb-4 text-sm font-semibold">Company</h4>
              <ul className="space-y-2 text-sm">
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

          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lupa. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
