import Link from "next/link";
import { ClerkIcon } from "@/components/icons/clerk";
import { GlobantIcon } from "@/components/icons/globant";
import { KeboIcon } from "@/components/icons/kebo";
import { YunoIcon } from "@/components/icons/yuno";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
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
              href="#docs"
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
              Search your documents in milliseconds
            </h1>
            <p className="mb-8 text-xl text-muted-foreground">
              Vector search API that just works. Upload documents, get search
              endpoints. No infrastructure, no complexity.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/projects">Start Building</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#docs">View Docs</a>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="rounded-lg border border-border bg-card p-4 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs text-muted-foreground font-mono">
                  search.ts
                </span>
              </div>
              <pre className="overflow-x-auto p-4 text-sm">
                <code className="font-mono text-foreground">
                  {`const response = await fetch(
  'https://api.lupa.dev/v1/search/proj_abc/dep_xyz/refund policy',
  { headers: { 'Authorization': 'Bearer <token>' } }
);

const results = await response.json();
// {
//   results: [
//     {
//       content: "Refunds are processed within 5-7 business days...",
//       similarity: 0.94,
//       metadata: { title: "Refund Policy", page: 3 }
//     }
//   ],
//   took_ms: 12
// }`}
                </code>
              </pre>
            </div>
            <div className="absolute -right-4 -top-4 rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow-lg">
              12ms response time
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
                    <title>Flash Icon</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Fast by default</h3>
                <p className="text-muted-foreground">
                  Average p95 latency under 50ms. Vector search optimized with
                  pgvector and Redis caching. No cold starts.
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
                  Any document format
                </h3>
                <p className="text-muted-foreground">
                  PDF, DOCX, Markdown, HTML, plain text. Automatic parsing and
                  chunking with LlamaParse integration.
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
                  Built-in analytics
                </h3>
                <p className="text-muted-foreground">
                  Query patterns, relevance scores, latency tracking. Powered by
                  Tinybird for real-time insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">
                Deploy and iterate in seconds
              </h2>
              <p className="text-muted-foreground">
                Snapshot your document collections, deploy with zero downtime
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    1
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Upload documents</h4>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop files or use the API. Automatic parsing and
                      embedding generation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    2
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Create snapshot</h4>
                    <p className="text-sm text-muted-foreground">
                      Freeze your document set into a versioned snapshot.
                      Rollback anytime.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    3
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Deploy to production</h4>
                    <p className="text-sm text-muted-foreground">
                      Zero-downtime deployment with instant activation. Monitor
                      performance in real-time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <pre className="overflow-x-auto text-sm">
                  <code className="font-mono text-foreground">
                    {`// Create a deployment
const deployment = await fetch(
  'https://api.lupa.dev/v1/deployments',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer <token>',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: 'proj_abc',
      snapshot_id: 'snap_xyz'
    })
  }
);

// Live in seconds
// GET /search/proj_abc/dep_123/query`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-24">
          <div className="container mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-4 text-3xl font-bold">Start building today</h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Join engineering teams using Lupa in production
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/projects">Get API Keys</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com"
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
                Vector search API for developers
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#docs"
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
                    href="https://github.com"
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
