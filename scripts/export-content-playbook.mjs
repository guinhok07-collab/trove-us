/**
 * Export CONTENT-PLAYBOOK.md to marketing/social + Desktop.
 */
import { writeFileSync, mkdirSync, cpSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildPlaybookMarkdown } from "./lib/trove-social-playbook.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "marketing/social/CONTENT-PLAYBOOK.md");
const md = buildPlaybookMarkdown();
writeFileSync(out, md, "utf8");
console.log("Wrote", out);

const desktop = resolve(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "OneDrive/Desktop/Trove-Redes-Sociais",
);
mkdirSync(desktop, { recursive: true });
cpSync(out, resolve(desktop, "CONTENT-PLAYBOOK.md"));
console.log("Copied →", resolve(desktop, "CONTENT-PLAYBOOK.md"));
