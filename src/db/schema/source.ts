import z from "zod";
import { BaseConvexSchema } from "./convex";

const BaseSourceInsertSchema = {
  id: z.string(),
  url: z.url(),
  bucketId: z.string(),
  revalidateAt: z.string(), // CRON expression
};

const BaseWebsiteSourceSchema = {
  type: z.literal("website"),
  metadata: z.object({
    title: z.string(),
    favicon: z.url(),
  }),
};

const BaseUploadSourceSchema = {
  type: z.literal("upload"),
  metadata: z.object({
    filename: z.string(),
    size: z.number(),
  }),
};

export const SourceSelectSchema = z.discriminatedUnion("type", [
  z.object({
    ...BaseConvexSchema,
    ...BaseSourceInsertSchema,
    ...BaseWebsiteSourceSchema,
  }),
  z.object({
    ...BaseConvexSchema,
    ...BaseSourceInsertSchema,
    ...BaseUploadSourceSchema,
  }),
]);

export type SourceSelect = z.infer<typeof SourceSelectSchema>;

export const SourceInsertSchema = z.discriminatedUnion("type", [
  z.object({
    ...BaseSourceInsertSchema,
    ...BaseWebsiteSourceSchema,
  }),
  z.object({
    ...BaseSourceInsertSchema,
    ...BaseUploadSourceSchema,
  }),
]);

export type SourceInsert = z.infer<typeof SourceInsertSchema>;

const source1 = SourceSelectSchema.parse({
  type: "website",
  url: new URL("https://www.google.com"),
  bucketId: "123",
  revalidateAt: "0 0 * * *", // every day at midnight
  metadata: {
    title: "Google",
    favicon: new URL("https://www.google.com/favicon.ico"),
  },
});

if (source1.type === "upload") {
  console.log(source1.metadata);
} else {
  console.log(source1.metadata);
}
