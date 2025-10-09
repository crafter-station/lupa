import type { FileExtension, SupportedFileType } from "./types";

const EXTENSION_TO_MIME_TYPE: Record<FileExtension, SupportedFileType> = {
  ".pdf": "application/pdf",
  ".csv": "text/csv",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".doc":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".html": "text/html",
  ".json": "application/json",
  ".md": "text/markdown",
};

const MIME_TYPE_LABELS: Record<SupportedFileType, string> = {
  "application/pdf": "PDF",
  "text/csv": "CSV",
  "application/vnd.ms-excel": "Excel (XLS)",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel (XLSX)",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint",
  "text/plain": "Text",
  "text/html": "HTML",
  "application/json": "JSON",
  "text/markdown": "Markdown",
};

export function getFileExtension(filename: string): FileExtension | null {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && ext in EXTENSION_TO_MIME_TYPE) {
    return ext as FileExtension;
  }
  return null;
}

export function getMimeTypeFromFilename(
  filename: string,
): SupportedFileType | null {
  const ext = getFileExtension(filename);
  if (ext) {
    return EXTENSION_TO_MIME_TYPE[ext];
  }
  return null;
}

export function getMimeTypeLabel(mimeType: SupportedFileType): string {
  return MIME_TYPE_LABELS[mimeType] || mimeType;
}

export function isSupportedFileType(
  mimeType: string,
): mimeType is SupportedFileType {
  return mimeType in MIME_TYPE_LABELS;
}

export function getDefaultParsingInstruction(
  mimeType: SupportedFileType,
): string {
  switch (mimeType) {
    case "application/pdf":
      return "Extract all text content while preserving structure and formatting. Include tables, headers, and maintain document hierarchy.";
    case "text/csv":
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "Extract all data from the spreadsheet. Preserve table structure, column headers, and data relationships. Convert to markdown tables where appropriate.";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "Extract all text content preserving document structure, headings, lists, tables, and formatting. Maintain the document hierarchy.";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return "Extract all text content from slides. Include slide titles, body text, and notes. Preserve the presentation structure.";
    case "text/plain":
    case "text/markdown":
      return "Extract all text content as-is.";
    case "text/html":
      return "Extract text content from HTML, preserving semantic structure. Convert to clean markdown.";
    case "application/json":
      return "Parse JSON structure and convert to readable markdown format.";
    default:
      return "Extract all text content while preserving structure and formatting.";
  }
}
