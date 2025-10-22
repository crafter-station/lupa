import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const htmlContent = readFileSync(join(__dirname, "content.html"), "utf-8");

function extractTextFromHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const extractedText = extractTextFromHTML(htmlContent);

writeFileSync(join(__dirname, "extracted-text.txt"), extractedText, "utf-8");

console.log("Text extracted and saved to extracted-text.txt");
