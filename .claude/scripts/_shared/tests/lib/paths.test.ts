import { describe, expect, it, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  agentsDir,
  currentYYYYMM,
  enhancedMd,
  featureDir,
  featureFile,
  knowledgeDir,
  knowledgePath,
  parseGitUrl,
  prdsDir,
  probeCacheDir,
  probeCachePath,
  projectDir,
  projectPath,
  projectRulesDir,
  repoRoot,
  skillsDir,
  tempDir,
} from "@shared/lib/paths.ts";

describe("parseGitUrl", () => {
  it("extracts group and repo from http gitlab URL with .git suffix", () => {
    const result = parseGitUrl("http://gitlab.example.com/my-group/my-repo.git");
    expect(result.group).toBe("my-group");
    expect(result.repo).toBe("my-repo");
  });

  it("extracts group and repo from https URL without .git suffix", () => {
    const result = parseGitUrl("https://github.com/org/project");
    expect(result.group).toBe("org");
    expect(result.repo).toBe("project");
  });

  it("handles URL with trailing slash", () => {
    const result = parseGitUrl("https://gitlab.com/team/service/");
    expect(result.group).toBe("team");
    expect(result.repo).toBe("service");
  });

  it("extracts from https git URL with .git suffix", () => {
    const result2 = parseGitUrl("https://github.com/dtstack/taier.git");
    expect(result2.group).toBe("dtstack");
    expect(result2.repo).toBe("taier");
  });

  it("handles nested group paths", () => {
    const result = parseGitUrl("https://gitlab.com/top/sub-group/repo.git");
    expect(result.group).toBe("sub-group");
    expect(result.repo).toBe("repo");
  });
});

describe("currentYYYYMM", () => {
  it("returns a 6-character string matching YYYYMM pattern", () => {
    const result = currentYYYYMM();
    expect(result).toMatch(/^\d{6}$/);
  });

  it("returns a value with valid month range (01-12)", () => {
    const result = currentYYYYMM();
    const month = Number.parseInt(result.slice(4, 6), 10);
    expect(month >= 1 && month <= 12, `Month ${month} is out of range`).toBeTruthy();
  });

  it("returns a value with a realistic year", () => {
    const result = currentYYYYMM();
    const year = Number.parseInt(result.slice(0, 4), 10);
    expect(year >= 2024 && year <= 2030, `Year ${year} seems unrealistic`).toBeTruthy();
  });

  it("matches the current date", () => {
    const result = currentYYYYMM();
    const now = new Date();
    const expected = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

describe("repoRoot", () => {
  it("returns an existing directory", () => {
    const root = repoRoot();
    expect(existsSync(root)).toBeTruthy();
  });

  it("resolves to the kata project root (contains package.json)", () => {
    const root = repoRoot();
    expect(existsSync(`${root}/package.json`)).toBeTruthy();
  });

  it("resolves to a directory containing .claude/", () => {
    const root = repoRoot();
    expect(existsSync(`${root}/.claude`)).toBeTruthy();
  });
});

describe("skillsDir", () => {
  it("points to .claude/skills inside the repo root", () => {
    const dir = skillsDir();
    expect(dir.endsWith(".claude/skills")).toBeTruthy();
  });

  it("supports root override", () => {
    const root = "/tmp/kata-root";
    expect(skillsDir(root)).toBe(join(root, ".claude", "skills"));
  });
});

describe("agentsDir", () => {
  it("agentsDir points to .claude/agents inside the repo root", () => {
    expect(agentsDir().endsWith(".claude/agents")).toBeTruthy();
  });

  it("supports root override", () => {
    const root = "/tmp/kata-root";
    expect(agentsDir(root)).toBe(join(root, ".claude", "agents"));
  });
});

describe("projectDir", () => {
  it("returns workspace/{project} under repoRoot", () => {
    const dir = projectDir("dataAssets");
    const root = repoRoot();
    expect(dir).toBe(join(root, "workspace", "dataAssets"));
  });

  it("works with different project names", () => {
    const dir = projectDir("xyzh");
    expect(dir.endsWith("workspace/xyzh")).toBeTruthy();
  });
});

describe("projectPath", () => {
  it("joins segments under project dir", () => {
    const p = projectPath("dataAssets", "prds", "202604");
    expect(p.endsWith("workspace/dataAssets/prds/202604")).toBeTruthy();
  });
});

describe("prdsDir", () => {
  it("returns workspace/{project}/_shared/archive/history/prds", () => {
    const dir = prdsDir("xyzh");
    expect(dir.endsWith("workspace/xyzh/_shared/archive/history/prds")).toBeTruthy();
  });
});

describe("tempDir", () => {
  it("returns .kata/{project}", () => {
    const dir = tempDir("xyzh");
    expect(dir.endsWith(".kata/xyzh")).toBeTruthy();
  });
});

describe("probeCacheDir", () => {
  it("returns .kata/{project}/probe-cache", () => {
    const dir = probeCacheDir("dataAssets");
    expect(dir.endsWith(".kata/dataAssets/probe-cache")).toBeTruthy();
  });
});

describe("probeCachePath", () => {
  it("returns .kata/{project}/probe-cache/{prdSlug}.json", () => {
    const path = probeCachePath("dataAssets", "15695-quality");
    expect(path.endsWith(".kata/dataAssets/probe-cache/15695-quality.json")).toBeTruthy();
  });

  it("preserves slug verbatim including dashes and digits", () => {
    const path = probeCachePath("xyzh", "abc-123-xyz");
    expect(path.endsWith(".kata/xyzh/probe-cache/abc-123-xyz.json")).toBeTruthy();
  });
});

describe("projectRulesDir", () => {
  it("returns workspace/{project}/_shared/rules", () => {
    const dir = projectRulesDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/_shared/rules")).toBeTruthy();
  });
});

describe("knowledgeDir", () => {
  it("returns <workspace>/<project>/_shared/knowledge", () => {
    const dir = knowledgeDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/_shared/knowledge")).toBeTruthy();
  });
});

describe("knowledgePath", () => {
  it("joins segments under knowledge dir", () => {
    const p = knowledgePath("dataAssets", "modules", "data-source.md");
    expect(
      p.endsWith("workspace/dataAssets/_shared/knowledge/modules/data-source.md"),
    ).toBeTruthy();
  });

  it("returns knowledge dir itself when no segments", () => {
    const p = knowledgePath("dataAssets");
    expect(p.endsWith("workspace/dataAssets/_shared/knowledge")).toBeTruthy();
  });
});

describe("featureDir / featureFile (new v3 API)", () => {
  test("featureDir returns workspace/{p}/features/{group}/{featureId}/", () => {
    const result = featureDir("dataAssets", "_standing", "202604-myslug");
    expect(result).toMatch(/workspace\/dataAssets\/features\/_standing\/202604-myslug$/);
  });

  test("featureDir with version layer group", () => {
    const result = featureDir("dataAssets", "v6.4.10", "2026-04-general-json-config");
    expect(result).toMatch(
      /workspace\/dataAssets\/features\/v6\.4\.10\/2026-04-general-json-config$/,
    );
  });

  test("featureDir accepts the 2099-XX placeholder month in featureId", () => {
    const result = featureDir("dataAssets", "_standing", "2099-XX-draft-slug");
    expect(result).toMatch(/workspace\/dataAssets\/features\/_standing\/2099-XX-draft-slug$/);
  });

  test("featureDir rejects featureIds containing Chinese / 【】 (CLAUDE.md §Feature Directory Naming)", () => {
    expect(() => featureDir("dataAssets", "_standing", "【test】slug-with-中文")).toThrow(
      /invalid feature id/,
    );
  });

  test("featureDir rejects uppercase or whitespace in featureId", () => {
    expect(() => featureDir("dataAssets", "_standing", "MySlug")).toThrow(/invalid feature id/);
    expect(() => featureDir("dataAssets", "_standing", "my slug")).toThrow(/invalid feature id/);
  });

  test("featureFile joins additional segments", () => {
    const result = featureFile("dataAssets", "_standing", "202604-myslug", "tests", "t01.ts");
    expect(result).toMatch(
      /workspace\/dataAssets\/features\/_standing\/202604-myslug\/tests\/t01\.ts$/,
    );
  });

  test("featureFile with single segment returns file inside feature dir", () => {
    const result = featureFile("dataAssets", "_standing", "202604-myslug", "archive.md");
    expect(result).toMatch(
      /workspace\/dataAssets\/features\/_standing\/202604-myslug\/archive\.md$/,
    );
  });
});

describe("enhancedMd", () => {
  test("returns features/_standing/{ym}-{slug}/enhanced.md", () => {
    const result = enhancedMd("dataAssets", "202604", "myslug");
    expect(result).toMatch(
      /workspace\/dataAssets\/features\/_standing\/202604-myslug\/enhanced\.md$/,
    );
  });
});
