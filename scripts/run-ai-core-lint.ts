import { spawnSync } from "node:child_process";
import { join } from "node:path";

const repoRoot = process.cwd();
const kataBin = join(repoRoot, "engine/bin/kata");

const AI_CORE_ENV_TO_CLEAR = [
  "WORKSPACE_DIR",
  "PROJECT_NAME",
  "ACTIVE_ENV",
  "KATA_ENV",
  "ZENTAO_ACCOUNT",
  "DINGTALK_WEBHOOK_URL",
  "ZENTAO_BASE_URL",
  "FEISHU_WEBHOOK_URL",
  "WECOM_WEBHOOK_URL",
  "CI_BASE_URL",
  "LANHU_COOKIE",
  "ZENTAO_COOKIE",
  "ZENTAO_TOKEN",
  "OPENAI_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "SSH_PRIVATE_KEY",
  "CUSTOM_WEBHOOK",
  "CUSTOM_WEBHOOK_URL",
];

const commands = [
  ["ai-core", "lint", "--strict"],
  ["ai-core", "projection", "check", "--runtime", "all"],
  ["ai-core", "projection", "inventory"],
  ["ai-core", "schemas-compat-check"],
  ["ai-core", "preflight", "--runtime", "all"],
  ["ai-core", "context", "audit"],
  ["ai-core", "docs", "check"],
  ["ai-core", "parser", "audit"],
  ["ai-core", "gate", "--scope", "ga-completion"],
];

const env = { ...process.env };
for (const name of AI_CORE_ENV_TO_CLEAR) delete env[name];
for (const name of Object.keys(env)) {
  if (name.startsWith("KATA_SECRET_REF_")) delete env[name];
  if (
    name.startsWith("KATA_") &&
    /(?:TOKEN|COOKIE|SECRET|PASSWORD|API_KEY|ACCESS_KEY|PRIVATE_KEY|WEBHOOK)/i.test(name)
  ) {
    delete env[name];
  }
}

for (const args of commands) {
  const result = spawnSync("bun", ["--no-env-file", kataBin, ...args], {
    cwd: "/private/tmp",
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  if (result.error) throw result.error;
}
