"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import z from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateId } from "@/lib/generate-id";

type CreateProjectActionState = {
  form_data: {
    name?: string | undefined;
    description?: string | undefined;
  };
} & (
  | {
      ok: true;
      action_data: {
        url: string;
      };
    }
  | {
      ok: false;
      error: string;
    }
);

export const CreateProjectAction = async (
  _state: CreateProjectActionState,
  formData: FormData,
): Promise<CreateProjectActionState> => {
  try {
    const { name, description } = z
      .object({
        name: z.string().min(2).max(100),
        description: z.preprocess(
          (value) =>
            typeof value === "string"
              ? value.trim()?.length
                ? value.trim()
                : undefined
              : undefined,
          z.string().min(2).max(1000).optional(),
        ),
      })
      .parse(Object.fromEntries(formData));

    const session = await auth();

    if (!session.orgId) {
      throw new Error("User is not a member of any organization");
    }

    const id = generateId();

    await db.insert(schema.Project).values({
      id,
      name,
      description,
      org_id: session.orgId,
    });

    revalidatePath(`/orgs/${session.orgSlug}/projects`);
    revalidatePath(`/orgs/${session.orgSlug}/projects/${id}`);

    return {
      ok: true,
      action_data: {
        url: `/orgs/${session.orgSlug}/projects/${id}`,
      },
      form_data: {
        name,
        description,
      },
    };
  } catch (error) {
    console.error(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      form_data: {
        name: formData.get("name")?.toString(),
        description: formData.get("description")?.toString(),
      },
    };
  }
};
