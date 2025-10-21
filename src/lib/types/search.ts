import type {
  ExtractedMetadata,
  UploadMetadata,
  WebsiteMetadata,
} from "@/db/schema";

export interface FileListItem {
  documentId: string;
  documentName: string;
  documentPath: string;
  snapshotId: string;
  snapshotUrl: string;
  snapshotType: "website" | "upload";
  metadata: UploadMetadata | WebsiteMetadata | null;
  extractedMetadata: ExtractedMetadata | null;
  chunksCount: number;
  createdAt: string;
}

export interface MetadataFilter {
  key: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "~";
  value: string | number | boolean;
}

export interface SearchFilters {
  documentIds?: string[];
  metadataFilters?: MetadataFilter[];
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: {
    snapshotId: string;
    documentId: string;
    documentName?: string;
    documentPath?: string;
    fileName?: string;
    chunkIndex: number;
    chunkSize?: number;
    createdAt?: string;
    [key: string]: unknown;
  };
  data: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  filters?: SearchFilters;
}
