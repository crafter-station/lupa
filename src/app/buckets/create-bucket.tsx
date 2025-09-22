"use client";

import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { BucketInsert } from "@/db";
import { generateId } from "@/lib/generate-id";

export function CreateBucket() {
  const createBucket = useMutation(api.bucket.create);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    createBucket({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      id: generateId(),
    } satisfies BucketInsert);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input id="name" type="text" placeholder="Bucket Name" name="name" />
      <Textarea
        id="description"
        placeholder="Bucket Description"
        name="description"
      />
      <Button type="submit">Create Bucket</Button>
    </form>
  );
}
