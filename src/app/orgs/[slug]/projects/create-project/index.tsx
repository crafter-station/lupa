"use client";

import { LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { CreateProjectAction } from "./action";

export function CreateProject() {
  const [open, setOpen] = React.useState(false);

  const router = useRouter();

  const [state, action, pending] = React.useActionState(CreateProjectAction, {
    ok: false,
    error: "",
    form_data: {
      name: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.push(state.action_data.url);
    }
  }, [router, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form action={action}>
          <Input
            id="name"
            type="text"
            placeholder="Project Name"
            name="name"
            required
          />
          <Textarea
            id="description"
            placeholder="Project Description"
            name="description"
          />
          <Button type="submit" disabled={pending} className="group gap-0">
            Create Project
            <LoaderIcon className="opacity-0 group-disabled:opacity-100 size-0 group-disabled:size-4 group-disabled:animate-spin transition-all group-disabled:ml-2" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
