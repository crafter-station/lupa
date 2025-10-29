import dedent from "dedent";

export const GET_FILE_TREE_PROMPT = ({
  name,
  description,
}: {
  name: string;
  description?: string | null;
}) => dedent`
  Retrieve the COMPLETE markdown content of a specific document from the knowledge base.
  Use this tool when: (1) the same the same document appears repeatedly in search results, indicating high relevance; (2) users ask to summarize, analyze, review, or explain a document; (3) you need full document context to answer comprehensively; (4) users request detailed information spanning multiple sections; (5) the question requires understanding the complete document rather than isolated fragments.
  Always use this after search-knowledge identifies relevant documents. Input the path of the document from search results metadata.

  Knowledge Base details:
  Name: ${name}
  ${description ? `Description: ${description}` : ""}
  `;
