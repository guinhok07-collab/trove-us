import { appendFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const logPath = resolve(root, "marketing/social/autopilot-log.jsonl");

export function appendLog(entry) {
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n", "utf8");
}
