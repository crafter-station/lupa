import { z } from "zod/v3";

export const DocumentNameSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$/, "Invalid name");

export const FolderPathSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^(\/[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?)*\/$/, "Invalid folder");

export const CatPathSchema = z
  .string()
  .min(1)
  .regex(/^\//, "Path must start with /")
  .regex(/\.md$/, "Path must end with .md");
