"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BucketCollection } from "@/db/collections";
import { generateId } from "@/lib/generate-id";

export function CreateBucket() {
  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      BucketCollection.insert({
        id: generateId(),
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    [],
  );

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
