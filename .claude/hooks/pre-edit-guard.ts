#!/usr/bin/env bun
const stdin = await Bun.stdin.text();
let payload: { tool_name?: string; tool_input?: { file_path?: string } };
try {
  payload = JSON.parse(stdin);
} catch {
  process.exit(0);
}

if (process.env.KATA_BYPASS_HOOK === "1") process.exit(0);

const filePath = payload.tool_input?.file_path;
if (!filePath) process.exit(0);

if (
  filePath.includes("/.repos/") ||
  filePath.includes("/.kata/repos/") ||
  /(?:^|\/)workspace\/[^/]+\/\.kata\/repos(?:\/|$)/.test(filePath)
) {
  console.error(
    `[pre-edit-guard] BLOCKED: writes to source repository evidence are forbidden. Path: ${filePath}`,
  );
  console.error(`[pre-edit-guard] Override: KATA_BYPASS_HOOK=1 (use only for emergency).`);
  process.exit(2);
}

process.exit(0);
