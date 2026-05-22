/**
 * Sandboxed entry template for plugin workers.
 *
 * Provides constrained stdlib wrappers (fetch, fs) that enforce
 * capability allowlists before delegating to real implementations.
 *
 * Designed to be run inside a Node worker_threads or child_process
 * with --experimental-permission flags.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type SandboxEnv = {
  ALLOWED_NET_HOSTS: string;
  ALLOWED_FS_READ_PATHS: string;
  ALLOWED_FS_WRITE_PATHS: string;
  SECRET_CHANNEL_DATA: string;
};

const SANDBOX_NET_PREFIX = "__SANDBOX_NET_DENIED__ ";
const SANDBOX_FS_PREFIX = "__SANDBOX_FS_DENIED__ ";

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];
type SandboxedFetch = (input: FetchInput, init?: FetchInit) => ReturnType<typeof globalThis.fetch>;

function parseEnv(key: string, defaultValue = ""): string {
  return process.env[key] ?? defaultValue;
}

function matchHost(allowedHosts: string[], hostname: string): boolean {
  return allowedHosts.some((p) => {
    if (p === hostname) return true;
    if (p.startsWith("*.")) {
      const suffix = p.slice(1);
      return hostname.endsWith(suffix) && hostname !== suffix.slice(1);
    }
    return false;
  });
}

function pathAllowed(allowedPaths: string[], target: string): boolean {
  const normalized = target.replace(/\/+$/, "");
  return allowedPaths.some((p) => {
    if (p.endsWith("*")) return normalized.startsWith(p.slice(0, -1));
    return normalized === p || normalized.startsWith(`${p}/`);
  });
}

export function createSandboxedFetch(): SandboxedFetch {
  const allowedHosts = parseEnv("ALLOWED_NET_HOSTS").split(",").filter(Boolean);

  return async function sandboxedFetch(input: FetchInput, init?: FetchInit): Promise<Response> {
    let url: string;
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else {
      url = (input as Request).url;
    }

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      throw new Error(`${SANDBOX_NET_PREFIX}Invalid URL: ${url}`);
    }

    if (!matchHost(allowedHosts, hostname)) {
      throw new Error(`${SANDBOX_NET_PREFIX}Host not allowed: ${hostname}`);
    }

    return globalThis.fetch(input, init);
  };
}

export function createSandboxedReadFileSync(allowedPaths: string[]): (path: string) => string {
  return function sandboxedReadFileSync(path: string): string {
    if (!pathAllowed(allowedPaths, path)) {
      throw new Error(`${SANDBOX_FS_PREFIX}Read access denied: ${path}`);
    }
    return readFileSync(path, "utf8");
  };
}

export function createSandboxedWriteFileSync(
  allowedPaths: string[],
): (path: string, content: string) => void {
  return function sandboxedWriteFileSync(path: string, content: string): void {
    if (!pathAllowed(allowedPaths, path)) {
      throw new Error(`${SANDBOX_FS_PREFIX}Write access denied: ${path}`);
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
  };
}

export function createSecretResolver(): (ref: string) => string | undefined {
  const data = parseEnv("SECRET_CHANNEL_DATA");
  if (!data) return () => undefined;

  let secrets: Record<string, string>;
  try {
    secrets = JSON.parse(data);
  } catch {
    return () => undefined;
  }

  return (ref: string) => secrets[ref];
}
