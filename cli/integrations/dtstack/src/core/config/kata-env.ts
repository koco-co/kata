import { basename, dirname, resolve } from "node:path";
import {
  assertDataAssetsEnvName,
  readDataAssetsEnvConfig,
} from "../../../../../lib/dataassets-env";

export interface KataEnvironmentRuntime {
  readonly name: string;
  readonly baseUrl: string;
  readonly cookie: string;
}

interface ResolvedRuntimeShape {
  readonly env?: string;
  readonly urls?: { readonly baseUrl?: string };
}

function resolvedRuntime(env: NodeJS.ProcessEnv): ResolvedRuntimeShape | undefined {
  const raw = env.KATA_DATAASSETS_RESOLVED;
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as ResolvedRuntimeShape;
  } catch {
    throw new Error("KATA_DATAASSETS_RESOLVED is invalid JSON");
  }
}

/** Read the selected DataAssets environment without introducing another config format. */
export function loadKataEnvironment(
  envName: string,
  env: NodeJS.ProcessEnv = process.env,
): KataEnvironmentRuntime | undefined {
  const configPath = env.KATA_DATAASSETS_CONFIG;
  if (!configPath) return undefined;
  const name = assertDataAssetsEnvName(envName);
  const absolutePath = resolve(configPath);
  // config/private/environments/<env>.yaml → repo root
  const root = resolve(dirname(dirname(dirname(dirname(absolutePath)))));
  const expectedName = basename(absolutePath).replace(/\.ya?ml$/i, "");
  if (assertDataAssetsEnvName(expectedName) !== name) {
    throw new Error("KATA_DATAASSETS_CONFIG does not match the selected environment");
  }
  const config = readDataAssetsEnvConfig(name, { repoRoot: root });
  const resolved = resolvedRuntime(env);
  const baseUrl = resolved?.urls?.baseUrl ?? config.url;
  if (!baseUrl || !config.auth.cookie)
    throw new Error(`environment ${name} has no usable URL or cookie`);
  if (resolved?.env && assertDataAssetsEnvName(resolved.env) !== name) {
    throw new Error("KATA_DATAASSETS_RESOLVED does not match the selected environment");
  }
  return { name, baseUrl, cookie: config.auth.cookie };
}
