import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { buildLanhuBridgeEnv, parseLanhuUrl } from "../../../cli/integrations/lanhu/fetch.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const KATA_TS = resolve(__dirname, "../../../cli/bin/kata.ts");
const LANHU_FETCH_TS = resolve(__dirname, "../../../cli/integrations/lanhu/fetch.ts");
const LANHU_BRIDGE_PY = resolve(__dirname, "../../../cli/integrations/lanhu/mcp-bridge/bridge.py");
const LANHU_REFRESH_PY = resolve(
  __dirname,
  "../../../cli/integrations/lanhu/mcp-bridge/refresh-cookie.py",
);
const LANHU_VENDOR_PY = resolve(
  __dirname,
  "../../../cli/integrations/lanhu/mcp-bridge/lanhu-mcp/lanhu_mcp_server.py",
);
const PROJECT_ROOT = resolve(__dirname, "../../..");

const TMP_DIR = join(tmpdir(), `lanhu-fetch-test-${process.pid}`);
const TEST_FEATURE_RELATIVE = join("v1", "【测试客户】【测试模块】蓝湖需求提取测试");

function createFakeProjectRoot(name: string): { root: string; feature: string } {
  const root = join(TMP_DIR, name);
  const feature = join(root, "workspace", "dataAssets", "features", TEST_FEATURE_RELATIVE);
  mkdirSync(feature, { recursive: true });
  mkdirSync(join(root, "config", "plugin"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "kata-test-root" }));
  return { root, feature };
}

afterEach(() => {
  try {
    rmSync(TMP_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe("buildLanhuBridgeEnv", () => {
  it("passes refreshed kata cookie to lanhu-mcp runtime env names", () => {
    const env = buildLanhuBridgeEnv("session=fresh-cookie", { EXISTING: "yes" });

    assert.equal(env.EXISTING, "yes");
    assert.equal(env.KATA_LANHU_COOKIE, "session=fresh-cookie");
    assert.equal(env.LANHU_COOKIE, "session=fresh-cookie");
    assert.equal(env.DDS_COOKIE, "session=fresh-cookie");
  });
});

describe("Lanhu bridge runtime paths", () => {
  it("resolves the bridge under cli/integrations/lanhu/mcp-bridge", () => {
    const source = readFileSync(LANHU_FETCH_TS, "utf8");

    assert.ok(source.includes("cli/integrations/lanhu/mcp-bridge"));
    assert.equal(source.includes(".claude/plugins/lanhu"), false);
    assert.equal(source.includes("process.exit("), false);
    assert.equal(source.includes("process.stderr.write"), false);
  });

  it("uses low-level static extraction and exact URL versions without MCP prompt wrappers", () => {
    const bridge = readFileSync(LANHU_BRIDGE_PY, "utf8");
    const vendor = readFileSync(LANHU_VENDOR_PY, "utf8");
    assert.ok(bridge.includes("_extract_static_page"));
    assert.equal(bridge.includes("lanhu_get_ai_analyze_page_result"), false);
    assert.ok(bridge.includes("page_filenames=html_filenames"));
    assert.ok(vendor.includes("_select_document_version"));
    assert.ok(vendor.includes("params.get('version_id')"));
  });

  it("keeps Lanhu credential and cookie refresh values out of CLI arguments and logs", () => {
    const refresh = readFileSync(LANHU_REFRESH_PY, "utf8");
    assert.equal(refresh.includes('parser.add_argument("--password"'), false);
    assert.equal(refresh.includes('parser.add_argument("--username"'), false);
    assert.equal(refresh.includes("正在登录蓝湖 ({username})"), false);
    assert.equal(refresh.includes("sys.stdout.write(cookie)"), false);
    assert.ok(refresh.includes("KATA_LANHU_COOKIE_OUTPUT"));
  });
});

describe("legacy Lanhu compatibility surface", () => {
  it("does not expose or retain the migrated lanhu command", () => {
    assert.equal(existsSync(resolve(PROJECT_ROOT, "cli/commands/lanhu.ts")), false);

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(`bun run "${KATA_TS}" lanhu --help`, {
        encoding: "utf8",
        cwd: PROJECT_ROOT,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      const e = err as { status?: number; stderr?: string };
      exitCode = e.status ?? 1;
      stderr = e.stderr ?? "";
    }
    assert.notEqual(exitCode, 0);
    assert.match(stderr, /未知命令: lanhu/);
  });
});

// ─── parseLanhuUrl ────────────────────────────────────────────────────────────

describe("parseLanhuUrl", () => {
  it("parses product spec URL with hash-based query params", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/product?tid=team-001&pid=proj-001&docId=doc-001";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "product-spec");
    assert.equal(result.params.tid, "team-001");
    assert.equal(result.params.pid, "proj-001");
    assert.equal(result.params.docId, "doc-001");
  });

  it("parses product spec URL with versionId", () => {
    const url =
      "https://lanhuapp.com/web/#/item/project/product?tid=t1&pid=p1&docId=d1&versionId=v99";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "product-spec");
    assert.equal(result.params.versionId, "v99");
  });

  it("parses design image URL", () => {
    const url = "https://lanhuapp.com/web/#/item/project/board?tid=team-002&image=img-abc";
    const result = parseLanhuUrl(url);
    assert.equal(result.pageType, "design-image");
    assert.equal(result.params.tid, "team-002");
    assert.equal(result.params.image, "img-abc");
  });

  it("returns unknown for non-lanhu domain", () => {
    const result = parseLanhuUrl("https://example.com/?docId=123");
    assert.equal(result.pageType, "unknown");
  });

  it("rejects non-HTTP(S) URLs even when the hostname matches", () => {
    const result = parseLanhuUrl(
      "file://lanhuapp.com/web/#/item/project/product?tid=t&pid=p&docId=d",
    );
    assert.equal(result.pageType, "unknown");
  });

  it("rejects domains that embed lanhuapp.com as a substring", () => {
    const suffixTrick = parseLanhuUrl(
      "https://evil-lanhuapp.com/web/#/item/project/product?tid=t&pid=p&docId=d",
    );
    assert.equal(suffixTrick.pageType, "unknown");
    const hostTrick = parseLanhuUrl(
      "https://lanhuapp.com.evil.com/web/#/item/project/product?tid=t&pid=p&docId=d",
    );
    assert.equal(hostTrick.pageType, "unknown");
  });

  it("accepts lanhuapp.com subdomains", () => {
    const result = parseLanhuUrl(
      "https://www.lanhuapp.com/web/#/item/project/product?tid=t1&pid=p1&docId=d1",
    );
    assert.equal(result.pageType, "product-spec");
  });

  it("returns unknown for lanhu URL without required params", () => {
    const result = parseLanhuUrl("https://lanhuapp.com/web/#/item/project/product?tid=t1");
    assert.equal(result.pageType, "unknown");
  });

  it("returns unknown for completely invalid URL", () => {
    const result = parseLanhuUrl("not-a-url-at-all");
    assert.equal(result.pageType, "unknown");
  });

  it("returns unknown for empty string", () => {
    const result = parseLanhuUrl("");
    assert.equal(result.pageType, "unknown");
  });
});

// ─── CLI Integration Tests ────────────────────────────────────────────────────

describe("CLI: --help", () => {
  it("prints usage and exits 0", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync(`bun run "${KATA_TS}" prd extract --help`, {
        encoding: "utf8",
        cwd: PROJECT_ROOT,
        env: { ...process.env },
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      const e = err as { status?: number; stdout?: string };
      exitCode = e.status ?? 1;
      stdout = e.stdout ?? "";
    }
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("--url") || stdout.includes("Usage"), "should show --url option");
  });
});

describe("CLI: missing KATA_LANHU_COOKIE", () => {
  it("exits 1 when KATA_LANHU_COOKIE is not set", () => {
    // A fake repo root without config/plugin/lanhu.yaml guarantees "no cookie
    // configured" regardless of this machine's real private config.
    const { root: fakeRoot, feature } = createFakeProjectRoot("fake-root");

    // Remove cookie/credential vars entirely: an explicit empty value falls back
    // to the config file, which the fake root does not provide either.
    const filteredEnv = Object.fromEntries(
      Object.entries(process.env).filter(
        ([k]) =>
          ![
            "KATA_LANHU_COOKIE",
            "LANHU_COOKIE",
            "DDS_COOKIE",
            "KATA_LANHU_USERNAME",
            "KATA_LANHU_PASSWORD",
            "KATA_WORKSPACE_ROOT",
          ].includes(k),
      ),
    );

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${KATA_TS}" prd extract --url "https://lanhuapp.com/web/#/item/project/product?tid=t&pid=p&docId=d&versionId=v&pageId=p" --feature "${feature}"`,
        {
          encoding: "utf8",
          cwd: fakeRoot,
          env: filteredEnv,
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
      stderr.includes("KATA_LANHU_COOKIE") || stderr.includes("MISSING_COOKIE"),
      `stderr should mention KATA_LANHU_COOKIE, got: ${stderr}`,
    );
  });
});

describe("CLI: invalid URL format", () => {
  it("exits 1 for non-lanhu URL", () => {
    const { root, feature } = createFakeProjectRoot("invalid-url-root");

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${KATA_TS}" prd extract --url "https://example.com/not-lanhu" --feature "${feature}"`,
        {
          encoding: "utf8",
          cwd: root,
          env: { ...process.env, KATA_LANHU_COOKIE: "fake-cookie-for-url-test" },
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
      stderr.includes("INVALID_URL") ||
        stderr.includes("Invalid") ||
        stderr.includes("Unsupported"),
      `stderr should mention invalid URL, got: ${stderr}`,
    );
  });

  it("exits 1 for URL missing required params", () => {
    const { root, feature } = createFakeProjectRoot("missing-params-root");

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${KATA_TS}" prd extract --url "https://lanhuapp.com/web/#/item/project/product?tid=only-tid" --feature "${feature}"`,
        {
          encoding: "utf8",
          cwd: root,
          env: { ...process.env, KATA_LANHU_COOKIE: "fake-cookie-for-url-test" },
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
      stderr.includes("INVALID_URL") || stderr.includes("Invalid"),
      `stderr should mention invalid URL, got: ${stderr}`,
    );
  });
});
