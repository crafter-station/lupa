# Document Parsing System

A flexible, parser-agnostic architecture for parsing various document types into markdown format.

## Architecture Overview

The parsing system is built with the following components:

### 1. **Parser Interface** (`types.ts`)
Defines the contract that all parsers must implement:
- `DocumentParser` - Core interface with `parse()` method
- `ParseDocumentInput` - Standard input format
- `ParseDocumentOutput` - Standard output format with markdown content

### 2. **Parser Registry** (`registry.ts`)
Manages multiple parsers with priority-based selection:
- Register parsers with priority levels
- Auto-select the best parser for a file type
- Enable/disable parsers dynamically
- Override with specific parser by name

### 3. **File Type Detection** (`file-types.ts`)
Utilities for working with file types:
- MIME type detection from filename
- Default parsing instructions per file type
- Supported file type validation

### 4. **Parser Implementations**
Currently includes:
- **LlamaParse** (`llamaparse/`) - Supports PDF, DOCX, XLSX, CSV, PPTX, and more

## Supported File Types

| File Type | Extensions | MIME Type | Parser |
|-----------|-----------|-----------|---------|
| PDF | `.pdf` | `application/pdf` | LlamaParse |
| Excel | `.xls`, `.xlsx` | `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | LlamaParse |
| Word | `.doc`, `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | LlamaParse |
| PowerPoint | `.ppt`, `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | LlamaParse |
| CSV | `.csv` | `text/csv` | LlamaParse |
| Text | `.txt` | `text/plain` | LlamaParse |
| HTML | `.html` | `text/html` | LlamaParse |
| JSON | `.json` | `application/json` | Future |
| Markdown | `.md` | `text/markdown` | Future |

## Usage

### Basic Usage (Auto-detect Parser)

```typescript
import { parseDocument, initializeDefaultParsers } from "@/lib/parsers";

// Initialize parsers once at app startup
initializeDefaultParsers();

// Parse a document (parser auto-selected based on file type)
const result = await parseDocument({
  document: {
    id: "doc-123",
    blobUrl: "https://example.com/file.pdf",
    filename: "document.pdf",
    mimeType: "application/pdf", // optional, will be detected from filename
  },
  userId: "user-123",
  parsingInstruction: "Custom instruction...", // optional
});

console.log(result.markdownContent);
console.log(result.parser); // "llamaparse"
console.log(result.metadata); // { wordCount: 1234, ... }
```

### Use Specific Parser

```typescript
const result = await parseDocument({
  document: { /* ... */ },
  userId: "user-123",
  parserName: "llamaparse", // explicitly use LlamaParse
});
```

### In Trigger.dev Tasks

```typescript
import { parseDocumentTask } from "@/trigger/parse-document.task";
import { tasks } from "@trigger.dev/sdk/v3";

// Trigger the parsing task
const handle = await tasks.trigger(parseDocumentTask, {
  document: {
    id: "doc-123",
    blobUrl: "https://example.com/file.pdf",
    filename: "document.pdf",
  },
  userId: "user-123",
});

const result = await handle.wait();
console.log(result.markdownContent);
```

## Adding a New Parser

### Step 1: Implement the `DocumentParser` Interface

```typescript
// src/lib/parsers/myparser/index.ts
import type { 
  DocumentParser, 
  ParseDocumentInput, 
  ParseDocumentOutput,
  SupportedFileType 
} from "../types";

export class MyCustomParser implements DocumentParser {
  readonly name = "mycustomparser";
  readonly supportedTypes: SupportedFileType[] = [
    "application/pdf",
    "text/csv",
  ];

  canParse(mimeType: string, filename: string): boolean {
    return this.supportedTypes.includes(mimeType as SupportedFileType);
  }

  async parse(input: ParseDocumentInput): Promise<ParseDocumentOutput> {
    const { document, userId, parsingInstruction } = input;
    
    // Fetch the document
    const response = await fetch(document.blobUrl);
    const buffer = await response.arrayBuffer();
    
    // Your parsing logic here
    const markdownContent = await this.myParsingLogic(buffer);
    
    return {
      markdownContent,
      parser: this.name,
      metadata: {
        wordCount: markdownContent.split(/\s+/).length,
      },
    };
  }

  private async myParsingLogic(buffer: ArrayBuffer): Promise<string> {
    // Implementation...
    return "# Parsed Content\n\nYour markdown here...";
  }
}

export function createMyCustomParser(): DocumentParser {
  return new MyCustomParser();
}
```

### Step 2: Register the Parser

```typescript
// src/lib/parsers/index.ts
import { createMyCustomParser } from "./myparser";

export function initializeDefaultParsers(): void {
  const registry = getDefaultRegistry();
  
  // Register LlamaParse
  try {
    const llamaParser = createLlamaParseParser();
    registry.register(llamaParser, {
      priority: 10,
      enabled: true,
    });
  } catch (error) {
    console.warn("Failed to initialize LlamaParse parser:", error);
  }
  
  // Register your new parser
  try {
    const myParser = createMyCustomParser();
    registry.register(myParser, {
      priority: 5, // Lower priority than LlamaParse
      enabled: true,
    });
  } catch (error) {
    console.warn("Failed to initialize MyCustomParser:", error);
  }
}
```

### Step 3: Export from Index

```typescript
// src/lib/parsers/index.ts
export { createMyCustomParser } from "./myparser";
```

## Parser Priority

Parsers are selected based on:
1. **Explicit selection**: If `parserName` is provided, that parser is used
2. **Priority order**: Higher priority parsers are tried first
3. **File type support**: Only parsers that support the file type are considered

Example priority setup:
- LlamaParse: priority 10 (default for most documents)
- CustomParser: priority 5 (fallback or specialized use)
- BasicParser: priority 1 (last resort)

## Configuration

### Environment Variables

```bash
# LlamaParse (required for LlamaParse parser)
LLAMA_CLOUD_API_KEY=your_api_key_here
```

### Parser Configuration

```typescript
import { getDefaultRegistry } from "@/lib/parsers";

const registry = getDefaultRegistry();

// Disable a parser
const parser = registry.getParser("llamaparse");
if (parser) {
  registry.unregister("llamaparse");
}

// List all registered parsers
const parsers = registry.listRegisteredParsers();
console.log(parsers);
// Output: [{ name: "llamaparse", supportedTypes: [...], priority: 10, enabled: true }]
```

## Error Handling

All parsers should throw descriptive errors:

```typescript
try {
  const result = await parseDocument({
    document: { /* ... */ },
    userId: "user-123",
  });
} catch (error) {
  if (error.message.includes("No parser available")) {
    // File type not supported
  } else if (error.message.includes("Failed to fetch document")) {
    // Network error
  } else {
    // Parser-specific error
  }
}
```

## Best Practices

1. **Parser Independence**: Each parser should be self-contained with its own dependencies
2. **Graceful Degradation**: Initialize parsers with try-catch to handle missing API keys
3. **Consistent Output**: Always return markdown in a consistent format
4. **Rich Metadata**: Include useful metadata (word count, page count, tables, etc.)
5. **Logging**: Use structured logging for debugging and monitoring
6. **Retry Logic**: Implement retry logic in the Trigger task, not in parsers
7. **Timeouts**: Set reasonable timeouts for long-running parsing operations

## Future Enhancements

Potential parsers to add:
- **PDFParser** - Native PDF parsing without external API
- **OpenAIParser** - Use GPT-4 Vision for complex document understanding
- **ClaudeParser** - Use Claude for parsing with custom instructions
- **LocalParser** - For text/markdown/JSON that don't need external processing
- **OCRParser** - For scanned documents and images

## Testing

```typescript
import { ParserRegistry } from "@/lib/parsers/registry";
import { createLlamaParseParser } from "@/lib/parsers/llamaparse";

describe("Document Parsing", () => {
  it("should parse PDF with LlamaParse", async () => {
    const registry = new ParserRegistry();
    const parser = createLlamaParseParser();
    registry.register(parser, { priority: 10, enabled: true });
    
    const result = await parser.parse({
      document: {
        id: "test-doc",
        blobUrl: "https://example.com/test.pdf",
        filename: "test.pdf",
        mimeType: "application/pdf",
      },
      userId: "test-user",
    });
    
    expect(result.markdownContent).toBeTruthy();
    expect(result.parser).toBe("llamaparse");
  });
});
```

