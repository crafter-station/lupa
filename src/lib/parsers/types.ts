export type SupportedFileType =
  | "application/pdf"
  | "text/csv"
  | "application/vnd.ms-excel"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "text/plain"
  | "text/html"
  | "application/json"
  | "text/markdown";

export type FileExtension =
  | ".pdf"
  | ".csv"
  | ".xls"
  | ".xlsx"
  | ".doc"
  | ".docx"
  | ".ppt"
  | ".pptx"
  | ".txt"
  | ".html"
  | ".json"
  | ".md";

export interface ParseDocumentInput {
  document: {
    id: string;
    blobUrl: string;
    filename: string;
    mimeType?: string;
  };
  userId: string;
  parsingInstruction?: string;
}

export interface ParseDocumentOutput {
  markdownContent: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    tables?: number;
    images?: number;
    [key: string]: unknown;
  };
  processingTime?: number;
  parser: string;
  jobId?: string;
}

export interface DocumentParser {
  readonly name: string;
  readonly supportedTypes: SupportedFileType[];

  canParse(mimeType: string, filename: string): boolean;

  parse(input: ParseDocumentInput): Promise<ParseDocumentOutput>;
}

export interface ParserConfig {
  priority: number;
  enabled: boolean;
}
