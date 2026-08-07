#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { locateProjectRoot } from "../cli/lib/workspace-locator.ts";

const root = locateProjectRoot();
const commands: ReadonlyArray<readonly string[]> = [
  ["bun", ["run", "ci"]],
  ["bun", ["x", "tsc", "--noEmit", "-p", "cli/packages/dtstack-sdk/tsconfig.json"]],
];

for (const [command, args] of commands) {
  console.log(`kata: running ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
console.log("kata: pre-push checks passed");
