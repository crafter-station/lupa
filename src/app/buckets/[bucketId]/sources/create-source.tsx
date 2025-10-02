"use client";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { useParams } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateSource() {
  const createSource = useMutation(api.source.create);
  const { bucketId } = useParams<{ bucketId: string }>();

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      createSource({
        type: "website",
        url: formData.get("url") as string,
        bucketId: bucketId,
        description: formData.get("description") as string,
        name: formData.get("name") as string,
      });
    },
    [createSource, bucketId],
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
