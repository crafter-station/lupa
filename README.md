# Lupa

**The Knowledge API for AI Agents**

Lupa is a production-ready RAG (Retrieval-Augmented Generation) infrastructure that gives AI agents instant access to your knowledge base. Built with semantic search, intelligent document parsing, and real-time observability.

🔍 **Semantic Search**: pgvector-powered retrieval with <50ms P95 latency  
📄 **Smart Parsing**: Automatic chunking for PDF, DOCX, XLSX, CSV, HTML, and more  
📊 **Agent Observability**: Track queries, relevance scores, and retrieval patterns  
🔄 **Version Control**: Snapshot-based deployments with zero-downtime updates  
⏰ **Auto-Refresh**: Schedule automatic updates for web-scraped documents (daily, weekly, monthly)  

## Features

- **RAG-Optimized Retrieval**: Semantic vector search built for LLM context augmentation
- **Multi-Format Parsing**: Support for PDF, Word, Excel, PowerPoint, CSV, HTML, and text documents
- **Real-Time Sync**: TanStack Electric for live data synchronization across clients
- **Versioned Knowledge**: Snapshot system for rolling updates and rollbacks
- **Automatic Refresh**: Schedule periodic updates for web-scraped documents to keep knowledge current
- **Analytics Pipeline**: Tinybird-powered observability for search performance and content analytics
- **AI Framework Ready**: Drop-in integration with Vercel AI SDK, LangChain, and more

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 20+
- PostgreSQL (we recommend [Neon](https://neon.tech))
- [Clerk](https://clerk.dev) account for authentication
- [Trigger.dev](https://trigger.dev) account for background jobs

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/lupa.git
cd lupa

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# TanStack Electric (Real-time sync)
ELECTRIC_URL="wss://..."
ELECTRIC_TOKEN="..."

# Upstash (Vector storage & Redis)
UPSTASH_VECTOR_REST_URL="https://..."
UPSTASH_VECTOR_REST_TOKEN="..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# OpenAI (Embeddings)
OPENAI_API_KEY="sk-..."

# Trigger.dev (Background jobs)
TRIGGER_SECRET_KEY="..."

# LlamaParse (Document parsing)
LLAMA_CLOUD_API_KEY="..."

# Firecrawl (Web scraping - optional)
FIRECRAWL_API_KEY="..."

# Tinybird (Analytics - optional)
TINYBIRD_TOKEN="p...."

# Vercel Blob (File storage)
BLOB_READ_WRITE_TOKEN="..."
```

### Development

```bash
# Run the dev server
bun run dev

# Run linting
bun run lint

# Format code
bun run format
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Database Setup

```bash
# Generate migration
bun drizzle-kit generate

# Push schema to database
bun drizzle-kit push
```

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Component library
- **TanStack React Query** - Data fetching
- **TanStack Electric** - Real-time data sync

### Backend
- **Drizzle ORM** - Type-safe database queries
- **Neon PostgreSQL** - Serverless Postgres with pgvector
- **Upstash Vector** - Serverless vector database
- **Upstash Redis** - Serverless Redis for caching
- **Clerk** - Authentication & user management
- **Trigger.dev** - Background job orchestration
- **Tinybird** - Real-time analytics

### AI & Parsing
- **OpenAI** - Embeddings generation (text-embedding-3-small)
- **LlamaParse** - Advanced document parsing
- **Firecrawl** - Web scraping and extraction
- **Vercel AI SDK** - AI framework integration
- **tokenlens** - Token counting utilities

## Project Structure

```
lupa/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── analytics/    # Tinybird analytics endpoints
│   │   │   ├── chat/         # AI chat interface
│   │   │   ├── collections/  # TanStack Electric collections
│   │   │   ├── documents/    # Document upload endpoints
│   │   │   └── search/       # Vector search API
│   │   ├── projects/         # Project management UI
│   │   └── providers/        # React context providers
│   ├── components/           # React components
│   │   ├── ai-elements/     # AI-specific UI components
│   │   ├── elements/        # Custom elements
│   │   ├── icons/           # Icon components
│   │   └── ui/              # shadcn/ui components
│   ├── db/                  # Database layer
│   │   ├── collections/     # TanStack Electric collections
│   │   └── schema/          # Drizzle schema definitions
│   ├── lib/                 # Utilities
│   │   ├── parsers/        # Document parsing system
│   │   ├── crypto.ts       # Encryption utilities
│   │   ├── electric.ts     # Real-time sync config
│   │   ├── tinybird.ts     # Analytics logging
│   │   ├── vector.ts       # Vector operations
│   │   └── utils.ts        # General utilities
│   ├── tinybird/           # Tinybird analytics config
│   │   ├── datasources/   # Data source definitions
│   │   └── pipes/         # Analytics pipes
│   └── trigger/           # Background jobs
│       ├── deploy.task.ts         # Snapshot deployment
│       ├── parse-document.task.ts # Document parsing
│       └── process-snapshot.task.ts # Snapshot processing
├── drizzle/               # Database migrations
├── public/               # Static assets
└── labs/                # Experimental code
```

## Core Concepts

### Projects
Organize your documents and knowledge bases. Each project can have multiple deployments.

### Documents
Files uploaded to Lupa (PDF, DOCX, etc.). Automatically parsed and embedded.

### Snapshots
Versioned collections of documents. Create snapshots to freeze a document set.

### Deployments
Connect snapshots to search endpoints. Update deployments to roll out new knowledge versions.

### Embeddings
Vector representations of document chunks, stored in Upstash Vector for semantic search.

### Document Refresh Scheduling
Configure automatic updates for web-scraped documents. Set documents to refresh daily, weekly, or monthly to keep your knowledge base current without manual intervention. Schedules are managed via Trigger.dev and automatically cleaned up when documents are replaced with file uploads.

## API Usage

### Search API

```typescript
// GET /api/search/:projectId/:deploymentId/:query
const response = await fetch(
  `https://api.lupa.dev/v1/search/${projectId}/${deploymentId}/${encodeURIComponent(query)}`,
  {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  }
);

const results = await response.json();
// { results: [{ content, similarity, metadata }] }
```

### Vercel AI SDK Integration

```typescript
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = streamText({
  model: openai('gpt-4o'),
  tools: {
    searchKnowledge: tool({
      description: 'Search company knowledge base',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const res = await fetch(
          `https://api.lupa.dev/v1/search/proj/dep/${query}`,
          { headers: { 'Authorization': 'Bearer <token>' } }
        );
        return res.json();
      }
    })
  }
});
```

### LangChain Integration

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const searchTool = new DynamicStructuredTool({
  name: "search_knowledge",
  description: "Search company knowledge base",
  schema: z.object({ query: z.string() }),
  func: async ({ query }) => {
    const res = await fetch(
      `https://api.lupa.dev/v1/search/proj/dep/${query}`,
      { headers: { Authorization: 'Bearer <token>' } }
    );
    return JSON.stringify(await res.json());
  }
});
```

## Analytics

Lupa includes a comprehensive analytics pipeline powered by Tinybird. See [ANALYTICS.md](./ANALYTICS.md) for full documentation.

**Available Metrics:**
- Request volume and latency
- Success/error rates
- Top queries and zero-result searches
- Document/snapshot retrieval patterns
- Relevance score distributions
- Per-deployment and project-wide analytics

## Document Parsing

Lupa's parsing system is extensible and parser-agnostic. See [src/lib/parsers/README.md](./src/lib/parsers/README.md) for full documentation.

**Supported Formats:**
- PDF, Word (DOC/DOCX), Excel (XLS/XLSX)
- PowerPoint (PPT/PPTX), CSV, HTML, TXT
- Extensible architecture for custom parsers

## Development

### Code Style
- TypeScript strict mode
- Biome for linting and formatting (runs on pre-commit)
- 2-space indentation
- Path aliases: `@/*` for `src/*`

### Git Hooks
- **pre-commit**: Runs `bun run lint` automatically
- **commit-msg**: Enforces commit message format

### Database Migrations

```bash
# Generate migration from schema changes
bun drizzle-kit generate

# Apply migrations
bun drizzle-kit push

# Open Drizzle Studio (DB GUI)
bun drizzle-kit studio
```

### Background Jobs

```bash
# Run Trigger.dev dev server
bun trigger dev

# View jobs dashboard
open https://cloud.trigger.dev
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
vercel
```

### Environment Variables
Ensure all required environment variables are set in your deployment platform.

### Database
Use a managed PostgreSQL provider with pgvector support:
- [Neon](https://neon.tech) (recommended)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Coming soon
- **Issues**: [GitHub Issues](https://github.com/crafter-station/lupa/issues)
- **Twitter**: [@LupaAPI](https://twitter.com/lupaapi)

## Acknowledgments

Built with incredible open-source tools:
- [Next.js](https://nextjs.org) by Vercel
- [Drizzle ORM](https://orm.drizzle.team)
- [TanStack](https://tanstack.com)
- [Radix UI](https://radix-ui.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Trigger.dev](https://trigger.dev)
- [Tinybird](https://tinybird.co)

---

Made with ❤️ by the Lupa team
