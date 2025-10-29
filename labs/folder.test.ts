import { expect, test } from "bun:test";

const examples = {
  "/path/to/file.md": {
    folder: "/path/to/",
    file: "file.md",
  },
  "/path/to/file.txt": {
    folder: "/path/to/",
    file: "file.txt",
  },
  "/path/to/file": {
    folder: "/path/to/",
    file: "file",
  },
  "/file.md": {
    folder: "/",
    file: "file.md",
  },
  "/file.txt": {
    folder: "/",
    file: "file.txt",
  },
  "/file": {
    folder: "/",
    file: "file",
  },
};

function parsePath(path: string): { folder: string; file: string } {
  const parts = path.split("/");
  const file = parts.pop()!;
  const folder = `${parts.join("/")}/`;
  return { folder, file };
}

test("examples", () => {
  for (const [path, { folder, file }] of Object.entries(examples)) {
    const { folder: parsedFolder, file: parsedFile } = parsePath(path);
    console.log(parsedFolder, parsedFile);
    expect(parsedFolder).toBe(folder);
    expect(parsedFile).toBe(file);
  }
});
