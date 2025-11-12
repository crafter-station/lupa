"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  className?: string;
}

function createBadgeElement(filePath: string): HTMLElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.className =
    "inline-flex items-center gap-1 text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded text-sm align-middle";
  span.dataset.fileTag = filePath;

  const icon = document.createElement("span");
  icon.className = "text-[10px]";
  icon.textContent = "📄";

  const path = document.createElement("span");
  path.textContent = `@${filePath}`;

  span.appendChild(icon);
  span.appendChild(path);

  return span;
}

function renderRichContent(text: string, container: HTMLElement) {
  const pattern = /@(\/[\w\-/.]+)/g;
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match = pattern.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(
        document.createTextNode(text.substring(lastIndex, match.index)),
      );
    }

    const badge = createBadgeElement(match[1]);
    fragment.appendChild(badge);

    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
  }

  container.innerHTML = "";
  container.appendChild(fragment);
}

function serializeToPlainText(container: HTMLElement): string {
  let result = "";

  for (const node of container.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const filePath = el.dataset.fileTag;
      if (filePath) {
        result += `@${filePath}`;
      } else {
        result += el.textContent || "";
      }
    }
  }

  return result;
}

export const RichTextarea = forwardRef<HTMLDivElement, RichTextareaProps>(
  ({ value, onChange, onKeyDown, placeholder, className }, ref) => {
    const editableRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => editableRef.current as HTMLDivElement);

    useEffect(() => {
      if (editableRef.current) {
        const currentText = serializeToPlainText(editableRef.current);
        if (currentText !== value) {
          renderRichContent(value, editableRef.current);
        }
      }
    }, [value]);

    useEffect(() => {
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = value;
      }
    }, [value]);

    const handleInput = () => {
      if (editableRef.current) {
        const plainText = serializeToPlainText(editableRef.current);
        onChange(plainText);

        if (hiddenInputRef.current) {
          hiddenInputRef.current.value = plainText;
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);

      if (e.defaultPrevented) {
        return;
      }

      if (e.key === "Backspace") {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);

        if (!range.collapsed) {
          setTimeout(() => handleInput(), 0);
          return;
        }

        const { startContainer, startOffset } = range;

        if (startContainer.nodeType === Node.TEXT_NODE && startOffset === 0) {
          const prevSibling = startContainer.previousSibling;
          if (prevSibling?.nodeType === Node.ELEMENT_NODE) {
            const el = prevSibling as HTMLElement;
            if (el.dataset.fileTag) {
              e.preventDefault();
              el.remove();
              handleInput();
              return;
            }
          }
        }

        if (startContainer.nodeType === Node.ELEMENT_NODE) {
          const container = startContainer as HTMLElement;
          const childBefore = container.childNodes[startOffset - 1];
          if (childBefore?.nodeType === Node.ELEMENT_NODE) {
            const el = childBefore as HTMLElement;
            if (el.dataset.fileTag) {
              e.preventDefault();
              el.remove();
              handleInput();
              return;
            }
          }
        }
      }

      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        const form = editableRef.current?.closest("form");
        if (form) {
          form.requestSubmit();
        }
      }
    };

    return (
      <>
        <input
          ref={hiddenInputRef}
          type="hidden"
          name="message"
          value={value}
        />
        <div
          ref={editableRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full resize-none p-3 outline-none",
            "field-sizing-content bg-transparent",
            "max-h-48 min-h-16 overflow-y-auto",
            "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none",
            className,
          )}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      </>
    );
  },
);

RichTextarea.displayName = "RichTextarea";
