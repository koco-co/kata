import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  casesLintPath,
  environmentsDir,
  environmentsExamplePath,
  infrastructureDir,
  integrationsDir,
  integrationsExamplePath,
  privateInstanceFiles,
  privateRoot,
  repoPolicyPath,
  repositoriesExamplePath,
  repositoriesPath,
  sqlProfilesPath,
  xmindMappingPath,
} from "../../cli/lib/config-paths.ts";
import { infraConfigPath, infraExamplePath } from "../../cli/lib/infra-config.ts";

const ROOT = "/tmp/kata-root";

function makeLinkedWorktree(): { main: string; linked: string; cleanup: () => void } {
  const container = mkdtempSync(join(tmpdir(), "kata-config-paths-worktree-"));
  const main = join(container, "main");
  const linked = join(container, "linked");
  mkdirSync(main);
  execFileSync("git", ["init", "-q", "-b", "main", main]);
  writeFileSync(join(main, "README.md"), "fixture\n");
  execFileSync("git", ["-C", main, "add", "README.md"]);
  execFileSync("git", [
    "-C",
    main,
    "-c",
    "user.name=Kata Test",
    "-c",
    "user.email=kata@example.invalid",
    "commit",
    "-q",
    "-m",
    "fixture",
  ]);
  execFileSync("git", ["-C", main, "worktree", "add", "-q", "--detach", linked, "HEAD"]);
  return {
    main,
    linked,
    cleanup: () => {
      execFileSync("git", ["-C", main, "worktree", "remove", "--force", linked]);
      rmSync(container, { recursive: true, force: true });
    },
  };
}

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

  test("infra helper keeps instance file and example aligned", () => {
    expect(infraConfigPath("data_sources", ROOT)).toBe(
      join(ROOT, "config", "private", "infrastructure", "data_sources.yaml"),
    );
  });

  test("linked worktree enumerates environment instances from the shared private root", () => {
    const fixture = makeLinkedWorktree();
    try {
      const environmentDir = join(fixture.main, "config", "private", "environments");
      mkdirSync(environmentDir, { recursive: true, mode: 0o700 });
      chmodSync(join(fixture.main, "config", "private"), 0o700);
      chmodSync(environmentDir, 0o700);
      const environment = join(environmentDir, "shared.yaml");
      writeFileSync(environment, "schema_version: 2\n", { mode: 0o600 });
      chmodSync(environment, 0o600);

      expect(privateInstanceFiles("environments", fixture.linked)).toEqual([
        realpathSync(environment),
      ]);
    } finally {
      fixture.cleanup();
    }
  });
});
