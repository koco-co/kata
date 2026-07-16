import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolveConfiguredSourceRepo } from "@shared/lib/git-source.ts";
import { parseGitUrl } from "@shared/lib/paths.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");

function run(
  args: string[],
  env: Record<string, string> = {},
): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("bun", [".claude/scripts/_shared/bin/kata", "repos", ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, ...env },
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

function createSourceRepo(tmp: string): {
  localRoot: string;
  localRepo: string;
  canonicalUrl: string;
} {
  const localRoot = join(tmp, "local");
  const localRepo = join(localRoot, "actual", "source-repo");
  const canonicalUrl = "https://gitlab.example.test/team/source-repo.git";
  mkdirSync(localRepo, { recursive: true });
  execFileSync("git", ["-C", localRepo, "init"]);
  execFileSync("git", ["-C", localRepo, "config", "user.email", "test@local"]);
  execFileSync("git", ["-C", localRepo, "config", "user.name", "test"]);
  execFileSync("git", ["-C", localRepo, "remote", "add", "origin", canonicalUrl]);
  writeFileSync(join(localRepo, "README.md"), "direct git show needle\n", "utf8");
  execFileSync("git", ["-C", localRepo, "add", "README.md"]);
  execFileSync("git", ["-C", localRepo, "commit", "-m", "seed"]);
  return { localRoot, localRepo, canonicalUrl };
}

describe("kata repos", () => {
  it("documents that sync only discovers external repositories", () => {
    const { stdout, stderr, code } = run(["sync", "--help"]);
    const output = stdout + stderr;
    expect(code).toBe(0);
    expect(output).toContain("不创建缓存");
    expect(output).toMatch(/--url/);
  });

  it("parses supported canonical URLs", () => {
    expect(parseGitUrl("http://gitlab.dtstack.com/customItem/dt-center-assets.git")).toEqual({
      group: "customItem",
      repo: "dt-center-assets",
    });
    expect(parseGitUrl("https://gitlab.com/org/sub-group/my-repo.git")).toEqual({
      group: "sub-group",
      repo: "my-repo",
    });
  });

  it("show/grep/list wrap read-only Git commands without creating a project cache", () => {
    const tmp = mkdtempSync(join(tmpdir(), "kata-repos-direct-"));
    const project = `repos-direct-${process.pid}`;
    const projectDir = join(REPO_ROOT, "workspace", project);
    try {
      const { localRoot, localRepo, canonicalUrl } = createSourceRepo(tmp);
      const env = { KATA_SOURCE_REPOS: canonicalUrl, KATA_SOURCE_REPO_ROOT: localRoot };
      expect(resolveConfiguredSourceRepo("team/source-repo", localRoot, canonicalUrl)).toBe(
        localRepo,
      );

      const shown = run(
        [
          "show",
          "--project",
          project,
          "--repo",
          "team/source-repo",
          "--path",
          "README.md",
          "--line-start",
          "1",
          "--line-end",
          "1",
        ],
        env,
      );
      const grepped = run(
        ["grep", "--project", project, "--repo", "team/source-repo", "--pattern", "needle"],
        env,
      );
      const listed = run(["list", "--project", project, "--repo", "team/source-repo"], env);

      expect(shown.code).toBe(0);
      expect(shown.stdout).toContain("1:direct git show needle");
      expect(grepped.code).toBe(0);
      expect(grepped.stdout).toContain("README.md:1:direct git show needle");
      expect(listed.code).toBe(0);
      expect(listed.stdout).toContain("README.md");
      expect(existsSync(projectDir)).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("sync-env validates configured repositories without cloning or fetching", () => {
    const tmp = mkdtempSync(join(tmpdir(), "kata-repos-discover-"));
    const project = `repos-discover-${process.pid}`;
    const projectDir = join(REPO_ROOT, "workspace", project);
    try {
      const { localRoot, localRepo, canonicalUrl } = createSourceRepo(tmp);
      const result = run(["sync-env", "--project", project], {
        KATA_SOURCE_REPOS: canonicalUrl,
        KATA_SOURCE_REPO_ROOT: localRoot,
      });
      expect(result.code).toBe(0);
      const payload = JSON.parse(result.stdout) as {
        synced: Array<{ storage: string; path: string }>;
        errors: unknown[];
      };
      expect(payload.synced).toEqual([
        expect.objectContaining({ storage: "external-git-repo", path: localRepo }),
      ]);
      expect(payload.errors).toEqual([]);
      expect(existsSync(projectDir)).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("fails when a configured repository cannot be discovered", () => {
    const result = run(["sync", "--url", "https://gitlab.example.test/team/missing.git"], {
      KATA_SOURCE_REPO_ROOT: "/tmp/kata-no-such-source-root",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Configured external repository not found");
    expect(result.stderr).toContain('"step": "discover"');
  });
});
