import { type OpenAIResponsesProviderOptions, openai } from "@ai-sdk/openai";
import { streamText } from "ai";

(async () => {
  const result = streamText({
    model: openai.responses("gpt-5-nano"),
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
        reasoningSummary: "detailed",
        include: ["reasoning.encrypted_content"],
      } satisfies OpenAIResponsesProviderOptions,
    },
    prompt: "Invent a new holiday and describe its traditions.",
  });

  // example: use textStream as an async iterable
  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }
})();
