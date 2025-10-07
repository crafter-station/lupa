"use client";

import { ChevronDown, ChevronUp, Code2, Info, Sparkles } from "lucide-react";
import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MetadataSchemaConfig } from "@/db/schema";
import { cn } from "@/lib/utils";

const SCHEMA_TEMPLATES = {
  blog: {
    name: "Blog Post",
    description: "Metadata for blog articles",
    schema: {
      properties: {
        title: { type: "string", description: "Article title" },
        author: { type: "string", description: "Author name" },
        publishDate: { type: "string", description: "Publication date" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Article tags",
        },
        category: { type: "string", description: "Article category" },
        readingTime: {
          type: "number",
          description: "Estimated reading time in minutes",
        },
      },
    },
  },
  api: {
    name: "API Documentation",
    description: "Metadata for API endpoints",
    schema: {
      properties: {
        endpoint: { type: "string", description: "API endpoint path" },
        httpMethod: {
          type: "string",
          description: "HTTP method (GET, POST, etc.)",
        },
        authentication: {
          type: "string",
          description: "Authentication method required",
        },
        version: { type: "string", description: "API version" },
        deprecated: {
          type: "boolean",
          description: "Is this endpoint deprecated?",
        },
        parameters: {
          type: "array",
          items: { type: "string" },
          description: "List of parameters",
        },
      },
    },
  },
  product: {
    name: "Product Documentation",
    description: "Metadata for product pages",
    schema: {
      properties: {
        productName: { type: "string", description: "Name of the product" },
        sku: { type: "string", description: "Product SKU" },
        category: { type: "string", description: "Product category" },
        price: { type: "number", description: "Product price in USD" },
        brand: { type: "string", description: "Brand name" },
        inStock: { type: "boolean", description: "Whether in stock" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Product tags",
        },
      },
    },
  },
  legal: {
    name: "Legal Document",
    description: "Metadata for legal documents",
    schema: {
      properties: {
        documentType: {
          type: "string",
          description: "Type (Contract, Agreement, Policy, etc.)",
        },
        parties: {
          type: "array",
          items: { type: "string" },
          description: "Names of parties involved",
        },
        jurisdiction: { type: "string", description: "Legal jurisdiction" },
        effectiveDate: { type: "string", description: "Effective date" },
        keyTerms: {
          type: "array",
          items: { type: "string" },
          description: "Key legal terms",
        },
      },
    },
  },
};

interface MetadataSchemaEditorProps {
  value?: MetadataSchemaConfig | null;
  onChange: (value: MetadataSchemaConfig | null) => void;
  disabled?: boolean;
}

export function MetadataSchemaEditor({
  value,
  onChange,
  disabled = false,
}: MetadataSchemaEditorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"infer" | "custom">(
    value?.mode || "infer",
  );
  const [schemaText, setSchemaText] = React.useState(
    value?.schema ? JSON.stringify(value.schema, null, 2) : "",
  );
  const [schemaError, setSchemaError] = React.useState<string | null>(null);

  const handleModeChange = React.useCallback(
    (newMode: "infer" | "custom") => {
      setMode(newMode);
      if (newMode === "infer") {
        onChange({ mode: "infer" });
        setSchemaText("");
        setSchemaError(null);
      } else {
        onChange({ mode: "custom", schema: undefined });
      }
    },
    [onChange],
  );

  const handleSchemaChange = React.useCallback(
    (text: string) => {
      setSchemaText(text);

      if (!text.trim()) {
        onChange({ mode: "custom", schema: undefined });
        setSchemaError(null);
        return;
      }

      try {
        const parsed = JSON.parse(text);
        onChange({ mode: "custom", schema: parsed });
        setSchemaError(null);
      } catch (error) {
        setSchemaError(error instanceof Error ? error.message : "Invalid JSON");
      }
    },
    [onChange],
  );

  const handleTemplateSelect = React.useCallback(
    (templateKey: string) => {
      if (templateKey === "none") {
        setSchemaText("");
        onChange({ mode: "custom", schema: undefined });
        return;
      }

      const template =
        SCHEMA_TEMPLATES[templateKey as keyof typeof SCHEMA_TEMPLATES];
      if (template) {
        const schemaJson = JSON.stringify(template.schema, null, 2);
        setSchemaText(schemaJson);
        onChange({ mode: "custom", schema: template.schema });
        setSchemaError(null);
      }
    },
    [onChange],
  );

  const handleToggle = React.useCallback((newValue: boolean) => {
    setIsOpen(newValue);
    if (!newValue) {
      setSchemaError(null);
    }
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <div
        className={cn(
          "rounded-lg border bg-card",
          isOpen && "border-primary/20",
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-accent/50 disabled:pointer-events-none disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Metadata Extraction</span>
              {value?.mode && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {value.mode === "infer" ? "Auto" : "Custom"}
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t p-4">
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <p>
                Extract structured metadata from your documents using AI. Choose
                automatic inference or define a custom schema.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata-mode">Extraction Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange("infer")}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all",
                    mode === "infer"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent/50",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Sparkles
                    className={cn(
                      "h-4 w-4",
                      mode === "infer"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <div className="text-sm font-medium">Auto Infer</div>
                    <div className="text-xs text-muted-foreground">
                      Extract basic metadata automatically
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange("custom")}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all",
                    mode === "custom"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent/50",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Code2
                    className={cn(
                      "h-4 w-4",
                      mode === "custom"
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <div className="text-sm font-medium">Custom Schema</div>
                    <div className="text-xs text-muted-foreground">
                      Define specific fields to extract
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {mode === "infer" && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <div className="mb-2 font-medium">Auto-extracted fields:</div>
                <div className="space-y-1 text-muted-foreground">
                  <div>• Category (e.g., "documentation", "tutorial")</div>
                  <div>• Keywords (key terms and concepts)</div>
                  <div>• Summary (brief description)</div>
                  <div>• Language (primary language)</div>
                  <div>• Content Type (article, guide, reference, etc.)</div>
                </div>
              </div>
            )}

            {mode === "custom" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="schema-template">Template (Optional)</Label>
                  <Select
                    onValueChange={handleTemplateSelect}
                    disabled={disabled}
                  >
                    <SelectTrigger id="schema-template">
                      <SelectValue placeholder="Choose a template to start..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {Object.entries(SCHEMA_TEMPLATES).map(
                        ([key, template]) => (
                          <SelectItem key={key} value={key}>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {template.description}
                              </div>
                            </div>
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schema-json">JSON Schema</Label>
                  <Textarea
                    id="schema-json"
                    value={schemaText}
                    onChange={(e) => handleSchemaChange(e.target.value)}
                    placeholder={`{\n  "properties": {\n    "fieldName": {\n      "type": "string",\n      "description": "Field description"\n    }\n  }\n}`}
                    disabled={disabled}
                    className={cn(
                      "min-h-[200px] font-mono text-xs",
                      schemaError && "border-destructive",
                    )}
                  />
                  {schemaError && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                      <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                      <span>{schemaError}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="mb-2 font-medium">Supported types:</div>
                  <div className="space-y-1">
                    <div>
                      • <code className="text-primary">string</code> - Text
                      fields
                    </div>
                    <div>
                      • <code className="text-primary">number</code> - Numeric
                      values
                    </div>
                    <div>
                      • <code className="text-primary">boolean</code> -
                      True/false
                    </div>
                    <div>
                      • <code className="text-primary">array</code> - Lists of
                      items
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
