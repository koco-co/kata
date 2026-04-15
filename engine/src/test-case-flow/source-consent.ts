export interface SourceConsent {
  granted: boolean;
  repos: Array<{ path: string; branch?: string; sha?: string }>;
  granted_at: string | null;
  reference_level: "full" | "none";
}

export function createSourceConsent(opts?: { reference_level?: "full" | "none" }): SourceConsent {
  const referenceLevel = opts?.reference_level ?? "none";
  return {
    granted: false,
    repos: [],
    granted_at: null,
    reference_level: referenceLevel,
  };
}

export function grantSourceConsent(opts: {
  repoPaths: string[];
  branch?: string;
  sha?: string;
}): SourceConsent {
  return {
    granted: true,
    repos: opts.repoPaths.map((path) => ({
      path,
      ...(opts.branch ? { branch: opts.branch } : {}),
      ...(opts.sha ? { sha: opts.sha } : {}),
    })),
    granted_at: new Date().toISOString(),
    reference_level: "full",
  };
}

export function revokeSourceConsent(consent: SourceConsent): SourceConsent {
  return {
    ...consent,
    granted: false,
  };
}
