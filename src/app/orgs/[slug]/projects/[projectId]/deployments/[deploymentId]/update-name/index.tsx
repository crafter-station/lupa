"use client";

import { useParams } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { UpdateDeploymentNameAction } from "./action";

export const UpdateName = ({ initialName }: { initialName: string }) => {
  const { projectId, deploymentId } = useParams<{
    projectId: string;
    deploymentId: string;
  }>();

  const [state, action, pending] = React.useActionState(
    UpdateDeploymentNameAction,
    {
      ok: false,
      error: "",
      form_data: {
        projectId,
        deploymentId,
        name: initialName,
      },
    },
  );

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Deployment name updated");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="projectId" defaultValue={projectId} />
      <input type="hidden" name="deploymentId" defaultValue={deploymentId} />
      <Input
        name="name"
        defaultValue={initialName}
        disabled={pending}
        className="not-active:border-transparent not-active:shadow-transparent px-1"
        onBlur={(e) => {
          if (e.target.value !== initialName) {
            e.target.form?.requestSubmit();
          }
        }}
      />
    </form>
  );
};
