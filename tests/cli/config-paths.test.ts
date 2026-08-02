import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  automationConfigPath,
  casesLintPath,
  environmentsDir,
  environmentsExamplePath,
  infrastructureDir,
  integrationsDir,
  integrationsExamplePath,
  privateRoot,
  repoPolicyPath,
  repositoriesExamplePath,
  repositoriesPath,
  sqlProfilesPath,
  xmindMappingPath,
} from "../../cli/lib/config-paths.ts";
import { infraConfigPath, infraExamplePath } from "../../cli/lib/infra-config.ts";

const ROOT = "/tmp/kata-root";

describe("config paths", () => {
  test("private family paths live under config/private", () => {
    expect(privateRoot(ROOT)).toBe(join(ROOT, "config", "private"));
    expect(environmentsDir(ROOT)).toBe(join(ROOT, "config", "private", "environments"));
    expect(integrationsDir(ROOT)).toBe(join(ROOT, "config", "private", "integrations"));
    expect(infrastructureDir(ROOT)).toBe(join(ROOT, "config", "private", "infrastructure"));
    expect(repositoriesPath(ROOT)).toBe(join(ROOT, "config", "private", "repositories.yaml"));
  });

  test("contract family paths live under config/policies", () => {
    expect(repoPolicyPath(ROOT)).toBe(join(ROOT, "config", "policies", "repo-policy.yaml"));
    expect(casesLintPath(ROOT)).toBe(join(ROOT, "config", "policies", "cases-lint.yaml"));
    expect(sqlProfilesPath(ROOT)).toBe(join(ROOT, "config", "policies", "sql-profiles.yaml"));
    expect(xmindMappingPath(ROOT)).toBe(join(ROOT, "config", "policies", "xmind-mapping.yaml"));
  });

  test("example templates live under config/examples", () => {
    expect(environmentsExamplePath(ROOT)).toBe(
      join(ROOT, "config", "examples", "environments", "env.example.yaml"),
    );
    expect(infraExamplePath("hosts", ROOT)).toBe(
      join(ROOT, "config", "examples", "infrastructure", "hosts.example.yaml"),
    );
    expect(integrationsExamplePath("lanhu", ROOT)).toBe(
      join(ROOT, "config", "examples", "integrations", "lanhu.example.yaml"),
    );
    expect(repositoriesExamplePath(ROOT)).toBe(
      join(ROOT, "config", "examples", "repositories.example.yaml"),
    );
  });

  test("automation config is a tracked runtime file", () => {
    expect(automationConfigPath(ROOT)).toBe(join(ROOT, "config", "automation", "playwright.yaml"));
  });

  test("infra helper keeps instance file and example aligned", () => {
    expect(infraConfigPath("data_sources", ROOT)).toBe(
      join(ROOT, "config", "private", "infrastructure", "data_sources.yaml"),
    );
  });
});
