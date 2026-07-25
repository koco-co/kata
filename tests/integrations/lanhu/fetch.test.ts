import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildLanhuBridgeEnv,
  deriveVersionDir,
  extractImageUrls,
  htmlToMarkdown,
  inferKataProjectFromLanhuProjects,
  parseLanhuUrl,
  resolveOutputLayout,
  selectRequirementsForFetch,
  slugify,
} from "../../../cli/integrations/lanhu/fetch.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const KATA_TS = resolve(__dirname, "../../../cli/bin/kata.ts");
const LANHU_FETCH_TS = resolve(__dirname, "../../../cli/integrations/lanhu/fetch.ts");
const PROJECT_ROOT = resolve(__dirname, "../../..");

const TMP_DIR = join(tmpdir(), `lanhu-fetch-test-${process.pid}`);

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

// ─── htmlToMarkdown ───────────────────────────────────────────────────────────

describe("htmlToMarkdown", () => {
  it("converts <br> to newline", () => {
    const result = htmlToMarkdown("line1<br>line2");
    assert.ok(result.includes("line1\nline2"));
  });

  it("strips plain HTML tags", () => {
    const result = htmlToMarkdown("<p>Hello <b>world</b></p>");
    assert.ok(result.includes("Hello world"));
    assert.ok(!result.includes("<"));
  });

  it("decodes HTML entities", () => {
    const result = htmlToMarkdown("a &amp; b &lt;c&gt; &quot;d&quot; &nbsp;e");
    assert.ok(result.includes('a & b <c> "d"'));
    assert.ok(result.includes("e"));
  });

  it("converts heading tags", () => {
    const result = htmlToMarkdown("<h2>Section</h2>");
    assert.ok(result.includes("## Section"));
  });

  it("converts list items", () => {
    const result = htmlToMarkdown("<ul><li>Item A</li><li>Item B</li></ul>");
    assert.ok(result.includes("- Item A"));
    assert.ok(result.includes("- Item B"));
  });

  it("collapses excessive blank lines", () => {
    const result = htmlToMarkdown("<p>A</p><p></p><p></p><p>B</p>");
    assert.ok(!result.includes("\n\n\n"));
  });
});

// ─── slugify ─────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    assert.equal(slugify("Hello World"), "hello-world");
  });

  it("strips special characters except dashes and CJK", () => {
    assert.equal(slugify("foo!@#bar"), "foobar");
  });

  it("preserves CJK characters", () => {
    const result = slugify("商品管理列表");
    assert.ok(result.includes("商品管理列表"));
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    assert.equal(slugify(long).length, 60);
  });

  it("handles empty string", () => {
    assert.equal(slugify(""), "");
  });
});

// ─── deriveVersionDir ─────────────────────────────────────────────────────────

describe("deriveVersionDir", () => {
  it("derives a 3-segment version from a Lanhu doc title", () => {
    assert.equal(deriveVersionDir("资产V7.0.0（岚图/泸州老窖定制）"), "v7.0.0");
  });

  it("derives a lowercase 3-segment version", () => {
    assert.equal(deriveVersionDir("v6.4.10 迭代需求"), "v6.4.10");
  });

  it("derives a 2-segment version", () => {
    assert.equal(deriveVersionDir("数据资产 V6.4 版本"), "v6.4");
  });

  it("returns null when the title has no version", () => {
    assert.equal(deriveVersionDir("数据质量需求池"), null);
  });

  it("returns null for a single-segment version (needs at least vX.Y)", () => {
    assert.equal(deriveVersionDir("V7 预研"), null);
  });

  it("does not capture a partial version when a 4th segment follows", () => {
    assert.equal(deriveVersionDir("build v7.0.0.1"), null);
  });

  it("does not split a multi-digit segment of a 4-segment version", () => {
    // 回归：曾因 \d+ 回溯把 "10" 拆成 "1"，让 "V6.4.10.0" 误判成 "v6.4.1"
    assert.equal(deriveVersionDir("V6.4.10.0"), null);
    assert.equal(deriveVersionDir("数据V6.4.10.0标定"), null);
  });
});

// ─── resolveOutputLayout ──────────────────────────────────────────────────────

describe("resolveOutputLayout", () => {
  it("feature mode writes into the feature dir using inputs/ convention", () => {
    const layout = resolveOutputLayout({
      featureDir: "/abs/feature",
      baseDir: "/abs/base",
      yyyymm: "202606",
      reqDirName: "需求A",
    });
    assert.equal(layout.reqDir, "/abs/feature");
    assert.equal(layout.imagesDir, "/abs/feature/inputs/lanhu-snapshots");
    assert.equal(layout.refDocsDir, "/abs/feature/inputs/reference-docs");
    assert.equal(layout.prdFileName, "prd.md");
    assert.equal(layout.imageRefPrefix, "inputs/lanhu-snapshots");
  });

  it("legacy mode stages under {baseDir}/{yyyymm}/{reqDirName}/ with images + tmp", () => {
    const layout = resolveOutputLayout({
      baseDir: "/abs/base",
      yyyymm: "202606",
      reqDirName: "需求A",
    });
    assert.equal(layout.reqDir, "/abs/base/202606/需求A");
    assert.equal(layout.imagesDir, "/abs/base/202606/需求A/images");
    assert.equal(layout.refDocsDir, "/abs/base/202606/需求A/tmp");
    assert.equal(layout.prdFileName, "需求A.md");
    assert.equal(layout.imageRefPrefix, "images");
  });
});

// ─── Project inference ───────────────────────────────────────────────────────

describe("inferKataProjectFromLanhuProjects", () => {
  it("maps a Lanhu project alias to the owning kata project via repo_profiles", () => {
    const configText = JSON.stringify({
      projects: {
        dataAssets: {
          repo_profiles: {
            岚图: { repos: [] },
          },
        },
        xyzh: {
          repo_profiles: {},
        },
      },
    });

    assert.equal(inferKataProjectFromLanhuProjects(configText, ["岚图"]), "dataAssets");
  });

  it("refuses ambiguous Lanhu project aliases instead of guessing", () => {
    const configText = JSON.stringify({
      projects: {
        dataAssets: { repo_profiles: { 岚图: {} } },
        anotherProject: { repo_profiles: { 岚图: {} } },
      },
    });

    assert.equal(inferKataProjectFromLanhuProjects(configText, ["岚图"]), undefined);
  });
});

// ─── Page selection ──────────────────────────────────────────────────────────

describe("selectRequirementsForFetch", () => {
  it("uses URL pageId to select one Axure requirement instead of exporting the full document", () => {
    const selected = selectRequirementsForFetch(
      [
        {
          page: {
            id: "cd882ee83c4d440d878b49cc31f67cb6",
            name: "15698【数据地图】查询优化",
            path: "岚图/15698【数据地图】查询优化",
            requirement_id: "15698",
          },
          parsed: {
            project: "岚图",
            requirementId: "15698",
            requirementName: "【数据地图】查询优化",
          },
        },
        {
          page: {
            id: "5ff4dd80f815449d9bf323d5b7490f36",
            name: "15662【数据地图】支持筛选数据表是否绑定数据目录",
            path: "岚图/15662【数据地图】支持筛选数据表是否绑定数据目录",
            requirement_id: "15662",
          },
          parsed: {
            project: "岚图",
            requirementId: "15662",
            requirementName: "【数据地图】支持筛选数据表是否绑定数据目录",
          },
        },
      ],
      {
        pageId: "5ff4dd80f815449d9bf323d5b7490f36",
      },
    );

    assert.deepEqual(
      selected.map((item) => item.parsed.requirementId),
      ["15662"],
    );
  });
});

// ─── extractImageUrls ─────────────────────────────────────────────────────────

describe("extractImageUrls", () => {
  it("extracts url fields starting with http", () => {
    const data = { url: "https://cdn.lanhu.com/img1.png" };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/img1.png"));
  });

  it("extracts imageUrl fields", () => {
    const data = { imageUrl: "https://cdn.lanhu.com/img2.png" };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/img2.png"));
  });

  it("converts protocol-relative URLs to https", () => {
    const data = { url: "//cdn.lanhu.com/img3.png" };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/img3.png"));
  });

  it("deduplicates identical URLs", () => {
    const data = [
      { url: "https://cdn.lanhu.com/dup.png" },
      { url: "https://cdn.lanhu.com/dup.png" },
    ];
    const urls = extractImageUrls(data);
    assert.equal(urls.filter((u) => u === "https://cdn.lanhu.com/dup.png").length, 1);
  });

  it("recurses into nested objects", () => {
    const data = { outer: { inner: { url: "https://cdn.lanhu.com/nested.png" } } };
    const urls = extractImageUrls(data);
    assert.ok(urls.includes("https://cdn.lanhu.com/nested.png"));
  });

  it("recurses into arrays", () => {
    const data = [
      { url: "https://cdn.lanhu.com/arr1.png" },
      { url: "https://cdn.lanhu.com/arr2.png" },
    ];
    const urls = extractImageUrls(data);
    assert.equal(urls.length, 2);
  });

  it("ignores non-http string fields not named url/src/imageUrl/cover", () => {
    const data = { title: "https://cdn.lanhu.com/not-an-image.png" };
    const urls = extractImageUrls(data);
    assert.equal(urls.length, 0);
  });

  it("returns empty array for null input", () => {
    assert.deepEqual(extractImageUrls(null), []);
  });
});

// ─── CLI Integration Tests ────────────────────────────────────────────────────

describe("CLI: --help", () => {
  it("prints usage and exits 0", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync(`bun run "${KATA_TS}" lanhu fetch --help`, {
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
    mkdirSync(TMP_DIR, { recursive: true });

    // Set KATA_LANHU_COOKIE to empty string so initEnv won't overwrite it from .env
    // (initEnv only sets process.env[key] if it's undefined, not if it's "")
    const filteredEnv = {
      ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "KATA_LANHU_COOKIE")),
      KATA_LANHU_COOKIE: "",
      KATA_LANHU_USERNAME: "",
      KATA_LANHU_PASSWORD: "",
      LANHU_COOKIE: "",
      DDS_COOKIE: "",
    };

    let exitCode = 0;
    let stderr = "";
    try {
      // Run from PROJECT_ROOT so relative .env resolution works,
      // but with KATA_LANHU_COOKIE stripped from env so initEnv finds nothing
      execSync(
        `bun run "${KATA_TS}" lanhu fetch --url "https://lanhuapp.com/web/#/item/project/product?tid=t&pid=p&docId=d" --base-dir "${TMP_DIR}/out"`,
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
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
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${KATA_TS}" lanhu fetch --url "https://example.com/not-lanhu" --base-dir "${TMP_DIR}/out"`,
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
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
    mkdirSync(TMP_DIR, { recursive: true });

    let exitCode = 0;
    let stderr = "";
    try {
      execSync(
        `bun run "${KATA_TS}" lanhu fetch --url "https://lanhuapp.com/web/#/item/project/product?tid=only-tid" --base-dir "${TMP_DIR}/out"`,
        {
          encoding: "utf8",
          cwd: PROJECT_ROOT,
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
