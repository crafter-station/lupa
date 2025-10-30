import { python } from "@trigger.dev/python";
import { task } from "@trigger.dev/sdk";

export const trytonTask = task({
  id: "tryton",

  run: async () => {
    const result = await python.runScript("./src/python/count_tokens.py", [
      "Hello world!!",
    ]);
    const tokensCount = Number.parseInt(result.stdout.trim());

    return tokensCount;
  },
});
