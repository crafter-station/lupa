import { pythonExtension } from "@trigger.dev/python/extension";
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_xwzukpjplzmgfhwumrhd",
  runtime: "node",
  logLevel: "log",
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      pythonExtension({
        scripts: ["./src/python/**/*.py"],
        requirementsFile: "./src/python/requirements.txt",
        devPythonBinaryPath: "./src/python/.venv/bin/python",
      }),
    ],
  },
});
