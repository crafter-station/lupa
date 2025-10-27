import { readFileSync } from "node:fs";
import { z } from "zod/v3";

const data = new FormData();
data.append("name", "Anthony");

const file = new File([readFileSync("README.md")], "README.md", {
  type: "text/markdown",
});
data.append("file", file);

console.log();

const { name, file: parsedFile } = z
  .object({
    name: z.string(),
    file: z.instanceof(File),
  })
  .parse(Object.fromEntries(data));

console.log(name);
console.log("File name:", parsedFile.name);
console.log("File type:", parsedFile.type);
console.log("File size:", parsedFile.size);
console.log("File contents:", await parsedFile.text());
