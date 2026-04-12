import { lstatSync } from "node:fs";
import { join } from "node:path";
import type { AiCoreIssue } from "./types.ts";

type SymlinkComponentIssueOptions = {
  root: string;
  relativePath: string;
  code: string;
  message: string;
};

export function symlinkPathComponentIssue(
  options: SymlinkComponentIssueOptions,
): AiCoreIssue | undefined {
  const parts = options.relativePath.split("/").filter(Boolean);
  let current = options.root;
  const displayParts: string[] = [];
  for (const part of parts) {
    current = join(current, part);
    displayParts.push(part);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        return {
          code: options.code,
          severity: "error",
          message: options.message,
          path: displayParts.join("/"),
        };
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}
