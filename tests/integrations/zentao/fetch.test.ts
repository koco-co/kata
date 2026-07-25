/**
 * plugins/zentao/__tests__/fetch.test.ts
 *
 * Unit tests for zentao/fetch.ts.
 * No network calls — all tests use pure functions or CLI subprocess with controlled env.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  detectFixBranch,
  downloadMarkdownAttachments,
  extractBugIdFromUrl,
  extractMarkdownAttachmentUrls,
  parseZentaoResponseText,
} from "../../../cli/integrations/zentao/fetch.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const KATA_TS = resolve(__dirname, "../../../cli/bin/kata.ts");
const PROJECT_ROOT = resolve(__dirname, "../../../");

const TMP_DIR = join(tmpdir(), `zentao-fetch-test-${process.pid}`);

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

// ─── extractBugIdFromUrl ──────────────────────────────────────────────────────

describe("extractBugIdFromUrl", () => {
  it("extracts bug ID from standard zentao bug URL", () => {
    const url = "http://zenpms.dtstack.cn/zentao/bug-view-138845.html";
    assert.equal(extractBugIdFromUrl(url), 138845);
  });

  it("extracts bug ID from URL without domain prefix", () => {
    assert.equal(extractBugIdFromUrl("/zentao/bug-view-999.html"), 999);
  });

  it("extracts bug ID from URL with extra query params", () => {
    const url = "http://zenpms.dtstack.cn/zentao/bug-view-12345.html?foo=bar";
    assert.equal(extractBugIdFromUrl(url), 12345);
  });

  it("returns null for URL without bug-view pattern", () => {
    assert.equal(extractBugIdFromUrl("http://zenpms.dtstack.cn/zentao/story-view-100.html"), null);
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
      ["![](/zentao/file-read-1.png)\n![](/zentao/file-read-1.png)"],
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
      url: "http://zt.example/zentao/file-read-1.png",
      cookie: "zentaosid=good",
    });
    assert.equal(downloaded.length, 1);
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

describe("CLI: missing env vars", () => {
  it("exits 1 when KATA_ZENTAO_BASE_URL, KATA_ZENTAO_ACCOUNT, KATA_ZENTAO_PASSWORD are all missing", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    const strippedEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) =>
            k !== "KATA_ZENTAO_BASE_URL" &&
            k !== "KATA_ZENTAO_ACCOUNT" &&
            k !== "KATA_ZENTAO_PASSWORD",
        ),
      ),
      KATA_ZENTAO_BASE_URL: "",
      KATA_ZENTAO_ACCOUNT: "",
      KATA_ZENTAO_PASSWORD: "",
      // Point HOME away from real .env so initEnv won't load real credentials
    };

    let exitCode = 0;
    let stdout = "";
    try {
      execFileSync(
        "bun",
        ["run", KATA_TS, "zentao", "fetch", "--bug-id", "138845", "--output", join(TMP_DIR, "out")],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: strippedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    const parsed = JSON.parse(stdout) as { error: string; hint?: string };
    assert.ok(
      parsed.error.includes("KATA_ZENTAO_BASE_URL") ||
        parsed.error.includes("KATA_ZENTAO_ACCOUNT") ||
        parsed.error.includes("KATA_ZENTAO_PASSWORD") ||
        parsed.error.includes("缺少"),
      `should mention missing vars, got: ${parsed.error}`,
    );
  });
});

// ─── CLI: invalid bug ID ──────────────────────────────────────────────────────

describe("CLI: invalid bug ID format", () => {
  it("exits 1 for non-numeric --bug-id", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    const strippedEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) =>
            k !== "KATA_ZENTAO_BASE_URL" &&
            k !== "KATA_ZENTAO_ACCOUNT" &&
            k !== "KATA_ZENTAO_PASSWORD",
        ),
      ),
      KATA_ZENTAO_BASE_URL: "",
      KATA_ZENTAO_ACCOUNT: "",
      KATA_ZENTAO_PASSWORD: "",
    };

    let exitCode = 0;
    let stdout = "";
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
          env: strippedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    // Should output error about invalid bug ID before reaching env check
    const parsed = JSON.parse(stdout) as { error: string };
    assert.ok(
      parsed.error.includes("Bug ID") ||
        parsed.error.includes("格式") ||
        parsed.error.includes("整数"),
      `should mention invalid ID format, got: ${parsed.error}`,
    );
  });

  it("exits 1 for --url without bug-view pattern", () => {
    mkdirSync(TMP_DIR, { recursive: true });

    const strippedEnv = {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([k]) =>
            k !== "KATA_ZENTAO_BASE_URL" &&
            k !== "KATA_ZENTAO_ACCOUNT" &&
            k !== "KATA_ZENTAO_PASSWORD",
        ),
      ),
      KATA_ZENTAO_BASE_URL: "",
      KATA_ZENTAO_ACCOUNT: "",
      KATA_ZENTAO_PASSWORD: "",
    };

    let exitCode = 0;
    let stdout = "";
    try {
      execFileSync(
        "bun",
        [
          "run",
          KATA_TS,
          "zentao",
          "fetch",
          "--url",
          "http://zenpms.dtstack.cn/zentao/story-view-100.html",
          "--output",
          join(TMP_DIR, "out"),
        ],
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
          env: strippedEnv,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
    } catch (err) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = e.status ?? 0;
      stdout = e.stdout ?? "";
    }

    assert.equal(exitCode, 1, "should exit with code 1");
    const parsed = JSON.parse(stdout) as { error: string };
    assert.ok(
      parsed.error.includes("Bug ID") || parsed.error.includes("bug-view"),
      `should mention URL format issue, got: ${parsed.error}`,
    );
  });
});
