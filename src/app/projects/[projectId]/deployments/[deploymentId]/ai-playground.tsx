"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
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
import { ChatContextFilters } from "@/components/elements/chat-context-filters";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FileListItem, MetadataFilter } from "@/lib/types/search";

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

async function fetchFiles(
  projectId: string,
  deploymentId: string,
): Promise<FileListItem[]> {
  const response = await fetch(`/api/files/${projectId}/${deploymentId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch files");
  }

  const data = await response.json();
  return data.files;
}

function getFileName(file: FileListItem): string {
  if (file.snapshotType === "upload" && file.metadata) {
    const uploadMetadata = file.metadata as { file_name?: string };
    return uploadMetadata.file_name || file.documentName;
  }
  return file.documentName;
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
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [metadataFilters, setMetadataFilters] = useState<MetadataFilter[]>([]);

  const { data: files } = useQuery({
    queryKey: ["files", projectId, deploymentId],
    queryFn: () => fetchFiles(projectId, deploymentId),
    staleTime: 5 * 60 * 1000,
  });

  const contextInfo = useMemo(() => {
    if (selectedDocumentIds.length === 0 || !files) {
      return undefined;
    }

    const selectedFiles = files.filter((file) =>
      selectedDocumentIds.includes(file.documentId),
    );

    const fileNames = selectedFiles.map((file) => getFileName(file));

    return fileNames.length > 0 ? fileNames : undefined;
  }, [selectedDocumentIds, files]);

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
          documentIds: selectedDocumentIds,
          metadataFilters,
          contextFileNames: contextInfo,
        },
      },
    );
    setInput("");
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)]">
      <CardHeader className="pb-3">
        <CardTitle>AI Playground</CardTitle>
        <CardDescription>
          Chat with AI that has access to your deployment knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <ChatContextFilters
          projectId={projectId}
          deploymentId={deploymentId}
          selectedDocumentIds={selectedDocumentIds}
          onDocumentIdsChange={setSelectedDocumentIds}
          metadataFilters={metadataFilters}
          onMetadataFiltersChange={setMetadataFilters}
        />

        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-3">
                <div className="text-muted-foreground">
                  No messages yet. Start a conversation!
                </div>
                {selectedDocumentIds.length > 0 && files && (
                  <div className="text-xs text-muted-foreground max-w-md p-3 bg-muted/30 rounded-md">
                    <div className="font-medium mb-1">Selected files:</div>
                    <div>
                      {files
                        .filter((f) =>
                          selectedDocumentIds.includes(f.documentId),
                        )
                        .map((f) => getFileName(f))
                        .join(", ")}
                    </div>
                    <div className="mt-2 text-muted-foreground/80">
                      You can ask questions like "What is this document about?"
                      and the AI will focus on your selected files.
                    </div>
                  </div>
                )}
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
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder={
                  selectedDocumentIds.length > 0
                    ? "Ask about the selected files..."
                    : "Ask something about your documents..."
                }
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
      </CardContent>
    </Card>
  );
}
