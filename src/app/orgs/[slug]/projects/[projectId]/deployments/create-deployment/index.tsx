"use client";

import { LoaderIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CreateDeploymentAction } from "./action";

export const CreateDeployment = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const [state, action, pending] = React.useActionState(
    CreateDeploymentAction,
    {
      ok: false,
      error: "",
      form_data: {
        projectId,
        name: undefined,
      },
    },
  );

  React.useEffect(() => {
    if (state.ok) {
      router.push(state.action_data.url);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <Button type="submit" disabled={pending} className="group gap-0">
        Create Deployment
        <LoaderIcon className="opacity-0 group-disabled:opacity-100 size-0 group-disabled:size-4 group-disabled:animate-spin transition-all group-disabled:ml-2" />
      </Button>
    </form>
  );
};
