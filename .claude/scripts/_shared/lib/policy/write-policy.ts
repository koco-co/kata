export type WriteBlockReason =
  | "repos_read_only"
  | "absolute_path"
  | "path_traversal"
  | "protected_contract"
  | "undeclared_scope";

export type WriteDecision = {
  allowed: boolean;
  reason?: WriteBlockReason;
};

export type WriteRequest = {
  path: string;
  declaredWriteScopes: string[];
};

const WORKSPACE_FEATURE_SCOPE = "workspace/*/features/**";

function normalizeSeparators(path: string): string {
  return path.replace(/\\/g, "/");
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:\//.test(path) || path.startsWith("//");
}

function normalizeRelativePath(path: string): {
  path: string;
  hadTraversal: boolean;
  escapedRoot: boolean;
} {
  const parts = path.split("/");
  const normalized: string[] = [];
  let hadTraversal = false;
  let escapedRoot = false;

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      hadTraversal = true;
      if (normalized.length === 0) {
        escapedRoot = true;
        continue;
      }
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }

  return { path: normalized.join("/"), hadTraversal, escapedRoot };
}

function isReposPath(path: string): boolean {
  return /^(?:workspace\/[^/]+\/(?:\.repos|\.kata\/repos)|\.kata\/repos)(?:\/|$)/i.test(path);
}

function isProtectedContractPath(path: string): boolean {
  return /^\.(?:claude|agents)\/contracts(?:\/|$)/i.test(path);
}

function matchesWorkspaceFeature(path: string): boolean {
  return /^workspace\/[^/]+\/features\/.+/.test(path);
}

function isAllowedByDeclaredScopes(path: string, scopes: string[]): boolean {
  for (const scope of scopes.map(normalizeSeparators)) {
    if (scope === WORKSPACE_FEATURE_SCOPE && matchesWorkspaceFeature(path)) {
      return true;
    }
    if (/^workspace\/[^/]+\/features\/\*\*$/.test(scope)) {
      const prefix = scope.slice(0, -"**".length);
      if (path.startsWith(prefix) && path.length > prefix.length) return true;
    }
    if (scope === path) {
      return true;
    }
  }
  return false;
}

export function evaluateWrite(request: WriteRequest): WriteDecision {
  const normalizedInput = normalizeSeparators(request.path);
  if (isAbsolutePath(normalizedInput)) return { allowed: false, reason: "absolute_path" };

  const normalized = normalizeRelativePath(normalizedInput);
  if (normalized.escapedRoot) return { allowed: false, reason: "path_traversal" };
  if (isReposPath(normalized.path)) return { allowed: false, reason: "repos_read_only" };
  if (isProtectedContractPath(normalized.path))
    return { allowed: false, reason: "protected_contract" };
  if (normalized.hadTraversal) return { allowed: false, reason: "path_traversal" };
  if (isAllowedByDeclaredScopes(normalized.path, request.declaredWriteScopes))
    return { allowed: true };

  return { allowed: false, reason: "undeclared_scope" };
}

export const blockReposWrite = evaluateWrite;
export const blockUnsafeAbsolutePath = evaluateWrite;
