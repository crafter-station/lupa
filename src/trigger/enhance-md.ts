import { type OpenAIResponsesProviderOptions, openai } from "@ai-sdk/openai";
import { logger, schemaTask } from "@trigger.dev/sdk";
import { generateText } from "ai";
import dedent from "dedent";
import { z } from "zod/v3";

export const enhanceMdTask = schemaTask({
  id: "enhance-md",
  schema: z.object({
    rawText: z.string().min(1),
    markdown: z.string().min(1),
  }),
  retry: {
    maxAttempts: 5,
  },
  run: async ({ rawText, markdown }) => {
    const result = await generateText({
      model: openai.responses("gpt-5-mini"),
      providerOptions: {
        openai: {
          reasoningEffort: "high",
        } satisfies OpenAIResponsesProviderOptions,
      },
      prompt: dedent`You are tasked with improving markdown content by cross-referencing it with the extracted text from the original HTML page.

     CRITICAL: First analyze if the markdown is already correct and complete. Many times the original markdown will be fine - only make changes if you identify actual issues.

     The extracted text is a plain text representation of the page (all HTML tags removed). Use it primarily to fill in missing textual content.

     Common issues to look for:
     1. **Code blocks with placeholders**: Look for patterns like \`code-block_xyz\` or empty code blocks. Search the extracted text for the actual code content that should be there.
     2. **Missing code content**: Code blocks that appear truncated or incomplete. The extracted text may contain the full code.
     3. **Missing text sections**: Paragraphs or sections that seem abbreviated or have placeholder text.
     4. **Incomplete examples**: Tutorial or documentation examples that reference code but don't show it.

     Process:
     1. Review the markdown carefully
     2. If it appears complete and correct, return it as-is
     3. If you find missing content (especially in code blocks), search the extracted text to locate the missing content
     4. When filling in code blocks, try to infer the correct language/syntax from context
     5. Maintain the markdown format and structure - only fill in missing content, don't restructure

     Important limitations:
     - The extracted text has NO formatting, links, or structure
     - Use it only to fill in missing textual/code content
     - Don't try to recreate links, images, or formatting from the extracted text
     - Preserve the markdown's existing structure

     Return ONLY the corrected markdown, nothing else. Start immediately with the markdown content.

     <MARKDOWN>
     ${markdown}
     </MARKDOWN>

     <EXTRACTED_TEXT>
     ${rawText}
     </EXTRACTED_TEXT>

     <CORRECTED_MARKDOWN>
     `,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "enhance-md",
      },
    });

    logger.info("usage", result.usage);

    const inputPrice = result.usage.inputTokens
      ? (result.usage.inputTokens * 0.25) / 100000
      : 0;
    const outputPrice = result.usage.outputTokens
      ? (result.usage.outputTokens * 2) / 100000
      : 0;

    logger.info("price", {
      inputPrice,
      outputPrice,
      total: inputPrice + outputPrice,
    });

    return result.text;
  },
});
