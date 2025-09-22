import z from "zod";
import { BaseConvexSchema } from "./_convex";

export const VECTOR_INDEX_TABLE = "vector_index";

export const VectorIndexSelectSchema = z.object({
  ...BaseConvexSchema,
  id: z.string(),
  url: z.string(),
  token: z.string(),
});

export const VectorIndexInsertSchema = VectorIndexSelectSchema.omit({
  _id: true,
  _creationTime: true,
});

export type VectorIndexSelect = z.infer<typeof VectorIndexSelectSchema>;
export type VectorIndexInsert = z.infer<typeof VectorIndexInsertSchema>;
