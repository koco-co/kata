import type { KataIssue, KataResult } from "@shared/lib/result-types.ts";

export type CapabilityRequired = {
  fs_read: string[];
  fs_write: string[];
  net: string[];
  secret_refs: string[];
};

export type CapabilityCheckResult = {
  allowed: boolean;
  violations: KataIssue[];
};

const WILDCARD_PATTERN = /^(\*\.)?[a-zA-Z0-9][-a-zA-Z0-9.]*$/;

export function parseCapabilityRequired(raw: unknown): KataResult<CapabilityRequired> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      issues: [
        {
          code: "capability.invalid_spec",
          severity: "error",
          message: "capability_required must be an object.",
          path: "capability_required",
        },
      ],
    };
  }

  const obj = raw as Record<string, unknown>;
  const fs_read = parseStringArray(obj.fs_read, "capability_required.fs_read");
  const fs_write = parseStringArray(obj.fs_write, "capability_required.fs_write");
  const net = parseStringArray(obj.net, "capability_required.net");
  const secret_refs = parseStringArray(obj.secret_refs, "capability_required.secret_refs");

  const issues: KataIssue[] = [];
  if (!fs_read.ok) issues.push(...fs_read.issues);
  if (!fs_write.ok) issues.push(...fs_write.issues);
  if (!net.ok) issues.push(...net.issues);
  if (!secret_refs.ok) issues.push(...secret_refs.issues);

  if (issues.length > 0) return { ok: false, issues };

  // Validate network patterns
  for (const host of net.value ?? []) {
    if (!WILDCARD_PATTERN.test(host)) {
      issues.push({
        code: "capability.invalid_net_pattern",
        severity: "error",
        message: `Invalid network host pattern: ${host}`,
        path: "capability_required.net",
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      fs_read: fs_read.value ?? [],
      fs_write: fs_write.value ?? [],
      net: net.value ?? [],
      secret_refs: secret_refs.value ?? [],
    },
    issues: [],
  };
}

export function checkNetworkAccess(
  allowedHosts: string[],
  targetUrl: string,
): CapabilityCheckResult {
  try {
    const hostname = new URL(targetUrl).hostname;
    const allowed = allowedHosts.some((pattern) => matchHostPattern(pattern, hostname));
    return {
      allowed,
      violations: allowed
        ? []
        : [
            {
              code: "sandbox.net_violation",
              severity: "error",
              message: `Network access denied: ${hostname} not in allowlist`,
              path: "sandbox.net",
            },
          ],
    };
  } catch {
    return {
      allowed: false,
      violations: [
        {
          code: "sandbox.invalid_url",
          severity: "error",
          message: `Invalid URL: ${targetUrl}`,
          path: "sandbox.net",
        },
      ],
    };
  }
}

export function checkFsAccess(allowedPaths: string[], targetPath: string): CapabilityCheckResult {
  const normalized = targetPath.replace(/\/+$/, "");
  const allowed = allowedPaths.some((p) => {
    if (p.endsWith("*")) {
      return normalized.startsWith(p.slice(0, -1));
    }
    return normalized === p || normalized.startsWith(`${p}/`);
  });
  return {
    allowed,
    violations: allowed
      ? []
      : [
          {
            code: "sandbox.fs_violation",
            severity: "error",
            message: `Filesystem access denied: ${targetPath} not in allowlist`,
            path: "sandbox.fs",
          },
        ],
  };
}

function matchHostPattern(pattern: string, hostname: string): boolean {
  if (pattern === hostname) return true;
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // .example.com
    return hostname.endsWith(suffix) && hostname !== suffix.slice(1);
  }
  return false;
}

function parseStringArray(value: unknown, path: string): KataResult<string[]> {
  if (value === undefined || value === null) {
    return { ok: true, value: [], issues: [] };
  }
  if (!Array.isArray(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "capability.invalid_array",
          severity: "error",
          message: `${path} must be an array of strings.`,
          path,
        },
      ],
    };
  }
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0) {
      return {
        ok: false,
        issues: [
          {
            code: "capability.invalid_item",
            severity: "error",
            message: `${path} must contain only non-empty strings.`,
            path,
          },
        ],
      };
    }
  }
  return { ok: true, value: value as string[], issues: [] };
}
