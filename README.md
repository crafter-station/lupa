# Lupa

**The Knowledge API for AI Agents**

Lupa is a production-ready RAG (Retrieval-Augmented Generation) infrastructure that gives AI agents instant access to your knowledge base. Built with semantic search, intelligent document parsing, and real-time observability.

## Contributors

<a href="https://github.com/crafter-station/lupa/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=crafter-station/lupa" />
</a>

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
# Run the dev server (with Turbopack)
bun run dev

# Build for production
bun run build

# Run linting (Biome)
bun run lint

# Format code (Biome)
bun run format

# Generate OpenAPI docs
bun run docs
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Trigger.dev Background Jobs

```bash
# Run Trigger.dev dev server
bunx trigger.dev@latest dev

# View jobs dashboard
open https://cloud.trigger.dev
```

**Available tasks:**
- `parse-document` - Parse uploaded files into markdown chunks
- `process-snapshot` - Process website snapshots or uploaded documents
- `deploy` - Build and deploy snapshots to vector indexes
- `refetch-website` - Scheduled task to refresh website documents

### Database Setup

```bash
# Generate migration
bun drizzle-kit generate

# Push schema to database
bun drizzle-kit push
```

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router (Turbopack)
- **React 19** - UI library with Server/Client Components
- **Tailwind CSS 4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Component library
- **TanStack React Query** - Server state management
- **TanStack Electric DB** - Real-time data sync with live queries
- **nuqs** - Type-safe URL search params

### Backend & Database
- **Drizzle ORM** - Type-safe database queries with PostgreSQL
- **Neon PostgreSQL** - Serverless Postgres with pgvector extension
- **Upstash Vector** - Serverless vector database for embeddings
- **Upstash Redis** - Serverless Redis for caching and metadata
- **Clerk** - Authentication & user management with webhooks
- **Trigger.dev v4** - Background job orchestration with schedules
- **Tinybird** - Real-time analytics with 90-day retention

### AI & Parsing
- **OpenAI** - Embeddings (text-embedding-3-small) and chat (GPT-5 Responses)
- **Vercel AI SDK** - AI framework integration with streaming
- **LlamaParse** - Advanced document parsing (PDF, DOCX, XLSX, PPTX, etc.)
- **Firecrawl** - Web scraping and content extraction
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
Top-level organization unit. Each project contains documents and deployments. Projects can have multiple deployments for different environments (dev, staging, prod).

### Documents
Individual knowledge items. Can be:
- **File uploads**: PDF, DOCX, XLSX, PPTX, CSV, HTML, TXT
- **Website scrapes**: Scraped with Firecrawl and stored as markdown

Documents can be organized in folder hierarchies and include custom metadata schemas.

### Snapshots
Immutable versions of documents. Each document can have multiple snapshots:
- **Initial snapshot**: Created on upload/scrape
- **Refresh snapshots**: Auto-created on scheduled refreshes (for websites)
- **Status tracking**: `queued`, `running`, `success`, `error`
- **Change detection**: Compares content to detect updates

### Deployments
Vector indexes that serve search queries. Each deployment:
- Contains embeddings from one or more snapshots
- Has a unique Upstash Vector index
- Tracks build status: `queued`, `building`, `ready`, `error`
- Can be updated by linking new snapshots (zero-downtime)

### Embeddings
Text chunks embedded using OpenAI's `text-embedding-3-small`:
- Stored in deployment-specific Upstash Vector indexes
- Include metadata: `documentId`, `snapshotId`, `chunkIndex`
- Queried via semantic similarity search

### Document Refresh Scheduling
Automatic updates for web-scraped documents:
- **Frequencies**: `daily`, `weekly`, `monthly`
- **Cron-based**: Scheduled via Trigger.dev
- **Auto-cleanup**: Schedules deleted when replacing website with file upload
- **Change detection**: Compares new content with previous snapshots

## API Usage

### Search API

```typescript
// GET /api/search/:projectId/:deploymentId/:query
const response = await fetch(
  `/api/search/${projectId}/${deploymentId}/${encodeURIComponent(query)}`,
  {
    headers: {
      'Authorization': `Bearer ${API_KEY}` // Clerk auth
    }
  }
);

const data = await response.json();
// {
//   query: string,
//   results: [{
//     id: string | number,
//     score: number,
//     data: string | null,
//     metadata: {
//       documentId: string,
//       snapshotId: string,
//       chunkIndex: number
//     }
//   }]
// }
```

### Chat API (with RAG)

```typescript
// POST /api/chat/:projectId/:deploymentId
const response = await fetch(
  `/api/chat/${projectId}/${deploymentId}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'What is the refund policy?' }
      ],
      model: 'gpt-5' // or 'gpt-4o'
    })
  }
);

// Returns a streaming response with tool calls to search-knowledge
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
bunx drizzle-kit generate

# Apply migrations
bunx drizzle-kit push

# Open Drizzle Studio (DB GUI)
bunx drizzle-kit studio
```

### Analytics with Tinybird

```bash
# Navigate to Tinybird directory
cd src/tinybird

# Deploy datasources and pipes
tb --cloud deploy

# Test a pipe locally
tb pipe test requests_timeseries.pipe --param project_id=proj_123
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
