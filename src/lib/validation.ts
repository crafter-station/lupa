import { z } from "zod/v3";

export const DocumentNameSchema = z
  .string()
  .min(1, "Name is required")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Name can only contain letters (a-z, A-Z), numbers (0-9), hyphens (-), and underscores (_)",
  );

export const FolderPathSchema = z
  .string()
  .startsWith("/", "Folder path must start with /")
  .endsWith("/", "Folder path must end with /");
