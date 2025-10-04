"use client";
import { useParams } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SourceCollection } from "@/db/collections";
import { generateId } from "@/lib/generate-id";

export function CreateSource() {
  const { bucketId } = useParams<{ bucketId: string }>();

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      SourceCollection.insert({
        id: generateId(),
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        bucket_id: bucketId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    [bucketId],
  );

  return (
    <form onSubmit={handleSubmit}>
      <Input id="name" type="text" placeholder="Name" name="name" />
      <Input id="url" type="text" placeholder="URL" name="url" />
      <Textarea
        id="description"
        placeholder="Source Description"
        name="description"
      />
      <Button type="submit">Create Source</Button>
    </form>
  );
}
