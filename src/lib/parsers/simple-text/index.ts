import type {
  DocumentParser,
  ParseDocumentInput,
  ParseDocumentOutput,
  SupportedFileType,
} from "../types";

const SIMPLE_TEXT_SUPPORTED_TYPES: SupportedFileType[] = [
  "text/plain",
  "text/markdown",
  "application/json",
];

export class SimpleTextParser implements DocumentParser {
  readonly name = "simple-text";
  readonly supportedTypes = SIMPLE_TEXT_SUPPORTED_TYPES;

  canParse(mimeType: string, _filename: string): boolean {
    return this.supportedTypes.includes(mimeType as SupportedFileType);
  }

  async parse(input: ParseDocumentInput): Promise<ParseDocumentOutput> {
    const { document } = input;
    const startTime = Date.now();

    const response = await fetch(document.blobUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch document: ${response.status} ${response.statusText}`,
      );
    }

    const textContent = await response.text();
    const markdownContent = this.convertToMarkdown(
      textContent,
      document.mimeType,
    );
    const processingTime = Date.now() - startTime;

    return {
      markdownContent,
      parser: this.name,
      processingTime,
      metadata: {
        wordCount: textContent.split(/\s+/).length,
      },
    };
  }

  private convertToMarkdown(content: string, mimeType?: string): string {
    if (mimeType === "application/json") {
      try {
        const parsed = JSON.parse(content);
        return `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
      } catch {
        return content;
      }
    }

    if (mimeType === "text/markdown") {
      return content;
    }

    return content;
  }
}

export function createSimpleTextParser(): DocumentParser {
  return new SimpleTextParser();
}
