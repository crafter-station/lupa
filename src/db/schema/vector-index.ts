import z from "zod";
import { BaseConvexSchema } from "./convex";

export const VectorIndexSchemaSelect = z.object({
  ...BaseConvexSchema,

  id: z.string(),

  url: z.string(),
  token: z.string(),
});

export const VectorIndexSchemaInsert = VectorIndexSchemaSelect.omit({
  _id: true,
  _creationTime: true,
});

export type VectorIndexSelect = z.infer<typeof VectorIndexSchemaSelect>;
export type VectorIndexInsert = z.infer<typeof VectorIndexSchemaInsert>;
