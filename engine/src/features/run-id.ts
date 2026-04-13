import { randomBytes } from "node:crypto";

export function generateRunId(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const min = String(now.getUTCMinutes()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex"); // 8 hex chars
  return `${yyyy}${mm}${dd}-${hh}${min}-${rand}`;
}
