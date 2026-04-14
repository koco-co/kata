import type { AiCoreResult } from "../ai-core/types.ts";
import type { CapabilityRequired } from "../plugins/sandbox/capability-spec.ts";
import {
  checkFsAccess,
  checkNetworkAccess,
  parseCapabilityRequired,
} from "../plugins/sandbox/capability-spec.ts";

export type SandboxIsolationPolicy = {
  pluginId: string;
  capability: CapabilityRequired;
  secretResolved: boolean;
  isolation: "best_effort" | "hard_isolation";
  auditEnabled: boolean;
};

export function enforceSandboxIsolation(manifest: {
  id: string;
  capability_required?: unknown;
}): AiCoreResult<SandboxIsolationPolicy> {
  if (!manifest.capability_required) {
    return {
      ok: true,
      value: {
        pluginId: manifest.id,
        capability: { fs_read: [], fs_write: [], net: [], secret_refs: [] },
        secretResolved: false,
        isolation: "best_effort",
        auditEnabled: false,
      },
      issues: [
        {
          code: "plugin_policy.sandbox_missing_capability",
          severity: "warning",
          message: `Plugin ${manifest.id} does not declare capability_required. Sandbox isolation will be best-effort.`,
          path: "capability_required",
          contractId: manifest.id,
        },
      ],
    };
  }

  const parsed = parseCapabilityRequired(manifest.capability_required);
  if (!parsed.ok) return parsed;

  const cap = parsed.value!;
  const auditEnabled = cap.net.length > 0 || cap.fs_read.length > 0 || cap.fs_write.length > 0;

  return {
    ok: true,
    value: {
      pluginId: manifest.id,
      capability: cap,
      secretResolved: cap.secret_refs.length > 0,
      isolation: "best_effort",
      auditEnabled,
    },
    issues: [],
  };
}

export function enforceNetworkAllowlist(
  policy: SandboxIsolationPolicy,
  targetUrl: string,
): AiCoreResult<null> {
  const result = checkNetworkAccess(policy.capability.net, targetUrl);
  if (!result.allowed) {
    return { ok: false, value: null, issues: result.violations };
  }
  return { ok: true, value: null, issues: [] };
}

export function enforceFsCapability(
  policy: SandboxIsolationPolicy,
  targetPath: string,
  mode: "read" | "write",
): AiCoreResult<null> {
  const allowedPaths = mode === "read" ? policy.capability.fs_read : policy.capability.fs_write;
  const result = checkFsAccess(allowedPaths, targetPath);
  if (!result.allowed) {
    return { ok: false, value: null, issues: result.violations };
  }
  return { ok: true, value: null, issues: [] };
}

export const enforceSandboxIsolationPolicy = enforceSandboxIsolation;
export const enforceNetworkAllowlistPolicy = enforceNetworkAllowlist;
export const enforceFsCapabilityPolicy = enforceFsCapability;
