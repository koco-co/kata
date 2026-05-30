import { afterEach, describe, expect, it, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  agentRuntimeRoot,
  agentsDir,
  archiveDir,
  authDir,
  authSessionDir,
  authSessionPath,
  commandsDir,
  currentYYYYMM,
  enhancedMd,
  featureDir,
  featureFile,
  incidentDir,
  issuesDir,
  knowledgeDir,
  knowledgeModulesDir,
  knowledgePath,
  knowledgePitfallsDir,
  listProjects,
  parseGitUrl,
  prdsDir,
  probeCacheDir,
  probeCachePath,
  projectDir,
  projectKataDir,
  projectPath,
  projectRulesDir,
  projectShared,
  regressionDir,
  repoRoot,
  reportsDir,
  reposDir,
  resolveAgentRuntime,
  scriptsDir,
  skillsDir,
  tempDir,
  testsDir,
  xmindDir,
  xmindPath,
} from "@shared/lib/paths.ts";

const OLD_AGENT_RUNTIME = process.env.KATA_AGENT_RUNTIME;

afterEach(() => {
  if (OLD_AGENT_RUNTIME === undefined) delete process.env.KATA_AGENT_RUNTIME;
  else process.env.KATA_AGENT_RUNTIME = OLD_AGENT_RUNTIME;
});

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

describe("scriptsDir", () => {
  it("points to .claude/scripts/_shared inside the repo root", () => {
    const dir = scriptsDir();
    expect(dir.endsWith(".claude/scripts/_shared")).toBeTruthy();
    expect(existsSync(dir)).toBeTruthy();
  });
});

describe("skillsDir", () => {
  it("points to .claude/skills inside the repo root", () => {
    delete process.env.KATA_AGENT_RUNTIME;
    const dir = skillsDir();
    expect(dir.endsWith(".claude/skills")).toBeTruthy();
  });

  it("points to .agents/skills when runtime is codex", () => {
    const dir = skillsDir("codex");
    expect(dir.endsWith(".agents/skills")).toBeTruthy();
  });
});

describe("agent runtime paths", () => {
  it("defaults to claude for backward compatibility", () => {
    delete process.env.KATA_AGENT_RUNTIME;
    expect(resolveAgentRuntime()).toBe("claude");
    expect(agentRuntimeRoot().endsWith(".claude")).toBeTruthy();
  });

  it("uses KATA_AGENT_RUNTIME=codex when no explicit runtime is provided", () => {
    process.env.KATA_AGENT_RUNTIME = "codex";
    expect(resolveAgentRuntime()).toBe("codex");
    expect(agentRuntimeRoot().endsWith(".agents")).toBeTruthy();
  });

  it("explicit runtime overrides KATA_AGENT_RUNTIME", () => {
    process.env.KATA_AGENT_RUNTIME = "codex";
    expect(resolveAgentRuntime("claude")).toBe("claude");
    expect(agentRuntimeRoot("claude").endsWith(".claude")).toBeTruthy();
  });

  it("returns runtime-aware agents and commands dirs", () => {
    expect(agentsDir("claude").endsWith(".claude/agents")).toBeTruthy();
    expect(agentsDir("codex").endsWith(".agents/agents")).toBeTruthy();
    expect(commandsDir("claude").endsWith(".claude/commands")).toBeTruthy();
    expect(commandsDir("codex").endsWith(".agents/commands")).toBeTruthy();
  });

  it("supports root override for runtime paths", () => {
    const root = "/tmp/kata-runtime-root";
    expect(agentRuntimeRoot("claude", root)).toBe(join(root, ".claude"));
    expect(agentRuntimeRoot("codex", root)).toBe(join(root, ".agents"));
    expect(skillsDir("codex", root)).toBe(join(root, ".agents", "skills"));
    expect(agentsDir("codex", root)).toBe(join(root, ".agents", "agents"));
    expect(commandsDir("codex", root)).toBe(join(root, ".agents", "commands"));
  });

  it("throws on invalid explicit runtime", () => {
    expect(() => resolveAgentRuntime("bad-runtime")).toThrow("Invalid agent runtime");
  });

  it("rejects all for concrete path helpers from environment", () => {
    process.env.KATA_AGENT_RUNTIME = "all";
    expect(() => agentRuntimeRoot()).toThrow("Invalid agent runtime");
    expect(() => skillsDir()).toThrow("Invalid agent runtime");
    expect(() => agentsDir()).toThrow("Invalid agent runtime");
    expect(() => commandsDir()).toThrow("Invalid agent runtime");
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

describe("xmindDir", () => {
  it("returns workspace/{project}/xmind", () => {
    const dir = xmindDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/xmind")).toBeTruthy();
  });
});

describe("xmindPath", () => {
  it("joins segments under xmind dir", () => {
    const p = xmindPath("dataAssets", "202604", "test.xmind");
    expect(p.endsWith("workspace/dataAssets/xmind/202604/test.xmind")).toBeTruthy();
  });
});

describe("archiveDir", () => {
  it("returns workspace/{project}/archive", () => {
    const dir = archiveDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/archive")).toBeTruthy();
  });
});

describe("prdsDir", () => {
  it("returns workspace/{project}/prds", () => {
    const dir = prdsDir("xyzh");
    expect(dir.endsWith("workspace/xyzh/prds")).toBeTruthy();
  });
});

describe("issuesDir", () => {
  it("returns workspace/{project}/issues", () => {
    const dir = issuesDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/issues")).toBeTruthy();
  });
});

describe("reportsDir", () => {
  it("returns workspace/{project}/_shared/published-reports", () => {
    const dir = reportsDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/_shared/published-reports")).toBeTruthy();
  });
});

describe("testsDir", () => {
  it("returns workspace/{project}/tests", () => {
    const dir = testsDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/tests")).toBeTruthy();
  });
});

describe("reposDir", () => {
  it("returns workspace/{project}/.kata/repos", () => {
    const dir = reposDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/.kata/repos")).toBeTruthy();
  });
});

describe("project-local .kata auth paths", () => {
  it("returns workspace/{project}/.kata", () => {
    expect(projectKataDir("dataAssets").endsWith("workspace/dataAssets/.kata")).toBeTruthy();
  });

  it("returns workspace/{project}/.kata/auth", () => {
    expect(authDir("dataAssets").endsWith("workspace/dataAssets/.kata/auth")).toBeTruthy();
  });

  it("returns workspace/{project}/.kata/auth/{project}", () => {
    expect(
      authSessionDir("dataAssets").endsWith("workspace/dataAssets/.kata/auth/dataAssets"),
    ).toBeTruthy();
  });

  it("returns workspace/{project}/.kata/auth/{project}/session-{env}.json", () => {
    expect(
      authSessionPath("dataAssets", "ltqc-local").endsWith(
        "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
      ),
    ).toBeTruthy();
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
  it("returns workspace/{project}/rules", () => {
    const dir = projectRulesDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/rules")).toBeTruthy();
  });
});

describe("knowledgeDir", () => {
  it("returns <workspace>/<project>/knowledge", () => {
    const dir = knowledgeDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/knowledge")).toBeTruthy();
  });
});

describe("knowledgePath", () => {
  it("joins segments under knowledge dir", () => {
    const p = knowledgePath("dataAssets", "modules", "data-source.md");
    expect(p.endsWith("workspace/dataAssets/knowledge/modules/data-source.md")).toBeTruthy();
  });

  it("returns knowledge dir itself when no segments", () => {
    const p = knowledgePath("dataAssets");
    expect(p.endsWith("workspace/dataAssets/knowledge")).toBeTruthy();
  });
});

describe("knowledgeModulesDir", () => {
  it("returns <knowledge>/modules", () => {
    const dir = knowledgeModulesDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/knowledge/modules")).toBeTruthy();
  });
});

describe("knowledgePitfallsDir", () => {
  it("returns <knowledge>/pitfalls", () => {
    const dir = knowledgePitfallsDir("dataAssets");
    expect(dir.endsWith("workspace/dataAssets/knowledge/pitfalls")).toBeTruthy();
  });
});

describe("listProjects", () => {
  it("returns an array", () => {
    const projects = listProjects();
    expect(Array.isArray(projects)).toBeTruthy();
  });

  it("does not include dot-prefixed directories", () => {
    const projects = listProjects();
    for (const p of projects) {
      expect(!p.startsWith(".")).toBeTruthy();
    }
  });
});

describe("featureDir / featureFile (new v3 API)", () => {
  test("featureDir returns workspace/{p}/features/{ym}-{slug}/", () => {
    const result = featureDir("dataAssets", "202604", "myslug");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-myslug$/);
  });

  test("featureDir accepts dashed yyyymm (2026-04) and multi-segment slugs", () => {
    const result = featureDir("dataAssets", "2026-04", "general-json-config");
    expect(result).toMatch(/workspace\/dataAssets\/features\/2026-04-general-json-config$/);
  });

  test("featureDir accepts the 2099-XX placeholder month", () => {
    const result = featureDir("dataAssets", "2099-XX", "draft-slug");
    expect(result).toMatch(/workspace\/dataAssets\/features\/2099-XX-draft-slug$/);
  });

  test("featureDir rejects slugs containing Chinese / 【】 (CLAUDE.md §Feature Directory Naming)", () => {
    expect(() => featureDir("dataAssets", "202604", "【test】slug-with-中文")).toThrow(
      /invalid feature id/,
    );
  });

  test("featureDir rejects uppercase or whitespace in slug", () => {
    expect(() => featureDir("dataAssets", "202604", "MySlug")).toThrow(/invalid feature id/);
    expect(() => featureDir("dataAssets", "202604", "my slug")).toThrow(/invalid feature id/);
  });

  test("featureFile joins additional segments", () => {
    const result = featureFile("dataAssets", "202604", "myslug", "tests", "t01.ts");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-myslug\/tests\/t01\.ts$/);
  });

  test("featureFile with single segment returns file inside feature dir", () => {
    const result = featureFile("dataAssets", "202604", "myslug", "archive.md");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-myslug\/archive\.md$/);
  });
});

describe("projectShared (new v3 API)", () => {
  test("projectShared returns workspace/{p}/shared/{kind}/...", () => {
    const result = projectShared("dataAssets", "fixtures", "auth", "session.json");
    expect(result).toMatch(/workspace\/dataAssets\/shared\/fixtures\/auth\/session\.json$/);
  });

  test("projectShared with no segments returns the kind dir", () => {
    const result = projectShared("dataAssets", "helpers");
    expect(result).toMatch(/workspace\/dataAssets\/shared\/helpers$/);
  });
});

describe("incidentDir / regressionDir (new v3 API)", () => {
  test("incidentDir returns workspace/{p}/incidents/{date}-{slug}/", () => {
    const result = incidentDir("dataAssets", "20260428", "console-error");
    expect(result).toMatch(/workspace\/dataAssets\/incidents\/20260428-console-error$/);
  });

  test("regressionDir returns workspace/{p}/regressions/{date}-{batch}/", () => {
    const result = regressionDir("dataAssets", "20260428", "smoke");
    expect(result).toMatch(/workspace\/dataAssets\/regressions\/20260428-smoke$/);
  });
});

describe("deprecated alias: enhancedMd routes to feature path", () => {
  test("enhancedMd returns features/{ym}-{slug}/enhanced.md (post-v3 redirect)", () => {
    const result = enhancedMd("dataAssets", "202604", "myslug");
    expect(result).toMatch(/workspace\/dataAssets\/features\/202604-myslug\/enhanced\.md$/);
  });
});
