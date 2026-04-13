import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { repoRoot } from "../../lib/paths.ts";

export interface EnvProbeResult {
  ok: boolean;
  reason?: string;
}

export interface EnvCheckContext {
  project: string;
  env: string;
  repoRoot?: string;
  probe?: (cfg: Record<string, unknown>) => Promise<EnvProbeResult>;
}

async function defaultProbe(): Promise<EnvProbeResult> {
  try {
    execFileSync("dtstack-cli", ["--help"], { stdio: "ignore" });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runEnvCheck(
  ctx: EnvCheckContext,
): Promise<{ baseUrl: string; tenant: string; dtstackReachable: boolean; reason?: string }> {
  const root = ctx.repoRoot ?? repoRoot();
  const envPath = join(root, "workspace", ctx.project, "_shared/env", `${ctx.env}.yaml`);
  if (!existsSync(envPath)) {
    return {
      baseUrl: "",
      tenant: "",
      dtstackReachable: false,
      reason: `env profile not found: ${envPath}`,
    };
  }
  const cfg = parse(readFileSync(envPath, "utf-8"));
  const probe = await (ctx.probe ?? defaultProbe)(cfg);
  return {
    baseUrl: cfg.base_url ?? "",
    tenant: cfg.tenant_name ?? "",
    dtstackReachable: probe.ok,
    reason: probe.reason,
  };
}
