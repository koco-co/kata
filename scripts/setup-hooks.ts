#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { locateProjectRoot } from "../cli/lib/workspace-locator.ts";

const root = locateProjectRoot();
const hook = join(root, ".githooks", "pre-push");
if (!existsSync(hook)) {
  throw new Error(`kata: pre-push hook not found at ${hook}`);
}
execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
});
console.log("kata: git hooks enabled (.githooks/pre-push)");
