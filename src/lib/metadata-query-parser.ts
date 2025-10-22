import type { MetadataFilter } from "@/lib/types/search";

export interface UpstashMetadataFilter {
  [key: string]:
    | string
    | number
    | boolean
    | {
        $eq?: unknown;
        $ne?: unknown;
        $gt?: number;
        $gte?: number;
        $lt?: number;
        $lte?: number;
        $in?: unknown[];
        $nin?: unknown[];
      };
}

export function parseMetadataFilters(
  searchParams: URLSearchParams,
): MetadataFilter[] {
  const filters: MetadataFilter[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith("metadata.")) continue;

    const metadataKey = key.slice("metadata.".length);
    const parsed = parseFilterValue(metadataKey, value);

    if (parsed) {
      filters.push(parsed);
    }
  }

  return filters;
}

function parseFilterValue(key: string, value: string): MetadataFilter | null {
  const operators = [">=", "<=", "!=", "~", ">", "<", "="];

  for (const op of operators) {
    if (value.includes(op)) {
      const parts = value.split(op);
      if (parts.length === 2) {
        const [_, rawValue] = parts;
        return {
          key,
          operator: op as MetadataFilter["operator"],
          value: coerceValue(rawValue.trim()),
        };
      }
    }
  }

  return {
    key,
    operator: "=",
    value: coerceValue(value),
  };
}

function coerceValue(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;

  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== "") {
    return num;
  }

  return value;
}

export function convertToUpstashFilter(
  filters: MetadataFilter[],
  documentIds?: string[],
): string | undefined {
  if (filters.length === 0 && (!documentIds || documentIds.length === 0)) {
    return undefined;
  }

  const conditions: string[] = [];

  if (documentIds && documentIds.length > 0) {
    if (documentIds.length === 1) {
      conditions.push(`documentId = '${documentIds[0]}'`);
    } else {
      const docConditions = documentIds.map((id) => `documentId = '${id}'`);
      conditions.push(`(${docConditions.join(" OR ")})`);
    }
  }

  for (const filter of filters) {
    const { key, operator, value } = filter;
    const formattedValue = typeof value === "string" ? `'${value}'` : value;

    switch (operator) {
      case "=":
        conditions.push(`${key} = ${formattedValue}`);
        break;
      case "!=":
        conditions.push(`${key} != ${formattedValue}`);
        break;
      case ">":
        conditions.push(`${key} > ${formattedValue}`);
        break;
      case "<":
        conditions.push(`${key} < ${formattedValue}`);
        break;
      case ">=":
        conditions.push(`${key} >= ${formattedValue}`);
        break;
      case "<=":
        conditions.push(`${key} <= ${formattedValue}`);
        break;
      case "~":
        conditions.push(`${key} LIKE '%${value}%'`);
        break;
    }
  }

  return conditions.length > 0 ? conditions.join(" AND ") : undefined;
}
