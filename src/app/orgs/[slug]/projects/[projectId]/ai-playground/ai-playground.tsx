"use client";

import { useChat } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { BrainIcon, ListMinusIcon } from "lucide-react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  PromptInputDropdownSelect,
  type PromptInputMessage,
  PromptInputSubmit,
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
import { FileMentionPicker } from "@/components/elements/file-mention-picker";
import { RichTextarea } from "@/components/elements/rich-textarea";
import { LupaIcon } from "@/components/icons/lupa";
import { OpenAIIcon } from "@/components/icons/openai";
import { Button } from "@/components/ui/button";
import { useDeploymentId } from "@/hooks/use-deployment-id";
import {
  type FileTreeResponse,
  flattenTree,
  type TreeNode,
} from "@/lib/file-tree-utils";
import { cn } from "@/lib/utils";

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

type TimePeriod = "morning" | "afternoon" | "evening" | "lateNight";

type GreetingStorage = {
  currentGreeting: string;
  currentPeriod: TimePeriod;
  nextGreeting: string;
  nextPeriod: TimePeriod;
};

const GREETING_STORAGE_KEY = "lupa-ai-greeting";

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }
  if (hour >= 17 && hour < 22) {
    return "evening";
  }
  return "lateNight";
}

function getNextTimePeriod(current: TimePeriod): TimePeriod {
  const order: TimePeriod[] = ["lateNight", "morning", "afternoon", "evening"];
  const currentIndex = order.indexOf(current);
  return order[(currentIndex + 1) % order.length];
}

function getRandomGreeting(
  period: TimePeriod,
  firstName?: string | null,
): string {
  const name = firstName || "there";

  const greetingsByPeriod: Record<TimePeriod, string[]> = {
    morning: [
      `Good morning, ${name}`,
      `Rise and shine, ${name}`,
      `Morning, ${name}! Ready to build?`,
      `Hey ${name}, early start today?`,
    ],
    afternoon: [
      `Good afternoon, ${name}`,
      `Hey ${name}, what are we building today?`,
      `Afternoon, ${name}! How's it going?`,
      `How was lunch, ${name}?`,
    ],
    evening: [
      `Good evening, ${name}`,
      `Evening, ${name}! Still going strong?`,
      `Hey ${name}, burning the midnight oil?`,
      `What's cooking, ${name}?`,
    ],
    lateNight: [
      `Hello, night owl`,
      `Late night, ${name}?`,
      `Hey ${name}, can't sleep?`,
      `Working late, ${name}?`,
    ],
  };

  const greetings = greetingsByPeriod[period];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function getOrGenerateGreeting(firstName?: string | null): string {
  const hour = new Date().getHours();
  const currentPeriod = getTimePeriod(hour);

  try {
    const stored = localStorage.getItem(GREETING_STORAGE_KEY);

    if (stored) {
      const data: GreetingStorage = JSON.parse(stored);

      if (data.currentPeriod === currentPeriod) {
        return data.currentGreeting;
      }

      if (data.nextPeriod === currentPeriod) {
        const newNextPeriod = getNextTimePeriod(currentPeriod);
        const newNextGreeting = getRandomGreeting(newNextPeriod, firstName);

        const newStorage: GreetingStorage = {
          currentGreeting: data.nextGreeting,
          currentPeriod,
          nextGreeting: newNextGreeting,
          nextPeriod: newNextPeriod,
        };

        localStorage.setItem(GREETING_STORAGE_KEY, JSON.stringify(newStorage));
        return data.nextGreeting;
      }
    }

    const currentGreeting = getRandomGreeting(currentPeriod, firstName);
    const nextPeriod = getNextTimePeriod(currentPeriod);
    const nextGreeting = getRandomGreeting(nextPeriod, firstName);

    const newStorage: GreetingStorage = {
      currentGreeting,
      currentPeriod,
      nextGreeting,
      nextPeriod,
    };

    localStorage.setItem(GREETING_STORAGE_KEY, JSON.stringify(newStorage));
    return currentGreeting;
  } catch {
    return getRandomGreeting(currentPeriod, firstName);
  }
}

function TreeNodeComponent({
  node,
  depth = 0,
}: {
  node: TreeNode;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isDirectory = node.type === "directory";

  const handleToggle = () => {
    if (isDirectory) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDirectory && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  if (isDirectory) {
    return (
      <div className="select-none">
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 py-0.5 text-xs hover:bg-muted/50 rounded px-1 w-full text-left border-0 bg-transparent",
          )}
          style={{ paddingLeft: `${depth * 12}px` }}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
        >
          <span className="text-muted-foreground">{isOpen ? "📂" : "📁"}</span>
          <span className="font-medium">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((child, idx) => (
              <TreeNodeComponent
                key={`${child.path}-${idx}`}
                node={child}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-1.5 py-0.5 text-xs rounded px-1"
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <span className="text-muted-foreground">📄</span>
        <span>{node.name}</span>
        <span className="text-muted-foreground ml-auto text-[10px]">
          {node.metadata.chunks_count} chunks
        </span>
      </div>
    </div>
  );
}

function FileTreeView({ tree }: { tree: TreeNode[] }) {
  return (
    <div className="rounded-md bg-muted/50 p-3 font-mono text-xs">
      {tree.map((node, idx) => (
        <TreeNodeComponent key={`${node.path}-${idx}`} node={node} />
      ))}
    </div>
  );
}

function SnapshotPreview({ content }: { content: string }) {
  const [showFull, setShowFull] = useState(false);
  const previewLength = 500;
  const isTruncated = content.length > previewLength;
  const displayContent = showFull ? content : content.slice(0, previewLength);

  return (
    <div className="space-y-2">
      <div className="rounded-md bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap wrap-break-word">
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

function highlightFileMentions(text: string): React.ReactNode {
  const pattern = /@(\/[\w\-/.]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match = pattern.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <span
        key={match.index}
        className="inline-flex items-center gap-1 text-primary font-mono bg-primary/10 px-1 rounded"
      >
        <span className="text-[10px]">📄</span>
        <span>@{match[1]}</span>
      </span>,
    );
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
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
    case "text": {
      if (messageRole === "user") {
        const content = highlightFileMentions(part.text);
        return (
          <Fragment key={`${messageId}-${index}`}>
            <Message from={messageRole}>
              <MessageContent variant="flat">
                <div className="whitespace-pre-wrap">{content}</div>
              </MessageContent>
            </Message>
          </Fragment>
        );
      }

      return (
        <Fragment key={`${messageId}-${index}`}>
          <Message from={messageRole}>
            <MessageContent variant="flat">
              <Response>{part.text}</Response>
            </MessageContent>
          </Message>
        </Fragment>
      );
    }
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
    case "tool-get-document-contents":
      return (
        <Tool key={`${messageId}-${index}`}>
          <ToolHeader
            title="Get Document Contents"
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
    case "tool-get-file-tree":
      return (
        <Tool key={`${messageId}-${index}`}>
          <ToolHeader
            title="Get File Tree"
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
                {typeof part.output === "object" &&
                "tree" in part.output &&
                Array.isArray(part.output.tree) ? (
                  <FileTreeView tree={part.output.tree as TreeNode[]} />
                ) : (
                  <ToolOutput output={part.output} errorText={part.errorText} />
                )}
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
  const params = useParams<{
    projectId: string;
  }>();
  const [deploymentId] = useDeploymentId();
  const projectId = params.projectId;
  const { user } = useUser();
  const [input, setInput] = useState("");
  const [model, setModel] = useState<string>(models[0].value);
  const [reasoningEffort, setReasoningEffort] = useState<
    "minimal" | "low" | "medium" | "high"
  >("medium");
  const [reasoningSummary, setReasoningSummary] = useState<
    "auto" | "detailed" | undefined
  >("detailed");
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [filePickerQuery, setFilePickerQuery] = useState("");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const [greeting, setGreeting] = useState("");
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const textareaRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const loadedGreeting = getOrGenerateGreeting(user?.firstName);
      setGreeting(loadedGreeting);
      setGreetingLoaded(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [user?.firstName]);

  useEffect(() => {
    console.log("🎯 showFilePicker state changed:", showFilePicker);
  }, [showFilePicker]);

  const { data: allFiles } = useQuery({
    queryKey: ["file-tree", projectId, deploymentId],
    queryFn: async () => {
      console.log("🌲 Prefetching file tree on mount");
      const response = await fetch("/api/tree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          deploymentId,
          path: "/",
          depth: "0",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch file tree");
      }
      const data: FileTreeResponse = await response.json();
      console.log("✅ File tree fetched (raw):", data);
      const flattenedFiles = flattenTree(data.tree);
      console.log("✅ File tree flattened:", flattenedFiles);
      return flattenedFiles;
    },
    enabled: !!deploymentId,
    staleTime: Number.POSITIVE_INFINITY,
  });

  const filteredFiles = useMemo(() => {
    if (!allFiles) return [];

    const query = filePickerQuery.toLowerCase();
    const filtered = allFiles.filter((file) => {
      const path = file.path.toLowerCase();
      return path.includes(query);
    });

    return filtered.sort((a, b) => a.path.localeCompare(b.path));
  }, [allFiles, filePickerQuery]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        projectId,
        deploymentId,
      },
    }),
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const handleInputChangeCallback = useCallback((value: string) => {
    setInput(value);

    const lastAtIndex = value.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      const hasSpaceAfterAt = /\s/.test(textAfterAt);

      if (!hasSpaceAfterAt) {
        setMentionStartPos(lastAtIndex);
        setFilePickerQuery(textAfterAt);
        setSelectedFileIndex(0);
        setShowFilePicker(true);
        return;
      }
    }

    setShowFilePicker(false);
    setMentionStartPos(null);
  }, []);

  const handleFileSelect = useCallback(
    (filePath: string) => {
      if (mentionStartPos === null) return;

      const selection = window.getSelection();
      const cursorPosition = selection?.rangeCount
        ? selection.getRangeAt(0).startOffset
        : input.length;

      const beforeMention = input.substring(0, mentionStartPos);
      const afterMention = input.substring(cursorPosition);
      const newValue = `${beforeMention}@${filePath} ${afterMention}`;

      setInput(newValue);
      setShowFilePicker(false);
      setMentionStartPos(null);

      setTimeout(() => {
        if (textareaRef.current) {
          const badges =
            textareaRef.current.querySelectorAll("[data-file-tag]");
          const lastBadge = badges[badges.length - 1];

          if (lastBadge) {
            const range = document.createRange();
            const selection = window.getSelection();

            range.setStartAfter(lastBadge);
            range.collapse(true);

            selection?.removeAllRanges();
            selection?.addRange(range);
          }

          textareaRef.current.focus();
        }
      }, 10);
    },
    [input, mentionStartPos],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!showFilePicker) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedFileIndex((prev) => prev + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedFileIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const safeIndex = Math.min(selectedFileIndex, filteredFiles.length - 1);
        if (filteredFiles[safeIndex]) {
          console.log(
            "🔑 Enter pressed - selecting file:",
            filteredFiles[safeIndex].path,
          );
          handleFileSelect(filteredFiles[safeIndex].path);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowFilePicker(false);
        setMentionStartPos(null);
      }
    },
    [showFilePicker, selectedFileIndex, filteredFiles, handleFileSelect],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!showFilePicker) return;

      const clickedInsideTextarea = textareaRef.current?.contains(
        e.target as Node,
      );
      const clickedInsidePicker = pickerRef.current?.contains(e.target as Node);

      console.log("👆 Click detected:", {
        showFilePicker,
        clickedInsideTextarea,
        clickedInsidePicker,
      });

      if (!clickedInsideTextarea && !clickedInsidePicker) {
        console.log("🚪 Closing picker (clicked outside)");
        setShowFilePicker(false);
        setMentionStartPos(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilePicker]);

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
          reasoningEffort,
          reasoningSummary,
          deploymentId,
        },
      },
    );
    setInput("");
    setShowFilePicker(false);
    setMentionStartPos(null);
  };

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-32">
          <div className="w-full max-w-2xl space-y-8">
            <div className="text-center space-y-3">
              <div className="relative h-10 flex items-center justify-center overflow-hidden">
                <motion.div
                  className="flex items-center gap-3 absolute"
                  initial={{ x: "0%" }}
                  animate={{ x: greetingLoaded ? "-50%" : "0%" }}
                  transition={{ duration: 0.7, delay: 0.7, ease: "easeOut" }}
                  style={{ left: "50%" }}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.7 }}
                  >
                    <LupaIcon className="size-10" />
                  </motion.div>
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: greetingLoaded ? 1 : 0 }}
                    transition={{ duration: 0.5, delay: 1.4 }}
                    className="text-3xl font-semibold whitespace-nowrap"
                    suppressHydrationWarning
                  >
                    {greeting}
                  </motion.h2>
                </motion.div>
              </div>
            </div>

            <div className="relative">
              {showFilePicker && (
                <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                  <FileMentionPicker
                    projectId={projectId}
                    searchQuery={filePickerQuery}
                    onSelect={handleFileSelect}
                    selectedIndex={selectedFileIndex}
                    onSelectedIndexChange={setSelectedFileIndex}
                    pickerRef={pickerRef}
                  />
                </div>
              )}
              <PromptInput onSubmit={handleSubmit} className="divide-y-0">
                <PromptInputBody>
                  <RichTextarea
                    ref={textareaRef}
                    onChange={handleInputChangeCallback}
                    onKeyDown={handleKeyDown}
                    value={input}
                    placeholder="Ask something about your documents... (use @ to mention files)"
                    className="w-full resize-none rounded-none border-none p-3 shadow-none outline-none ring-0 field-sizing-content bg-transparent dark:bg-transparent max-h-48 min-h-16 focus-visible:ring-0 text-sm"
                  />
                </PromptInputBody>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: greetingLoaded ? "auto" : 0,
                    opacity: greetingLoaded ? 1 : 0,
                    borderTop: greetingLoaded
                      ? "1px solid var(--border)"
                      : "none",
                  }}
                  transition={{ duration: 0.6, delay: 1.4, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <PromptInputToolbar>
                    <PromptInputTools>
                      <PromptInputDropdownSelect
                        value={model}
                        onValueChange={setModel}
                        options={models.map((m) => ({
                          value: m.value,
                          label: m.name,
                        }))}
                        label="Model"
                        icon={<OpenAIIcon className="size-5" />}
                      />
                      <PromptInputDropdownSelect
                        value={reasoningEffort}
                        onValueChange={(value) =>
                          setReasoningEffort(
                            value as "minimal" | "low" | "medium" | "high",
                          )
                        }
                        options={[
                          { value: "minimal", label: "Minimal" },
                          { value: "low", label: "Low" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                        ]}
                        label="Reasoning Effort"
                        icon={<BrainIcon className="size-3.5" />}
                      />
                      <PromptInputDropdownSelect
                        value={reasoningSummary || "none"}
                        onValueChange={(value) =>
                          setReasoningSummary(
                            value === "none"
                              ? undefined
                              : (value as "auto" | "detailed"),
                          )
                        }
                        options={[
                          { value: "none", label: "None" },
                          { value: "auto", label: "Auto" },
                          { value: "detailed", label: "Detailed" },
                        ]}
                        label="Reasoning Summary"
                        icon={<ListMinusIcon className="size-3.5" />}
                      />
                    </PromptInputTools>
                    <PromptInputSubmit disabled={!input} status={status} />
                  </PromptInputToolbar>
                </motion.div>
              </PromptInput>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0">
            <Conversation className="h-full">
              <ConversationContent className="p-4 mx-auto w-full max-w-3xl">
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
          </div>

          <div className="border-t bg-background shrink-0">
            <div className="mx-auto w-full max-w-3xl px-4 py-4 relative">
              {showFilePicker && (
                <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                  <FileMentionPicker
                    projectId={projectId}
                    searchQuery={filePickerQuery}
                    onSelect={handleFileSelect}
                    selectedIndex={selectedFileIndex}
                    onSelectedIndexChange={setSelectedFileIndex}
                    pickerRef={pickerRef}
                  />
                </div>
              )}
              <PromptInput onSubmit={handleSubmit}>
                <PromptInputBody>
                  <RichTextarea
                    ref={textareaRef}
                    onChange={handleInputChangeCallback}
                    onKeyDown={handleKeyDown}
                    value={input}
                    placeholder="Ask something about your documents... (use @ to mention files)"
                    className="w-full resize-none rounded-none border-none p-3 shadow-none outline-none ring-0 field-sizing-content bg-transparent dark:bg-transparent max-h-48 min-h-16 text-sm focus-visible:ring-0"
                  />
                </PromptInputBody>
                <PromptInputToolbar>
                  <PromptInputTools>
                    <PromptInputDropdownSelect
                      value={model}
                      onValueChange={setModel}
                      options={models.map((m) => ({
                        value: m.value,
                        label: m.name,
                      }))}
                      label="Model"
                      icon={<OpenAIIcon className="size-5" />}
                    />
                    <PromptInputDropdownSelect
                      value={reasoningEffort}
                      onValueChange={(value) =>
                        setReasoningEffort(
                          value as "minimal" | "low" | "medium" | "high",
                        )
                      }
                      options={[
                        { value: "minimal", label: "Minimal" },
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                      label="Reasoning Effort"
                      icon={<BrainIcon className="size-3.5" />}
                    />
                    <PromptInputDropdownSelect
                      value={reasoningSummary || "none"}
                      onValueChange={(value) =>
                        setReasoningSummary(
                          value === "none"
                            ? undefined
                            : (value as "auto" | "detailed"),
                        )
                      }
                      options={[
                        { value: "none", label: "None" },
                        { value: "auto", label: "Auto" },
                        { value: "detailed", label: "Detailed" },
                      ]}
                      label="Reasoning Summary"
                      icon={<ListMinusIcon className="size-3.5" />}
                    />
                  </PromptInputTools>
                  <PromptInputSubmit disabled={!input} status={status} />
                </PromptInputToolbar>
              </PromptInput>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
