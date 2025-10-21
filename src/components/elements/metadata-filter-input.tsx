"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { MetadataFilter } from "@/lib/types/search";

interface MetadataFilterInputProps {
  filters: MetadataFilter[];
  onFiltersChange: (filters: MetadataFilter[]) => void;
  availableKeys?: string[];
}

const operators: Array<{ value: MetadataFilter["operator"]; label: string }> = [
  { value: "=", label: "Equals" },
  { value: "!=", label: "Not Equals" },
  { value: ">", label: "Greater Than" },
  { value: "<", label: "Less Than" },
  { value: ">=", label: "Greater or Equal" },
  { value: "<=", label: "Less or Equal" },
  { value: "~", label: "Contains" },
];

export function MetadataFilterInput({
  filters,
  onFiltersChange,
  availableKeys = [],
}: MetadataFilterInputProps) {
  const handleAddFilter = () => {
    onFiltersChange([...filters, { key: "", operator: "=", value: "" }]);
  };

  const handleRemoveFilter = (index: number) => {
    onFiltersChange(filters.filter((_, i) => i !== index));
  };

  const handleUpdateFilter = (
    index: number,
    field: keyof MetadataFilter,
    value: string | number | boolean,
  ) => {
    const newFilters = [...filters];
    newFilters[index] = {
      ...newFilters[index],
      [field]: value,
    };
    onFiltersChange(newFilters);
  };

  const coerceValue = (value: string): string | number | boolean => {
    if (value === "true") return true;
    if (value === "false") return false;

    const num = Number(value);
    if (!Number.isNaN(num) && value.trim() !== "") {
      return num;
    }

    return value;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Metadata Filters</div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddFilter}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Filter
        </Button>
      </div>

      {filters.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6 border rounded-md bg-muted/30">
          No filters added. Click "Add Filter" to create one.
        </div>
      ) : (
        <>
          <Separator />
          <ScrollArea className="h-[180px] rounded-md border">
            <div className="p-2 space-y-2">
              {filters.map((filter, index) => (
                <div
                  key={`${filter.key}-${filter.operator}-${index}`}
                  className="flex items-center gap-2 p-2 rounded-md border bg-background"
                >
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <Input
                      placeholder="Key"
                      value={filter.key}
                      onChange={(e) =>
                        handleUpdateFilter(index, "key", e.target.value)
                      }
                      className="col-span-4 h-8 text-xs"
                      list={`keys-${index}`}
                    />
                    {availableKeys.length > 0 && (
                      <datalist id={`keys-${index}`}>
                        {availableKeys.map((key) => (
                          <option key={key} value={key} />
                        ))}
                      </datalist>
                    )}

                    <Select
                      value={filter.operator}
                      onValueChange={(value) =>
                        handleUpdateFilter(
                          index,
                          "operator",
                          value as MetadataFilter["operator"],
                        )
                      }
                    >
                      <SelectTrigger className="col-span-3 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Value"
                      value={String(filter.value)}
                      onChange={(e) =>
                        handleUpdateFilter(
                          index,
                          "value",
                          coerceValue(e.target.value),
                        )
                      }
                      className="col-span-4 h-8 text-xs"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFilter(index)}
                    className="flex-shrink-0 h-8 w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="text-xs text-muted-foreground">
            {filters.length} filter(s) applied
          </div>
        </>
      )}
    </div>
  );
}
