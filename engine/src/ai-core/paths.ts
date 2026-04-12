import { join, resolve } from "node:path";

export function repoRoot(): string {
  return resolve(import.meta.dirname, "../../..");
}

export function aiCoreRoot(): string {
  return join(repoRoot(), ".ai", "core");
}

export function fromRepoRoot(...parts: string[]): string {
  return join(repoRoot(), ...parts);
}
