import { getMimeTypeFromFilename } from "./file-types";
import type { DocumentParser, ParserConfig } from "./types";

interface RegisteredParser {
  parser: DocumentParser;
  config: ParserConfig;
}

export class ParserRegistry {
  private parsers: Map<string, RegisteredParser> = new Map();

  register(
    parser: DocumentParser,
    config: ParserConfig = { priority: 0, enabled: true },
  ): void {
    if (this.parsers.has(parser.name)) {
      throw new Error(
        `Parser with name "${parser.name}" is already registered`,
      );
    }
    this.parsers.set(parser.name, { parser, config });
  }

  unregister(parserName: string): boolean {
    return this.parsers.delete(parserName);
  }

  getParser(parserName: string): DocumentParser | null {
    const registered = this.parsers.get(parserName);
    if (!registered || !registered.config.enabled) {
      return null;
    }
    return registered.parser;
  }

  selectParser(mimeType: string, filename: string): DocumentParser | null {
    const detectedMimeType = mimeType || getMimeTypeFromFilename(filename);
    if (!detectedMimeType) {
      return null;
    }

    const enabledParsers = Array.from(this.parsers.values())
      .filter((registered) => registered.config.enabled)
      .filter((registered) =>
        registered.parser.canParse(detectedMimeType, filename),
      )
      .sort((a, b) => b.config.priority - a.config.priority);

    return enabledParsers[0]?.parser || null;
  }

  getAllParsers(): DocumentParser[] {
    return Array.from(this.parsers.values())
      .filter((registered) => registered.config.enabled)
      .sort((a, b) => b.config.priority - a.config.priority)
      .map((registered) => registered.parser);
  }

  listRegisteredParsers(): Array<{
    name: string;
    supportedTypes: string[];
    priority: number;
    enabled: boolean;
  }> {
    return Array.from(this.parsers.entries()).map(([name, registered]) => ({
      name,
      supportedTypes: registered.parser.supportedTypes,
      priority: registered.config.priority,
      enabled: registered.config.enabled,
    }));
  }
}

let defaultRegistry: ParserRegistry | null = null;

export function getDefaultRegistry(): ParserRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new ParserRegistry();
  }
  return defaultRegistry;
}

export function setDefaultRegistry(registry: ParserRegistry): void {
  defaultRegistry = registry;
}

export function registerParser(
  parser: DocumentParser,
  config?: ParserConfig,
): void {
  getDefaultRegistry().register(parser, config);
}

export function selectParser(
  mimeType: string,
  filename: string,
): DocumentParser | null {
  return getDefaultRegistry().selectParser(mimeType, filename);
}
