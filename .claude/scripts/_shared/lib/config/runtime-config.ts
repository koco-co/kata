import type { KataIssue, KataResult } from "@shared/lib/result-types.ts";

export type RuntimeConfig = {
  targetEnv: string;
};

const SECRET_LIKE_ENV_PATTERN =
  /(?:TOKEN|COOKIE|SECRET|PASSWORD|API_KEY|ACCESS_KEY|PRIVATE_KEY|WEBHOOK)/i;
const SECRET_LIKE_ALLOWLIST = new Set(["KATA_TARGET_ENV", "KATA_PROJECT", "KATA_WORKSPACE"]);
export const SECRET_REF_ENV_PREFIX = "KATA_SECRET_REF_";
const SECRET_REF_ENV_NAME_PATTERN_TEXT = "^KATA_SECRET_REF_[A-Z0-9_]+$";
export const SECRET_REF_ENV_NAME_PATTERN = /^KATA_SECRET_REF_[A-Z0-9_]+$/;
const SECRET_REF_VALUE_PATTERN_TEXT = "^secret://[A-Za-z0-9._-]+/[A-Za-z0-9._-]+/[A-Za-z0-9._/-]+$";
export const SECRET_REF_VALUE_PATTERN =
  /^secret:\/\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\/[A-Za-z0-9._/-]+$/;
const TARGET_ENV_PATTERN = /^[A-Za-z0-9._-]+$/;
const RUNTIME_ENV_NAMES_TO_SCAN = new Set([
  "KATA_PROJECT",
  "KATA_WORKSPACE",
  "KATA_TARGET_ENV",
  "KATA_RUNTIME_ALPHA",
]);

function issue(
  code: string,
  message: string,
  path: string,
  severity: "error" | "warning" = "error",
): KataIssue {
  return { code, severity, message, path };
}

export function isRuntimeConfigEnvName(name: string): boolean {
  const upperName = name.toUpperCase();
  return (
    name.startsWith(SECRET_REF_ENV_PREFIX) ||
    upperName.startsWith(SECRET_REF_ENV_PREFIX) ||
    RUNTIME_ENV_NAMES_TO_SCAN.has(name) ||
    RUNTIME_ENV_NAMES_TO_SCAN.has(upperName) ||
    (upperName.startsWith("KATA_") && SECRET_LIKE_ENV_PATTERN.test(name))
  );
}

export function resolveRuntimeConfig(input: {
  env: Record<string, string | undefined>;
}): KataResult<RuntimeConfig> {
  const issues: KataIssue[] = [];

  for (const [name, value] of Object.entries(input.env)) {
    if (value === undefined || SECRET_LIKE_ALLOWLIST.has(name)) {
      continue;
    }
    if (name.startsWith(SECRET_REF_ENV_PREFIX)) {
      if (!SECRET_REF_ENV_NAME_PATTERN.test(name)) {
        issues.push(
          issue(
            "secret_ref.name_invalid",
            `Secret ref env var name must match ${SECRET_REF_ENV_NAME_PATTERN_TEXT}: ${name}`,
            `env.${name}`,
          ),
        );
      }
      if (!SECRET_REF_VALUE_PATTERN.test(value)) {
        issues.push(
          issue(
            "secret_ref.invalid",
            `Secret ref env var must match ${SECRET_REF_VALUE_PATTERN_TEXT}: ${name}`,
            `env.${name}`,
          ),
        );
      }
      continue;
    }
    if (SECRET_LIKE_ENV_PATTERN.test(name) && !SECRET_LIKE_ALLOWLIST.has(name)) {
      issues.push(
        issue(
          "secret_env.blocked",
          `Raw secret-like env var is not accepted in runtime config: ${name}`,
          `env.${name}`,
        ),
      );
    }
  }

  const targetEnv = input.env.KATA_TARGET_ENV ?? "local";
  if (!TARGET_ENV_PATTERN.test(targetEnv)) {
    issues.push(
      issue(
        "config.target_env_invalid",
        `KATA_TARGET_ENV must match ${TARGET_ENV_PATTERN.source}.`,
        "env.KATA_TARGET_ENV",
      ),
    );
  }

  const ok = issues.every((found) => found.severity !== "error");
  return {
    ok,
    value: ok ? { targetEnv } : undefined,
    issues,
  };
}
