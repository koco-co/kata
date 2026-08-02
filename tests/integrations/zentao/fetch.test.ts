/**
 * tests/integrations/zentao/fetch.test.ts
 *
 * Unit tests for zentao/fetch.ts.
 * No network calls — all tests use pure functions or CLI subprocess with controlled env.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  downloadMarkdownAttachments,
  extractBugIdFromUrl,
  extractMarkdownAttachmentUrls,
  sanitizeEvidenceUrl,
} from "../../../cli/integrations/zentao/fetch.ts";
import {
  detectFixBranch,
  parseZentaoResponseText,
} from "../../../cli/integrations/zentao/parse.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const KATA_TS = resolve(__dirname, "../../../cli/bin/kata.ts");
const ZENTAO_FETCH_TS = resolve(__dirname, "../../../cli/integrations/zentao/fetch.ts");
const PROJECT_ROOT = resolve(__dirname, "../../../");

const TMP_DIR = join(tmpdir(), `zentao-fetch-test-${process.pid}`);

// Minimal fake repo root (workspace/ + package.json) so locateProjectRoot resolves
// there and config/private/integrations/zentao.yaml never exists — the missing-config branch is
// deterministic regardless of this machine's real plugin config.
function makeFakeRoot(): string {
  const root = join(TMP_DIR, "fakeroot");
  mkdirSync(join(root, "workspace"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}\n");
  return root;
}

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("ZenTao fetch library boundary", () => {
  it("returns results or throws instead of writing CLI output or exiting", () => {
    const source = readFileSync(ZENTAO_FETCH_TS, "utf8");
    assert.equal(source.includes("process.exit("), false);
    assert.equal(source.includes("process.stdout.write"), false);
  });
});

// ─── extractBugIdFromUrl ──────────────────────────────────────────────────────

describe("extractBugIdFromUrl", () => {
  it("extracts bug ID from standard zentao bug URL", () => {
    const url = "https://zentao.example.cn/zentao/bug-view-138845.html";
    assert.equal(extractBugIdFromUrl(url), 138845);
  });

  it("extracts bug ID from URL without domain prefix", () => {
    assert.equal(extractBugIdFromUrl("/zentao/bug-view-999.html"), 999);
  });

  it("extracts bug ID from URL with extra query params", () => {
    const url = "https://zentao.example.cn/zentao/bug-view-12345.html?foo=bar";
    assert.equal(extractBugIdFromUrl(url), 12345);
  });

  it("returns null for URL without bug-view pattern", () => {
    assert.equal(extractBugIdFromUrl("https://zentao.example.cn/zentao/story-view-100.html"), null);
  });

  it("returns null for empty string", () => {
    assert.equal(extractBugIdFromUrl(""), null);
  });

  it("returns null for completely invalid input", () => {
    assert.equal(extractBugIdFromUrl("not-a-url"), null);
  });

  it("handles single-digit bug ID", () => {
    assert.equal(extractBugIdFromUrl("/zentao/bug-view-1.html"), 1);
  });

  it("handles large bug ID numbers", () => {
    assert.equal(extractBugIdFromUrl("/zentao/bug-view-9999999.html"), 9_999_999);
  });
});

describe("sanitizeEvidenceUrl", () => {
  it("removes credentials, query parameters, and fragments before persistence", () => {
    assert.equal(
      sanitizeEvidenceUrl(
        "https://user:secret@zentao.example.cn/zentao/bug-view-1.html?token=secret#details",
        "https://zentao.example.cn/zentao/bug-view-1.html",
      ),
      "https://zentao.example.cn/zentao/bug-view-1.html",
    );
  });

  it("rejects non-HTTP URLs and falls back to the canonical evidence URL", () => {
    const fallback = "https://zentao.example.cn/zentao/bug-view-1.html";
    assert.equal(sanitizeEvidenceUrl("javascript:alert(1)", fallback), fallback);
  });
});

// ─── detectFixBranch ─────────────────────────────────────────────────────────

describe("detectFixBranch", () => {
  it("detects hotfix_ pattern in resolvedBuild", () => {
    const branch = detectFixBranch(["hotfix_6.4.10_138845"]);
    assert.ok(branch?.startsWith("hotfix_"), `expected hotfix_, got: ${branch}`);
    assert.equal(branch, "hotfix_6.4.10_138845");
  });

  it("detects hotfix/ pattern (slash separator)", () => {
    const branch = detectFixBranch(["release/hotfix/v6.4.10"]);
    assert.ok(branch !== null, "should detect hotfix pattern");
  });

  it("detects hotfix in title string", () => {
    const branch = detectFixBranch([null, null, "修复分支: hotfix_6.4.11_bug123"]);
    assert.ok(branch?.includes("hotfix_"), `expected hotfix match, got: ${branch}`);
  });

  it("returns null when no branch info present", () => {
    assert.equal(detectFixBranch(["已修复", "已验证", "fix in next release"]), null);
  });

  it("returns null for empty array", () => {
    assert.equal(detectFixBranch([]), null);
  });

  it("returns null for array of nulls", () => {
    assert.equal(detectFixBranch([null, undefined, null]), null);
  });

  it("skips null entries and finds branch in later entry", () => {
    const branch = detectFixBranch([null, undefined, "hotfix_7.0.0_fix"]);
    assert.equal(branch, "hotfix_7.0.0_fix");
  });

  it("prefers first hotfix match found across candidates", () => {
    const branch = detectFixBranch(["hotfix_6.4.0_first", "hotfix_6.4.1_second"]);
    assert.equal(branch, "hotfix_6.4.0_first");
  });
});

// ─── parseZentaoResponseText ───────────────────────────────────────────────────

describe("parseZentaoResponseText", () => {
  it("parses wrapped success payload when data is a JSON string", () => {
    const payload = JSON.stringify({
      status: "success",
      data: JSON.stringify({
        title: "BUG #115497 元数据导出为空",
        moduleName: "线上问题统计",
        steps: "1. 进入页面\n2. 点击导出",
      }),
    });

    const parsed = parseZentaoResponseText(payload);

    assert.deepEqual(parsed, {
      title: "BUG #115497 元数据导出为空",
      moduleName: "线上问题统计",
      steps: "1. 进入页面\n2. 点击导出",
    });
  });

  it("parses nested bug objects", () => {
    const payload = JSON.stringify({
      bug: {
        title: "BUG #100 测试",
        severity: "2",
      },
    });

    const parsed = parseZentaoResponseText(payload);

    assert.deepEqual(parsed, {
      title: "BUG #100 测试",
      severity: "2",
    });
  });

  it("returns null for html responses", () => {
    const parsed = parseZentaoResponseText("<html><title>登录</title></html>");
    assert.equal(parsed, null);
  });
});

// ─── embedded attachment evidence ────────────────────────────────────────────

describe("embedded attachment evidence", () => {
  it("extracts and de-duplicates ZenTao image references", () => {
    const urls = extractMarkdownAttachmentUrls([
      "现象\n![](/zentao/file-read-1.png)",
      "修复后\n![结果](/zentao/file-read-2.jpg)\n![](/zentao/file-read-1.png)",
    ]);

    assert.deepEqual(urls, ["/zentao/file-read-1.png", "/zentao/file-read-2.jpg"]);
  });

  it("downloads referenced images with the authenticated session", async () => {
    const output = join(TMP_DIR, "attachments");
    const calls: Array<{ url: string; cookie: string | null }> = [];
    const downloaded = await downloadMarkdownAttachments(
      [
        "![](/zentao/file-read-1.png?token=secret#preview)\n![](/zentao/file-read-1.png?token=secret#preview)",
      ],
      "http://zt.example",
      output,
      "zentaosid=good",
      async (url, init) => {
        calls.push({ url, cookie: new Headers(init?.headers).get("cookie") });
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      },
    );

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      url: "http://zt.example/zentao/file-read-1.png?token=secret#preview",
      cookie: "zentaosid=good",
    });
    assert.equal(downloaded.length, 1);
    assert.equal(downloaded[0].source_url, "http://zt.example/zentao/file-read-1.png");
    assert.deepEqual(readFileSync(join(output, "file-read-1.png")), Buffer.from([1, 2, 3]));
  });

  it("fails when referenced evidence cannot be downloaded", async () => {
    await assert.rejects(
      downloadMarkdownAttachments(
        ["![](/zentao/file-read-1.png)"],
        "http://zt.example",
        join(TMP_DIR, "failed"),
        "zentaosid=good",
        async () => new Response("missing", { status: 404 }),
      ),
      (error: Error & { code?: string }) => error.code === "ATTACHMENT_FETCH_FAILED",
    );
  });

  it("rejects a symlinked attachment output directory before downloading", async () => {
    const outside = join(TMP_DIR, "outside");
    const output = join(TMP_DIR, "linked-output");
    mkdirSync(outside, { recursive: true });
    symlinkSync(outside, output);
    await assert.rejects(
      downloadMarkdownAttachments(
        ["![](/zentao/file-read-1.png)"],
        "http://zt.example",
        output,
        "zentaosid=good",
        async () => new Response(new Uint8Array([1]), { status: 200 }),
      ),
      /符号链接/,
    );
  });
});

// ─── CLI: --help ──────────────────────────────────────────────────────────────

describe("CLI: --help", () => {
  it("prints usage and exits 0", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execFileSync("bun", ["run", KATA_TS, "zentao", "fetch", "--help"], {
        encoding: "utf8",
        cwd: PROJECT_ROOT,
        env: { ...process.env },
      });
    } catch (err) {
      const e = err as { status?: number; stdout?: string };
      exitCode = e.status ?? 1;
      stdout = e.stdout ?? "";
    }
    assert.equal(exitCode, 0, "should exit with code 0");
    assert.ok(
      stdout.includes("--bug-id") || stdout.includes("--url") || stdout.includes("Usage"),
      `should show options, got: ${stdout}`,
    );
  });
});

// ─── CLI: missing env vars ────────────────────────────────────────────────────

describe("CLI: missing config", () => {
  it("exits 1 when config/private/integrations/zentao.yaml is missing", () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const fakeRoot = makeFakeRoot();

    let exitCode = 0;
    let stderr = "";
    try {
      execFileSync(
        "bun",
        ["run", KATA_TS, "zentao", "fetch", "--bug-id", "138845", "--output", join(TMP_DIR, "out")],
        {
          encoding: "utf8",
          cwd: fakeRoot,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      stderr.includes("缺少") && stderr.includes("base_url"),
      `should mention the missing config, got: ${stderr}`,
    );
  });
});

// ─── CLI: config root resolution（回归：fetch 必须以仓库根定位 config/private/integrations/zentao.yaml）───

describe("CLI: config root resolution", () => {
  it("points at <root>/config/private/integrations/zentao.yaml", () => {
    mkdirSync(TMP_DIR, { recursive: true });
    const fakeRoot = makeFakeRoot();

    let exitCode = 0;
    let stderr = "";
    try {
      execFileSync(
        "bun",
        ["run", KATA_TS, "zentao", "fetch", "--bug-id", "138845", "--output", join(TMP_DIR, "out")],
        {
          encoding: "utf8",
          cwd: fakeRoot,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    const expectedYaml = join(fakeRoot, "config", "private", "integrations", "zentao.yaml");
    assert.ok(
      stderr.includes(expectedYaml),
      `hint should point at ${expectedYaml}, got: ${stderr}`,
    );
    assert.ok(
      !stderr.includes(join("cli", "config", "private", "integrations")),
      `hint must not resolve cli/ as config root, got: ${stderr}`,
    );
  });
});

// ─── CLI: invalid bug ID ──────────────────────────────────────────────────────

describe("CLI: invalid bug ID format", () => {
  it("exits 1 for non-numeric --bug-id", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execFileSync(
        "bun",
        [
          "run",
          KATA_TS,
          "zentao",
          "fetch",
          "--bug-id",
          "not-a-number",
          "--output",
          join(TMP_DIR, "out"),
        ],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      stderr.includes("Bug ID") || stderr.includes("格式") || stderr.includes("整数"),
      `should mention invalid ID format, got: ${stderr}`,
    );
  });

  it("exits 1 for partially numeric --bug-id that parseInt would have accepted", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execFileSync(
        "bun",
        ["run", KATA_TS, "zentao", "fetch", "--bug-id", "12abc", "--output", join(TMP_DIR, "out")],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      stderr.includes("Bug ID") || stderr.includes("整数"),
      `should mention invalid ID format, got: ${stderr}`,
    );
  });

  it("exits 1 for --url without bug-view pattern", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execFileSync(
        "bun",
        [
          "run",
          KATA_TS,
          "zentao",
          "fetch",
          "--url",
          "https://zentao.example.cn/zentao/story-view-100.html",
          "--output",
          join(TMP_DIR, "out"),
        ],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 0;
      stderr = e.stderr ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    assert.ok(
      stderr.includes("Bug ID") || stderr.includes("bug-view"),
      `should mention URL format issue, got: ${stderr}`,
    );
  });
});
