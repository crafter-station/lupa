"use client";
import { useOrganization } from "@clerk/nextjs";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProjectCollection } from "@/db/collections";
import { generateId } from "@/lib/generate-id";

export function CreateProject() {
  const [open, setOpen] = React.useState(false);
  const { organization } = useOrganization();

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);

      ProjectCollection.insert({
        id: generateId(),
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        production_deployment_id: null,
        staging_deployment_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        org_id: organization?.id ?? "",
      });

      setOpen(false);
    },
    [organization],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Input id="name" type="text" placeholder="Project Name" name="name" />
          <Textarea
            id="description"
            placeholder="Project Description"
            name="description"
          />
          <Button type="submit">Create Project</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
