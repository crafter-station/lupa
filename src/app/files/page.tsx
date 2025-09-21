"use client";

import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ThemeSwitcherMultiButton } from "@/components/elements/theme-switcher-multi-button";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const tasks = useQuery(api.tasks.get);
  const createMutation = useMutation(api.tasks.create);

  const { data: session } = authClient.useSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center rounded-full bg-primary text-primary-foreground w-10 h-10">
          <div>{session?.user?.name.split("")[0]}</div>
        </div>
        {session?.user?.email}
      </div>
      <ThemeSwitcherMultiButton />
      {tasks?.map(({ _id, text, _creationTime }) => (
        <div key={_id}>
          <div>{text}</div>
          <div>{new Date(_creationTime).toLocaleString()}</div>
        </div>
      ))}
      <button onClick={() => createMutation({ text: "Test" })} type="button">
        Create
      </button>
    </main>
  );
}
