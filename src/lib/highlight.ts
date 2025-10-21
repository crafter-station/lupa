import { type BundledLanguage, createHighlighter } from "shiki";

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;

async function getHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["vitesse-dark", "vitesse-light"],
      langs: ["typescript", "javascript", "tsx", "jsx", "json", "bash"],
    });
  }
  return highlighter;
}

export async function highlightCode(
  code: string,
  lang: BundledLanguage = "typescript",
): Promise<string> {
  const highlighter = await getHighlighter();

  return highlighter.codeToHtml(code, {
    lang,
    themes: {
      dark: "vitesse-dark",
      light: "vitesse-light",
    },
  });
}
