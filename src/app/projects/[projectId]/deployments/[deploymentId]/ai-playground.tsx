"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useParams } from "next/navigation";
import { Fragment, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const models = [
  {
    name: "GPT-5",
    value: "gpt-5",
  },
  {
    name: "GPT-5 mini",
    value: "gpt-5-mini",
  },
  {
    name: "GPT-5 nano",
    value: "gpt-5-nano",
  },
  {
    name: "GPT-5 codex",
    value: "gpt-5-codex	",
  },
];

function SnapshotPreview({ content }: { content: string }) {
  const [showFull, setShowFull] = useState(false);
  const previewLength = 500;
  const isTruncated = content.length > previewLength;
  const displayContent = showFull ? content : content.slice(0, previewLength);

  return (
    <div className="space-y-2">
      <div className="rounded-md bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap break-words">
        {displayContent}
        {isTruncated && !showFull && "..."}
      </div>
      {isTruncated && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFull(!showFull)}
        >
          {showFull ? "Show less" : "Show full content"}
        </Button>
      )}
    </div>
  );
}

function renderMessagePart(
  messageId: string,
  messageRole: UIMessage["role"],
  part: UIMessage["parts"][number],
  index: number,
) {
  switch (part.type) {
    case "reasoning":
      if (part.state === "done" && !part.text.length) return null;
      return (
        <Reasoning
          key={`${messageId}-${index}`}
          className="w-full"
          isStreaming={part.state === "streaming"}
        >
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "text":
      return (
        <Fragment key={`${messageId}-${index}`}>
          <Message from={messageRole}>
            <MessageContent variant="flat">
              <Response>{part.text}</Response>
            </MessageContent>
          </Message>
        </Fragment>
      );
    case "tool-search-knowledge":
      return (
        <Tool key={`${messageId}-${index}`}>
          <ToolHeader
            title="Search Knowledge Base"
            type={part.type}
            state={part.state}
          />
          <ToolContent>
            <ToolInput input={part.input} />
            <ToolOutput output={part.output} errorText={part.errorText} />
          </ToolContent>
        </Tool>
      );
    case "tool-get-snapshot-contents":
      return (
        <Tool key={`${messageId}-${index}`}>
          <ToolHeader
            title="Get Snapshot Contents"
            type={part.type}
            state={part.state}
          />
          <ToolContent>
            <ToolInput input={part.input} />
            {part.output ? (
              <div className="space-y-2 p-4">
                <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Result
                </h4>
                <SnapshotPreview
                  content={
                    typeof part.output === "object" &&
                    "content" in part.output &&
                    typeof part.output.content === "string"
                      ? part.output.content
                      : JSON.stringify(part.output, null, 2)
                  }
                />
              </div>
            ) : null}
            {part.errorText && (
              <ToolOutput output={part.output} errorText={part.errorText} />
            )}
          </ToolContent>
        </Tool>
      );
    default:
      return null;
  }
}

export function AIPlayground() {
  const { projectId, deploymentId } = useParams<{
    projectId: string;
    deploymentId: string;
  }>();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chat/${projectId}/${deploymentId}`,
    }),
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);

    if (!hasText) {
      return;
    }

    sendMessage(
      {
        text: message.text || "",
      },
      {
        body: {
          model,
        },
      },
    );
    setInput("");
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)]">
      <CardHeader>
        <CardTitle>AI Playground</CardTitle>
        <CardDescription>
          Chat with AI that has access to your deployment knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No messages yet. Start a conversation!
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, i) =>
                  renderMessagePart(message.id, message.role, part, i),
                )}
              </div>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="p-4 border-t">
          <div className="mx-auto w-full max-w-3xl">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  onChange={(e) => setInput(e.target.value)}
                  value={input}
                  placeholder="Ask something about your documents..."
                />
              </PromptInputBody>
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputModelSelect
                    onValueChange={(value) => {
                      setModel(value);
                    }}
                    value={model}
                  >
                    <PromptInputModelSelectTrigger>
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {models.map((model) => (
                        <PromptInputModelSelectItem
                          key={model.value}
                          value={model.value}
                        >
                          {model.name}
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>
                <PromptInputSubmit disabled={!input} status={status} />
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
