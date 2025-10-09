# Parser System Examples

Practical examples for using the document parsing system.

## Example 1: Simple File Upload and Parse

```typescript
// app/api/upload-document/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { parseDocumentTask } from "@/trigger/parse-document.task";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Upload to Vercel Blob
  const blob = await put(file.name, file, {
    access: "public",
  });

  // Trigger parsing
  const handle = await tasks.trigger(parseDocumentTask, {
    document: {
      id: crypto.randomUUID(),
      blobUrl: blob.url,
      filename: file.name,
      mimeType: file.type,
    },
    userId,
  });

  return NextResponse.json({
    blobUrl: blob.url,
    taskId: handle.id,
  });
}
```

## Example 2: React Component with File Upload

```typescript
// components/document-upload.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      toast.success("Document uploaded and parsing started");
      console.log("Task ID:", data.taskId);
      
      // Optionally poll for task completion
      await pollTaskStatus(data.taskId);
    } catch (error) {
      toast.error("Failed to upload document");
      console.error(error);
    } finally {
      setUploading(false);
    }
  }

  async function pollTaskStatus(taskId: string) {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`/api/task-status/${taskId}`);
      const data = await response.json();

      if (data.status === "completed") {
        toast.success("Document parsed successfully");
        return data.result;
      }

      if (data.status === "failed") {
        toast.error("Document parsing failed");
        throw new Error(data.error);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error("Parsing timed out");
  }

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".pdf,.docx,.xlsx,.csv,.txt"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={uploading}
      />
      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? "Uploading..." : "Upload Document"}
      </Button>
    </div>
  );
}
```

## Example 3: Server Action with Error Handling

```typescript
// app/actions/parse-document.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { tasks } from "@trigger.dev/sdk/v3";
import { parseDocumentTask } from "@/trigger/parse-document.task";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function uploadAndParseDocument(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string;
  const parsingInstruction = formData.get("parsingInstruction") as string | undefined;

  if (!file) {
    throw new Error("No file provided");
  }

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  try {
    // 1. Upload file to Vercel Blob
    const blob = await put(`documents/${file.name}`, file, {
      access: "public",
    });

    // 2. Create document record
    const [document] = await db
      .insert(schema.Document)
      .values({
        project_id: projectId,
        name: file.name,
        type: "file",
        source_url: blob.url,
        user_id: userId,
      })
      .returning();

    // 3. Create snapshot
    const [snapshot] = await db
      .insert(schema.Snapshot)
      .values({
        document_id: document.id,
        url: blob.url,
        status: "pending",
      })
      .returning();

    // 4. Trigger parsing task
    const handle = await tasks.trigger(parseDocumentTask, {
      document: {
        id: document.id,
        blobUrl: blob.url,
        filename: file.name,
        mimeType: file.type,
      },
      userId,
      parsingInstruction,
    });

    // 5. Wait for result (optional - could be async)
    const result = await handle.wait();

    // 6. Upload parsed markdown
    const markdownBlob = await put(
      `parsed/${snapshot.id}.md`,
      result.markdownContent,
      { access: "public" }
    );

    // 7. Update snapshot with results
    await db
      .update(schema.Snapshot)
      .set({
        status: "success",
        markdown_url: markdownBlob.url,
        metadata: {
          parser: result.parser,
          ...result.metadata,
        },
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Snapshot.id, snapshot.id));

    return {
      success: true,
      documentId: document.id,
      snapshotId: snapshot.id,
    };
  } catch (error) {
    console.error("Failed to parse document:", error);
    throw error;
  }
}
```

## Example 4: Custom Parser with Specific Instructions

```typescript
// Using custom parsing instructions per file type
import { parseDocument, getDefaultParsingInstruction } from "@/lib/parsers";

// Auto-detect instruction based on file type
const result1 = await parseDocument({
  document: {
    id: "doc-1",
    blobUrl: "https://example.com/spreadsheet.xlsx",
    filename: "data.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  userId: "user-123",
  // Will use: "Extract all data from the spreadsheet..."
});

// Custom instruction
const result2 = await parseDocument({
  document: {
    id: "doc-2",
    blobUrl: "https://example.com/report.pdf",
    filename: "report.pdf",
    mimeType: "application/pdf",
  },
  userId: "user-123",
  parsingInstruction: "Focus on extracting tables and numerical data. Ignore images and decorative elements.",
});

// Force specific parser
const result3 = await parseDocument({
  document: {
    id: "doc-3",
    blobUrl: "https://example.com/notes.txt",
    filename: "notes.txt",
    mimeType: "text/plain",
  },
  userId: "user-123",
  parserName: "simple-text", // Skip LlamaParse, use simple parser
});
```

## Example 5: Batch Processing Multiple Files

```typescript
// Process multiple files in parallel
async function processMultipleFiles(
  files: File[],
  projectId: string,
  userId: string
) {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      // Upload
      const blob = await put(`batch/${file.name}`, file, {
        access: "public",
      });

      // Create document
      const [document] = await db
        .insert(schema.Document)
        .values({
          project_id: projectId,
          name: file.name,
          type: "file",
          source_url: blob.url,
          user_id: userId,
        })
        .returning();

      // Trigger parsing (non-blocking)
      const handle = await tasks.trigger(parseDocumentTask, {
        document: {
          id: document.id,
          blobUrl: blob.url,
          filename: file.name,
          mimeType: file.type,
        },
        userId,
      });

      return {
        documentId: document.id,
        taskId: handle.id,
        filename: file.name,
      };
    })
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return { success: true, ...result.value };
    } else {
      return { 
        success: false, 
        filename: files[index].name, 
        error: result.reason 
      };
    }
  });
}
```

## Example 6: Parser Registry Management

```typescript
// Check available parsers
import { getDefaultRegistry } from "@/lib/parsers";

const registry = getDefaultRegistry();
const parsers = registry.listRegisteredParsers();

console.log("Available parsers:", parsers);
// [
//   { name: "llamaparse", supportedTypes: [...], priority: 10, enabled: true },
//   { name: "simple-text", supportedTypes: [...], priority: 5, enabled: true }
// ]

// Select parser for specific file
const parser = registry.selectParser("application/pdf", "document.pdf");
console.log("Selected parser:", parser?.name); // "llamaparse"

// Disable a parser temporarily
registry.unregister("llamaparse");

// Re-register with different priority
import { createLlamaParseParser } from "@/lib/parsers";
const llamaParser = createLlamaParseParser();
registry.register(llamaParser, {
  priority: 15,
  enabled: true,
});
```

## Example 7: Webhook for Task Completion

```typescript
// app/api/webhooks/task-completed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  if (payload.taskId && payload.status === "completed") {
    // Find associated snapshot by task metadata
    const documentId = payload.metadata?.documentId;
    
    const snapshots = await db
      .select()
      .from(schema.Snapshot)
      .where(eq(schema.Snapshot.document_id, documentId))
      .limit(1);

    if (snapshots.length) {
      const snapshot = snapshots[0];
      const result = payload.result;

      // Upload parsed markdown
      const markdownBlob = await put(
        `parsed/${snapshot.id}.md`,
        result.markdownContent,
        { access: "public" }
      );

      // Update snapshot
      await db
        .update(schema.Snapshot)
        .set({
          status: "success",
          markdown_url: markdownBlob.url,
          metadata: result.metadata,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Snapshot.id, snapshot.id));
    }
  }

  return NextResponse.json({ received: true });
}
```

## File Type Support Matrix

| Extension | MIME Type | Primary Parser | Fallback Parser |
|-----------|-----------|----------------|-----------------|
| `.pdf` | `application/pdf` | LlamaParse | - |
| `.docx` | `application/vnd...wordprocessingml.document` | LlamaParse | - |
| `.xlsx` | `application/vnd...spreadsheetml.sheet` | LlamaParse | - |
| `.csv` | `text/csv` | LlamaParse | SimpleText |
| `.txt` | `text/plain` | LlamaParse | SimpleText |
| `.md` | `text/markdown` | SimpleText | - |
| `.json` | `application/json` | SimpleText | - |
| `.html` | `text/html` | LlamaParse | - |

## Performance Considerations

1. **Async Processing**: Always use background tasks for parsing
2. **Parallel Uploads**: Upload files to Blob storage in parallel
3. **Task Batching**: Group related parsing tasks when possible
4. **Caching**: Cache parsed results to avoid re-parsing
5. **Streaming**: Consider streaming large file uploads

```typescript
// Example: Stream large file upload
async function uploadLargeFile(file: File) {
  const stream = file.stream();
  
  // Use streaming upload to Blob
  const blob = await put(file.name, stream, {
    access: "public",
  });
  
  return blob;
}
```

