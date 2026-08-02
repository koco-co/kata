import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyConfigDocs,
  assertKnownKeys,
  CONFIG_FAMILIES,
  familyByName,
  listFamilies,
  redactSecrets,
  renderConfigDocsSection,
  showFamily,
  validateAllConfig,
} from "../../cli/lib/config-registry.ts";

function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kata-registry-"));
  for (const dir of [
    "config",
    "config/private",
    "config/private/environments",
    "config/private/integrations",
    "config/private/infrastructure",
  ]) {
    mkdirSync(join(root, dir), { recursive: true, mode: 0o700 });
    chmodSync(join(root, dir), 0o700);
  }
  mkdirSync(join(root, "config", "examples", "environments"), { recursive: true });
  mkdirSync(join(root, "config", "examples", "integrations"), { recursive: true });
  mkdirSync(join(root, "config", "examples", "infrastructure"), { recursive: true });
  return root;
}

function writePrivate(root: string, rel: string, content: string, mode = 0o600): string {
  const path = join(root, rel);
  writeFileSync(path, content, { mode });
  chmodSync(path, mode);
  return path;
}

function writeExample(root: string, rel: string, content: string): string {
  const path = join(root, rel);
  writeFileSync(path, content);
  return path;
}

describe("config registry", () => {
  test("registers nine families with coherent roles and privacy", () => {
    const families = listFamilies();
    expect(families).toHaveLength(9);
    expect(CONFIG_FAMILIES.every((family) => family.docs.length > 0)).toBe(true);
    expect(CONFIG_FAMILIES.filter((family) => family.private).map((f) => f.name)).toEqual([
      "environments",
      "integrations",
      "infrastructure",
      "repositories",
    ]);
    expect(
      CONFIG_FAMILIES.filter((family) => family.role === "contract").map((f) => f.name),
    ).toEqual(["repo-policy", "cases-lint", "sql-profiles", "xmind-mapping"]);
    expect(familyByName("environments").instancesDir).toBe("config/private/environments");
    for (const family of CONFIG_FAMILIES.filter((entry) => entry.private)) {
      const targets = family.instancesDir
        ? [`${family.instancesDir}/<name>.yaml`]
        : family.files;
      expect(family.templates.map((template) => template.target)).toEqual(targets);
    }
    expect(() => familyByName("nope")).toThrow(/未知配置族/);
  });

  test("every registered example template exists in the repository", () => {
    for (const family of CONFIG_FAMILIES) {
      for (const template of family.templates) {
        expect(existsSync(join(process.cwd(), template.example)), `${template.example} 缺失`).toBe(
          true,
        );
      }
    }
  });

  test("redacts secret-valued keys recursively and leaves others intact", () => {
    const out = redactSecrets({
      auth: { cookie: "sid=1" },
      password: "pw",
      username: "qa",
      dingtalk: { webhook_url: "https://hook", keyword: "kata" },
      smtp: { pass: "x", host: "smtp.example" },
    }) as Record<string, unknown>;
    expect(out.auth).toEqual({ cookie: "<redacted>" });
    expect(out.password).toBe("<redacted>");
    expect(out.username).toBe("qa");
    expect((out.dingtalk as Record<string, unknown>).webhook_url).toBe("<redacted>");
    expect((out.dingtalk as Record<string, unknown>).keyword).toBe("kata");
    expect((out.smtp as Record<string, unknown>).pass).toBe("<redacted>");
    expect((out.smtp as Record<string, unknown>).host).toBe("smtp.example");
  });

  test("assertKnownKeys rejects stale fields with their names", () => {
    expect(() =>
      assertKnownKeys({ schema_version: 2, legacy_key: 1 }, ["schema_version"], "x.yaml"),
    ).toThrow(/x\.yaml 包含未知字段: legacy_key/);
    expect(() =>
      assertKnownKeys({ schema_version: 2 }, ["schema_version"], "x.yaml"),
    ).not.toThrow();
  });

  test("show replaces the complete private-family payload instead of leaking values or map keys", () => {
    const root = makeRoot();
    writePrivate(
      root,
      "config/private/integrations/lanhu.yaml",
      'cookie: sid=1\nusername: qa\npassword: ""\n',
    );
    const shown = showFamily("integrations", root);
    expect(shown.configured).toBe(true);
    const lanhu = shown.files.find((f) => f.path.endsWith("lanhu.yaml"));
    expect(lanhu?.value).toBe("<redacted>");
    expect(shown.errors).toEqual([]);
  });

  test("show does not leak private numeric, boolean or dynamic-map topology", () => {
    const root = makeRoot();
    writePrivate(
      root,
      "config/private/infrastructure/hosts.yaml",
      "hosts:\n  internal-host-alias:\n    host: 192.0.2.10\n    port: 2222\n    enabled: true\n",
    );
    const shown = showFamily("infrastructure", root);
    const hosts = shown.files.find((file) => file.path.endsWith("hosts.yaml"));
    expect(hosts?.value).toBe("<redacted>");
    expect(JSON.stringify(shown)).not.toContain("internal-host-alias");
    expect(JSON.stringify(shown)).not.toContain("2222");
  });

  test("show renders non-secret contract values verbatim", () => {
    const root = makeRoot();
    mkdirSync(join(root, "config", "policies"), { recursive: true });
    writeFileSync(
      join(root, "config", "policies", "repo-policy.yaml"),
      "root:\n  allowed_files: [README.md]\nforbidden_globs: []\n",
    );
    const shown = showFamily("repo-policy", root);
    const policy = shown.files.find((f) => f.path.endsWith("repo-policy.yaml"));
    expect(policy?.value).toMatchObject({ root: { allowed_files: ["README.md"] } });
  });

  test("validate tolerates missing private files on a fresh clone", () => {
    const root = makeRoot();
    const result = validateAllConfig(root);
    // 干净克隆：私密文件缺失不算错误，但契约/运行时文件缺失是错误
    expect(result.issues.filter((issue) => issue.path.includes("config/private"))).toHaveLength(0);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.path.includes("repo-policy.yaml"))).toBe(true);
  });

  test("validate flags unknown fields in private files", () => {
    const root = makeRoot();
    writePrivate(
      root,
      "config/private/integrations/lanhu.yaml",
      "cookie: sid=1\nlegacy_cookie_path: /tmp/x\n",
    );
    writeExample(root, "config/examples/integrations/lanhu.example.yaml", 'cookie: ""\n');
    const result = validateAllConfig(root);
    expect(
      result.issues.some((issue) => issue.message.includes("未知字段: legacy_cookie_path")),
    ).toBe(true);
  });

  test("validate flags wrong private file permissions", () => {
    const root = makeRoot();
    writePrivate(root, "config/private/integrations/lanhu.yaml", "cookie: sid=1\n", 0o644);
    writeExample(root, "config/examples/integrations/lanhu.example.yaml", 'cookie: ""\n');
    const result = validateAllConfig(root);
    expect(result.issues.some((issue) => issue.message.includes("权限必须为 0600"))).toBe(true);
  });

  test("docs generated region round-trips through check mode", () => {
    const root = makeRoot();
    const readme = join(root, "config", "README.md");
    writeFileSync(readme, "# Kata runtime configuration\n\n手写区内容保持不变。\n");
    const first = applyConfigDocs("config/README.md", root);
    expect(first.changed).toBe(true);
    expect(readFileSync(readme, "utf8")).toContain("<!-- BEGIN GENERATED -->");
    const second = applyConfigDocs("config/README.md", root, { check: true });
    expect(second).toEqual({ ok: true, changed: false });
  });

  test("docs map each private file to its exact example instead of every family example", () => {
    const generated = renderConfigDocsSection();
    const lanhuRow = generated
      .split("\n")
      .find((line) => line.includes("config/private/integrations/lanhu.yaml"));
    expect(lanhuRow).toContain("config/examples/integrations/lanhu.example.yaml");
    expect(lanhuRow).not.toContain("zentao.example.yaml");
    expect(lanhuRow).not.toContain("notify.example.yaml");

    const hostsRow = generated
      .split("\n")
      .find((line) => line.includes("config/private/infrastructure/hosts.yaml"));
    expect(hostsRow).toContain("config/examples/infrastructure/hosts.example.yaml");
    expect(hostsRow).not.toContain("data_sources.example.yaml");
    expect(hostsRow).not.toContain("credentials.example.yaml");
  });

  test("registry rejects Playwright fields that the runtime parser rejects", () => {
    const root = makeRoot();
    const path = join(root, "config", "automation", "playwright.yaml");
    mkdirSync(join(root, "config", "automation"), { recursive: true });
    writeFileSync(path, "playwright:\n  unknown_key: true\n");
    expect(() => familyByName("automation").validateFile(path, root)).toThrow(/unknown_key/);
  });

  test("registry rejects malformed SQL profile regex before SQL lint execution", () => {
    const root = makeRoot();
    const path = join(root, "config", "policies", "sql-profiles.yaml");
    mkdirSync(join(root, "config", "policies"), { recursive: true });
    writeFileSync(
      path,
      "profiles:\n  broken-sql:\n    datasource_types: [Broken]\n    required_patterns:\n      - name: invalid-regex\n        pattern: '[unterminated'\n",
    );
    expect(() => familyByName("sql-profiles").validateFile(path, root)).toThrow(/正则无效/);
  });

  test("registry validates the nested ZenTao create contract when it is configured", () => {
    const root = makeRoot();
    const path = writePrivate(
      root,
      "config/private/integrations/zentao.yaml",
      "base_url: https://zentao.example.invalid\ncreate:\n  assignee:\n    account: qa\n  opened_build: trunk\n",
    );
    expect(() => familyByName("integrations").validateFile(path, root)).toThrow(/create\.product/);
  });

  test("validate flags legacy config path literals in tracked files", () => {
    const root = makeRoot();
    execSync("git init -q", { cwd: root, stdio: "ignore" });
    // 拼接避免测试源码本身被残留守卫扫到（植入对象是临时仓库的 README.md）。
    writeFileSync(join(root, "README.md"), `参考 config/${"plugin"}/lanhu.yaml\n`);
    execSync("git add README.md", { cwd: root, stdio: "ignore" });
    const result = validateAllConfig(root);
    expect(
      result.issues.some(
        (issue) => issue.path === "README.md" && issue.message.includes("旧配置路径残留"),
      ),
    ).toBe(true);
  });

  test("validate passes when tracked files are clean of legacy paths", () => {
    const root = makeRoot();
    execSync("git init -q", { cwd: root, stdio: "ignore" });
    writeFileSync(join(root, "README.md"), "参考 config/policies/repo-policy.yaml\n");
    execSync("git add README.md", { cwd: root, stdio: "ignore" });
    const result = validateAllConfig(root);
    expect(result.issues.some((issue) => issue.message.includes("旧配置路径残留"))).toBe(false);
  });
});
