# Vector Search Tool

Use this tool to search through ingested documents using vector similarity search. This tool enables semantic search across uploaded documents, finding relevant information based on meaning rather than exact keyword matches. The search uses embeddings to understand context and provide the most relevant document chunks for user queries.

## When to Use This Tool

Use this tool when you need to:
1. Find relevant information from uploaded documents
2. Answer questions based on document content
3. Perform semantic search across large document collections
4. Retrieve contextual information for user queries

## Search Capabilities

The vector search tool provides:
- **Semantic Search** – Find documents by meaning, not just keywords
- **Relevance Scoring** – Results ranked by similarity to the query
- **Metadata Filtering** – Search can be scoped by document properties
- **Chunk-level Results** – Returns specific document sections with context

All search results include source attribution and relevance scores for transparency.

## Best Practices
- Use natural language queries that capture the user's intent
- Adjust the limit parameter based on query complexity (3-10 results typically)
- Include context in your queries for better semantic matching
- Review relevance scores to assess result quality

## Examples of When to Use This Tool

<example>
> User: What does the contract say about payment terms?
> Assistant: I'll search your documents for information about payment terms and contract details.
</example>

<example>
> User: Find information about project timelines and milestones
> Assistant: Let me search through your documents for project timeline information and milestone details.
</example>

## When NOT to Use This Tool

Skip using this tool when:
1. The user is asking general knowledge questions unrelated to their documents
2. No documents have been uploaded to search
3. The query is purely conversational and doesn't require document retrieval

## Search Parameters

- **query**: The search query using natural language
- **limit**: Maximum number of results to return (default: 5)
- Results include document content, metadata, and relevance scores

## Summary

Use Vector Search to find relevant information from uploaded documents using advanced semantic search capabilities. The tool returns ranked results with source attribution and metadata for comprehensive document analysis.