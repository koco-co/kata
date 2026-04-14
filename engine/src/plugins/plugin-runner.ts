import { existsSync, readFileSync } from "node:fs";
import { fromRepoRoot } from "../ai-core/paths.ts";
import type { AiCoreIssue, AiCoreResult } from "../ai-core/types.ts";
import { snapshotFileRef } from "../source-ref/resolvers.ts";

const FIXTURE_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const PLUGIN_NAME = "fixture-design-source.fetch-design-doc";
const PLUGIN_VERSION = 1;

export type FixturePluginRecord = {
  pluginId: string;
  permission: { network: false; secrets: false };
  output: { text: string; sourceRef: string };
};

function issue(code: string, message: string, path: string): AiCoreIssue {
  return { code, severity: "error", message, path };
}

export async function runFixtureDesignPlugin(input: {
  fixtureName: string;
}): Promise<AiCoreResult<FixturePluginRecord>> {
  if (!FIXTURE_NAME_PATTERN.test(input.fixtureName)) {
    return {
      ok: false,
      issues: [
        issue(
          "plugin.fixture_name_invalid",
          "Fixture name must be a simple fixture id.",
          "fixtureName",
        ),
      ],
    };
  }

  const fixturePath = fromRepoRoot(
    ".ai",
    "core",
    "plugins",
    "fixture-design-source",
    "fixtures",
    `${input.fixtureName}.md`,
  );
  if (!existsSync(fixturePath)) {
    return {
      ok: false,
      issues: [issue("plugin.fixture_not_found", "Fixture file does not exist.", "fixtureName")],
    };
  }

  const text = readFileSync(fixturePath, "utf8");
  const sourceRef = snapshotFileRef({ id: `prd.file:${input.fixtureName}`, content: text });

  return {
    ok: true,
    value: {
      pluginId: joinPluginId(),
      permission: { network: false, secrets: false },
      output: { text, sourceRef },
    },
    issues: [],
  };
}

function joinPluginId(): string {
  return [PLUGIN_NAME, String(PLUGIN_VERSION)].join("@");
}

export const enforceNoNetworkNoSecret = runFixtureDesignPlugin;
