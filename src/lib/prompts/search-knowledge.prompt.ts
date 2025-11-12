import dedent from "dedent";

export const SEARCH_KNOWLEDGE_PROMPT = ({
  name,
  description,
}: {
  name: string;
  description?: string | null;
}) => dedent`
  Search the knowledge base and return up to 5 relevant CHUNKS (text excerpts) with similarity scores and metadata.
  Each result is a partial excerpt from a document, not the complete document. Results include metadata with the document path (use this to retrieve full documents with get-document-contents), documentId, chunkIndex, and other document metadata.
  Use this tool to discover which documents contain information related to your query.

  Knowledge Base details:
  Name: ${name}
  ${description ? `Description: ${description}` : ""}
  `;
