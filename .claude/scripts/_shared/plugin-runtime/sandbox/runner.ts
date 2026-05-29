import type { KataResult } from "@shared/lib/result-types.ts";
import type { CapabilityRequired, CapabilityCheckResult } from "./capability-spec.ts";
import { checkFsAccess, checkNetworkAccess, parseCapabilityRequired } from "./capability-spec.ts";
import {
  createSecretChannel,
  type SecretSourceEntry,
  validateSecretRefs,
} from "./secret-injector.ts";

export type SandboxRunInput = {
  pluginId: string;
  capabilityRequired: CapabilityRequired;
  secretSources?: SecretSourceEntry[];
  pluginFn: (auditor: SandboxAuditor) => Promise<unknown>;
};

export type SandboxAuditEntry = {
  kind: "net_access" | "fs_read" | "fs_write" | "secret_resolve";
  target: string;
  allowed: boolean;
};

export type SandboxRunResult = {
  pluginId: string;
  isolation: "best_effort";
  output: unknown;
  audit: SandboxAuditEntry[];
};

export type SandboxAuditor = {
  audit: SandboxAuditEntry[];
  checkNet: (url: string) => CapabilityCheckResult;
  checkFsRead: (path: string) => CapabilityCheckResult;
  checkFsWrite: (path: string) => CapabilityCheckResult;
  resolveSecret: (ref: string) => string | undefined;
};

export function createSandboxAuditor(
  cap: CapabilityRequired,
  secretSources?: SecretSourceEntry[],
): SandboxAuditor {
  const audit: SandboxAuditEntry[] = [];
  const secretChannel =
    secretSources && cap.secret_refs.length > 0
      ? createSecretChannel(cap.secret_refs, secretSources)
      : undefined;

  return {
    audit,
    checkNet(url: string) {
      const result = checkNetworkAccess(cap.net, url);
      audit.push({ kind: "net_access", target: url, allowed: result.allowed });
      return result;
    },
    checkFsRead(path: string) {
      const result = checkFsAccess(cap.fs_read, path);
      audit.push({ kind: "fs_read", target: path, allowed: result.allowed });
      return result;
    },
    checkFsWrite(path: string) {
      const result = checkFsAccess(cap.fs_write, path);
      audit.push({ kind: "fs_write", target: path, allowed: result.allowed });
      return result;
    },
    resolveSecret(ref: string) {
      const resolved = secretChannel?.resolve(ref);
      audit.push({
        kind: "secret_resolve",
        target: ref,
        allowed: resolved !== undefined,
      });
      return resolved;
    },
  };
}

export async function runInSandbox(input: SandboxRunInput): Promise<KataResult<SandboxRunResult>> {
  const auditor = createSandboxAuditor(input.capabilityRequired, input.secretSources);

  // Validate secret refs are resolvable
  if (input.capabilityRequired.secret_refs.length > 0 && input.secretSources) {
    const channel = createSecretChannel(input.capabilityRequired.secret_refs, input.secretSources);
    const unresolvedIssues = validateSecretRefs(
      input.capabilityRequired.secret_refs,
      channel.listRefs(),
    );
    if (unresolvedIssues.length > 0) {
      return { ok: false, issues: unresolvedIssues };
    }
  }

  try {
    const output = await input.pluginFn(auditor);

    // Check audit for violations
    const violations = auditor.audit.filter((e) => !e.allowed);
    if (violations.length > 0) {
      return {
        ok: false,
        issues: violations.map((v) => ({
          code: `sandbox.${v.kind}_violation`,
          severity: "error",
          message: `Sandbox policy violation: ${v.kind} access to ${v.target}`,
          path: "sandbox",
        })),
      };
    }

    return {
      ok: true,
      value: {
        pluginId: input.pluginId,
        isolation: "best_effort",
        output,
        audit: auditor.audit,
      },
      issues: [],
    };
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: "sandbox.plugin_error",
          severity: "error",
          message: `Plugin execution failed: ${error instanceof Error ? error.message : String(error)}`,
          path: "sandbox",
        },
      ],
    };
  }
}

export function validatePluginCapabilities(
  manifestCapabilityRequired: unknown,
): KataResult<CapabilityRequired> {
  return parseCapabilityRequired(manifestCapabilityRequired);
}
