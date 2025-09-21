import { streamText, stepCountIs } from "ai";
import type { NextRequest } from "next/server";
import prompt from './prompt.md';
import { vectorSearchTool } from './tools/vector-search';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { messages, model = "openai/gpt-4o-mini" } = await request.json();

    // Debug: incoming payload (truncate to avoid logging PII/huge content)
    try {
      const preview = Array.isArray(messages)
        ? messages.map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 200) }))
        : [];
      console.log("[CHAT] Incoming request", { model, messagesPreview: preview });
    } catch (_) {
      // best-effort logging
    }

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "AI Gateway API key is not configured. Please set AI_GATEWAY_API_KEY environment variable." },
        { status: 500 },
      );
    }

    // Validate model format (should be "provider/model")
    if (!model.includes('/')) {
      return Response.json(
        { error: "Model must be in format 'provider/model' (e.g., 'openai/gpt-4o-mini')" },
        { status: 400 },
      );
    }

    const result = streamText({
      model: model, // AI Gateway handles provider routing automatically
      temperature: 0.7,
      system: prompt,
      messages: messages,
      // Allow one follow-up step after tool execution for the model reply
      stopWhen: stepCountIs(2),
      tools: {
        vectorSearch: vectorSearchTool,
      },
    });

    // Note: result is a streaming object; log basic handles available
    console.log("[CHAT] Stream initialized for model", model);

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);

    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
