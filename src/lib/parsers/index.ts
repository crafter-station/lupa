import { createLlamaParseParser } from "./llamaparse";
import { getDefaultRegistry, selectParser } from "./registry";
import { createSimpleTextParser } from "./simple-text";

export * from "./file-types";
export { createLlamaParseParser } from "./llamaparse";
export * from "./registry";
export { createSimpleTextParser } from "./simple-text";
export * from "./types";

export function initializeDefaultParsers(): void {
  const registry = getDefaultRegistry();

  try {
    const llamaParser = createLlamaParseParser();
    registry.register(llamaParser, {
      priority: 10,
      enabled: true,
    });
  } catch (error) {
    console.warn("Failed to initialize LlamaParse parser:", error);
  }

  try {
    const simpleTextParser = createSimpleTextParser();
    registry.register(simpleTextParser, {
      priority: 5,
      enabled: true,
    });
  } catch (error) {
    console.warn("Failed to initialize SimpleText parser:", error);
  }
}

export async function parseDocument(input: {
  document: {
    id: string;
    blobUrl: string;
    filename: string;
    mimeType?: string;
  };
  userId: string;
  parsingInstruction?: string;
  parserName?: string;
}) {
  const registry = getDefaultRegistry();

  let parser = null;
  if (input.parserName) {
    parser = registry.getParser(input.parserName);
    if (!parser) {
      throw new Error(`Parser "${input.parserName}" not found or not enabled`);
    }
  } else {
    parser = selectParser(
      input.document.mimeType || "",
      input.document.filename,
    );
    if (!parser) {
      throw new Error(
        `No parser available for file type: ${input.document.mimeType || input.document.filename}`,
      );
    }
  }

  return await parser.parse({
    document: input.document,
    userId: input.userId,
    parsingInstruction: input.parsingInstruction,
  });
}
