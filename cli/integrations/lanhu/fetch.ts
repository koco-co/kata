#!/usr/bin/env bun
/**
 * cli/integrations/lanhu/fetch.ts — 蓝湖 PRD 内容 + 截图抓取器 (bridge adapter)
 *
 * Calls cli/integrations/lanhu/mcp-bridge/bridge.py via subprocess to fetch PRD content,
 * then downloads images and produces per-requirement PRD files.
 *
 * Usage:
 *   kata lanhu fetch --url "https://lanhuapp.com/web/#/item/..." --project <project>
 *   kata lanhu fetch --url "https://lanhuapp.com/web/#/item/..." --pages "15525,15529"
 *   kata lanhu fetch --help
 */

import { type SpawnSyncOptionsWithStringEncoding, spawnSync } from "node:child_process";
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import { getEnv, initEnv } from "../../lib/env.ts";
import { prdsDir, repoRoot } from "../../lib/paths.ts";

const LANHU_BRIDGE_RELATIVE_DIR = "cli/integrations/lanhu/mcp-bridge";
const LANHU_MCP_RELATIVE_DIR = `${LANHU_BRIDGE_RELATIVE_DIR}/lanhu-mcp`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface LanhuQueryParams {
  tid?: string;
  pid?: string;
  docId?: string;
  image?: string;
  versionId?: string;
  pageId?: string;
  [key: string]: string | undefined;
}

type PageType = "product-spec" | "design-image" | "unknown";

interface ParsedLanhuUrl {
  pageType: PageType;
  params: LanhuQueryParams;
}

interface BridgePage {
  name: string;
  path: string;
  content: string;
  images: string[];
}

interface BridgeOutput {
  title: string;
  doc_type: string;
  total_pages: number;
  pages: BridgePage[];
}

interface BridgeListPage {
  name: string;
  path: string;
  id: string;
  requirement_id: string | null;
}

interface BridgeListOutput {
  title: string;
  doc_type: string;
  total_pages: number;
  pages: BridgeListPage[];
}

interface ImageRef {
  url: string;
  name: string;
}

interface RequirementInfo {
  requirement_id: string;
  requirement_name: string;
  project: string;
  lanhu_project: string;
  workspace_project: string | null;
  prd_dir: string;
  prd_path: string;
  images_count: number;
}

interface FetchOutput {
  title: string;
  /** Semantic version dir (e.g. "v7.0.0") derived from the doc title; null when absent. */
  derived_version: string | null;
  total_requirements: number;
  requirements: RequirementInfo[];
}

interface ErrorOutput {
  error: string;
  code: string;
}

interface ParsedRequirement {
  project: string;
  requirementId: string;
  requirementName: string;
}

interface RequirementCandidate {
  page: BridgeListPage;
  parsed: ParsedRequirement;
}

export interface RunOptions {
  project?: string;
  baseDir?: string;
  pagesFilter?: string;
  /** Target a single feature dir; writes prd.md + inputs/ instead of {baseDir}/{yyyymm}/ staging. */
  featureDir?: string;
}

/** Where a requirement's fetched files land, computed from feature-dir vs legacy base-dir mode. */
export interface OutputLayout {
  /** Directory the requirement's prd markdown is written to. */
  reqDir: string;
  /** Absolute dir for screenshot images. */
  imagesDir: string;
  /** Absolute dir for reference .txt files. */
  refDocsDir: string;
  /** Markdown filename written at reqDir. */
  prdFileName: string;
  /** Path prefix used in markdown image refs (relative to reqDir). */
  imageRefPrefix: string;
}

interface CommandFailure {
  stderr?: string;
  message?: string;
}

function runCommand(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding,
): string {
  const result = spawnSync(command, args, {
    ...options,
    shell: false,
  });

  if (result.error) {
    throw {
      stderr: result.stderr,
      message: result.error.message,
    } satisfies CommandFailure;
  }

  if (result.status !== 0) {
    throw {
      stderr: result.stderr,
      message: `${command} exited with status ${result.status ?? "unknown"}`,
    } satisfies CommandFailure;
  }

  return result.stdout;
}

// ─── URL Parsing ─────────────────────────────────────────────────────────────

export function parseLanhuUrl(rawUrl: string): ParsedLanhuUrl {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { pageType: "unknown", params: {} };
  }

  if (!url.hostname.includes("lanhuapp.com")) {
    return { pageType: "unknown", params: {} };
  }

  // Lanhu uses hash-based routing; query params are in the fragment after '?'
  const hashPart = url.hash; // e.g. "#/item/project/product?tid=xxx&pid=xxx&docId=xxx"
  const hashQueryIdx = hashPart.indexOf("?");
  const params: LanhuQueryParams = {};

  if (hashQueryIdx !== -1) {
    const hashQuery = hashPart.slice(hashQueryIdx + 1);
    for (const [key, val] of new URLSearchParams(hashQuery)) {
      params[key] = val;
    }
  }

  // Also parse real query params (some share links use real query)
  for (const [key, val] of url.searchParams) {
    params[key] = val;
  }

  // Determine page type
  if (params.docId && params.tid && params.pid) {
    return { pageType: "product-spec", params };
  }

  if (params.image && params.tid) {
    return { pageType: "design-image", params };
  }

  return { pageType: "unknown", params: {} };
}

// ─── HTML → Markdown ─────────────────────────────────────────────────────────

export function htmlToMarkdown(html: string): string {
  return (
    html
      // Block elements → newlines
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<h([1-6])[^>]*>/gi, (_, n) => `${"#".repeat(Number(n))} `)
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
      // Decode common HTML entities
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Collapse excess blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// ─── Slug ─────────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .slice(0, 60);
}

// ─── Image extraction ────────────────────────────────────────────────────────

export function extractImageUrls(data: unknown): string[] {
  const urls: string[] = [];

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (
        typeof value === "string" &&
        (key === "url" || key === "src" || key === "imageUrl" || key === "cover") &&
        (value.startsWith("http") || value.startsWith("//"))
      ) {
        urls.push(value.startsWith("//") ? `https:${value}` : value);
      } else {
        walk(value);
      }
    }
  }

  walk(data);
  return [...new Set(urls)];
}

// ─── Image Compression ──────────────────────────────────────────────────────

const MAX_IMAGE_DIMENSION = 2000;

async function compressImage(srcPath: string, destPath: string): Promise<void> {
  const inputBuffer = readFileSync(srcPath);
  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = metadata;

  if (!width || !height || (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION)) {
    if (srcPath !== destPath) {
      copyFileSync(srcPath, destPath);
    }
    return;
  }

  const compressed = await sharp(inputBuffer)
    .resize({
      width: width > height ? MAX_IMAGE_DIMENSION : undefined,
      height: height >= width ? MAX_IMAGE_DIMENSION : undefined,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();
  writeFileSync(destPath, compressed);
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
  Referer: "https://lanhuapp.com/",
};

async function downloadImage(imageUrl: string, destPath: string, cookie: string): Promise<void> {
  const response = await fetch(imageUrl, {
    headers: {
      ...COMMON_HEADERS,
      Cookie: cookie,
    },
  });

  if (!response.ok) {
    throw new Error(`Image download failed: HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const dest = createWriteStream(destPath);
  await pipeline(response.body as unknown as NodeJS.ReadableStream, dest);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Derive a semantic version directory from a Lanhu doc title.
 * "资产V7.0.0（岚图/泸州老窖定制）" → "v7.0.0"; "v6.4.10 迭代" → "v6.4.10".
 * Accepts 2- or 3-segment versions (matching features layout VERSION_DIR_RE); returns null when absent.
 */
export function deriveVersionDir(title: string): string | null {
  // 末尾负向先行同时排除「数字」与「点」：否则 \d+ 会把多位段（如 10）回溯拆成 1+0，
  // 让 "V6.4.10.0" 漏判成 "v6.4.1"。要求版本后面既不接数字也不接点，才算完整版本号。
  const m = title.match(/[vV](\d+(?:\.\d+){1,2})(?![\d.])/);
  return m ? `v${m[1]}` : null;
}

/**
 * Resolve where a requirement's files land. Feature mode writes directly into the feature
 * dir using the kata inputs/ convention (prd.md + inputs/lanhu-snapshots + inputs/reference-docs);
 * legacy mode stages under {baseDir}/{yyyymm}/{reqDirName}/ with images/ + tmp/.
 */
export function resolveOutputLayout(params: {
  featureDir?: string;
  baseDir: string;
  yyyymm: string;
  reqDirName: string;
}): OutputLayout {
  if (params.featureDir) {
    return {
      reqDir: params.featureDir,
      imagesDir: join(params.featureDir, "inputs", "lanhu-snapshots"),
      refDocsDir: join(params.featureDir, "inputs", "reference-docs"),
      prdFileName: "prd.md",
      imageRefPrefix: "inputs/lanhu-snapshots",
    };
  }
  const reqDir = join(params.baseDir, params.yyyymm, params.reqDirName);
  return {
    reqDir,
    imagesDir: join(reqDir, "images"),
    refDocsDir: join(reqDir, "tmp"),
    prdFileName: `${params.reqDirName}.md`,
    imageRefPrefix: "images",
  };
}

function parseRequirementFromPageName(pageName: string, pagePath: string): ParsedRequirement {
  // pagePath format: "岚图/15525【内置规则丰富】一致性，..."
  // pageName format: "15525【内置规则丰富】一致性，..."
  const pathParts = pagePath.split("/");
  const project = pathParts.length > 1 ? pathParts[0] : "";

  // Extract requirement ID (leading number from name)
  const idMatch = pageName.match(/^(\d+)/);
  const requirementId = idMatch ? idMatch[1] : "";

  // Requirement name without the leading ID prefix
  // "15525【内置规则丰富】一致性，..." → "【内置规则丰富】一致性，..."
  const requirementName = pageName.replace(/^\d+/, "").replace(/\//g, "_");

  return { project, requirementId, requirementName };
}

export function selectRequirementsForFetch(
  allRequirements: RequirementCandidate[],
  options: { pageId?: string; pagesFilter?: string },
): RequirementCandidate[] {
  if (options.pagesFilter) {
    const filterIds = new Set(options.pagesFilter.split(",").map((id) => id.trim()));
    return allRequirements.filter((r) => filterIds.has(r.parsed.requirementId));
  }

  if (options.pageId) {
    return allRequirements.filter((r) => r.page.id === options.pageId);
  }

  return allRequirements;
}

export function inferKataProjectFromLanhuProjects(
  configText: string,
  lanhuProjects: string[],
): string | undefined {
  let config: {
    projects?: Record<string, { repo_profiles?: Record<string, unknown> }>;
  };
  try {
    config = JSON.parse(configText) as typeof config;
  } catch {
    return undefined;
  }

  const aliases = new Set(lanhuProjects.map((project) => project.trim()).filter(Boolean));
  const candidates = new Set<string>();
  for (const [projectName, projectConfig] of Object.entries(config.projects ?? {})) {
    if (aliases.has(projectName)) candidates.add(projectName);
    const repoProfiles = projectConfig.repo_profiles ?? {};
    for (const repoProfileName of Object.keys(repoProfiles)) {
      if (aliases.has(repoProfileName)) candidates.add(projectName);
    }
  }

  return candidates.size === 1 ? [...candidates][0] : undefined;
}

function inferKataProjectFromConfig(
  projectRoot: string,
  lanhuProjects: string[],
): string | undefined {
  const configPath = resolve(projectRoot, "config.json");
  if (!existsSync(configPath)) return undefined;
  return inferKataProjectFromLanhuProjects(readFileSync(configPath, "utf8"), lanhuProjects);
}

function resolveWorkspaceProject(
  projectRoot: string,
  requestedProject: string | undefined,
  lanhuProjects: string[],
): string | undefined {
  if (requestedProject && requestedProject !== "auto") return requestedProject;
  return inferKataProjectFromConfig(projectRoot, lanhuProjects);
}

interface ParsedTxtSections {
  tips: string;
  componentText: string;
  fullText: string;
}

/**
 * Parse structured sections from lanhu-mcp .txt files.
 * The .txt files contain sections like:
 *   [Important Tips/Warnings]
 *   [Flowchart/Component Text]
 *   [Full Page Text]
 */
function parseTxtSections(txtFiles: string[]): ParsedTxtSections {
  const result: ParsedTxtSections = {
    tips: "",
    componentText: "",
    fullText: "",
  };

  for (const txtPath of txtFiles) {
    if (!existsSync(txtPath)) continue;
    const content = readFileSync(txtPath, "utf8");

    // Split by section headers
    const tipsMatch = content.match(/\[Important Tips\/Warnings\]\s*\n([\s\S]*?)(?=\n\[|$)/);
    const componentMatch = content.match(/\[Flowchart\/Component Text\]\s*\n([\s\S]*?)(?=\n\[|$)/);
    const fullTextMatch = content.match(/\[Full Page Text\]\s*\n([\s\S]*?)(?=\n\[|$)/);

    if (tipsMatch?.[1]?.trim()) {
      result.tips += (result.tips ? "\n\n" : "") + tipsMatch[1].trim();
    }
    if (componentMatch?.[1]?.trim()) {
      result.componentText += (result.componentText ? "\n\n" : "") + componentMatch[1].trim();
    }
    if (fullTextMatch?.[1]?.trim()) {
      result.fullText += (result.fullText ? "\n\n" : "") + fullTextMatch[1].trim();
    }
  }

  return result;
}

// ─── Bridge Helpers ──────────────────────────────────────────────────────────

function ensureLanhuMcpReady(projectRoot: string): void {
  const mcpDir = join(projectRoot, LANHU_MCP_RELATIVE_DIR);
  const venvPath = join(mcpDir, ".venv");
  if (existsSync(venvPath)) return;

  // Check if the bundled lanhu-mcp directory exists at all
  if (!existsSync(mcpDir)) {
    process.stderr.write(
      "[lanhu] 外部依赖缺失: lanhu-mcp 目录不存在。\n" +
        "[lanhu] Lanhu/Axure PRD 抓取需要此依赖。\n" +
        `[lanhu] 请确认 ${LANHU_MCP_RELATIVE_DIR} 已存在。\n`,
    );
    process.exit(1);
  }

  const setupScript = join(projectRoot, LANHU_BRIDGE_RELATIVE_DIR, "setup.sh");
  try {
    runCommand("bash", [setupScript], {
      encoding: "utf8",
      stdio: "pipe",
      cwd: projectRoot,
    });
  } catch {
    process.stderr.write(
      "[lanhu] 外部依赖安装失败: lanhu-mcp Python 环境初始化出错。\n" +
        "[lanhu] 请确保已安装 Python 3 和 uv (https://docs.astral.sh/uv/)，然后重试。\n",
    );
    process.exit(1);
  }
}

interface BridgeCallError {
  error: string;
  code: string;
  isCookieError: boolean;
}

export function buildLanhuBridgeEnv(
  cookie: string,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    KATA_LANHU_COOKIE: cookie,
    LANHU_COOKIE: cookie,
    DDS_COOKIE: cookie,
  };
}

function parseBridgeCallError(err: unknown): BridgeCallError {
  const e = err as { stderr?: string; message?: string };
  const stderrText = e.stderr ?? "";

  try {
    const bridgeError = JSON.parse(stderrText) as ErrorOutput;
    const isCookieError =
      bridgeError.code === "COOKIE_EXPIRED" ||
      bridgeError.code === "MISSING_COOKIE" ||
      bridgeError.error.includes("418") ||
      bridgeError.error.includes("permission") ||
      bridgeError.error.includes("401") ||
      bridgeError.error.includes("403");
    return { ...bridgeError, isCookieError };
  } catch {
    const msg = stderrText || e.message || "unknown error";
    const isCookieError =
      msg.includes("418") || msg.includes("permission") || msg.includes("Cookie");
    return {
      error: `Bridge call failed: ${msg}`,
      code: "BRIDGE_ERROR",
      isCookieError,
    };
  }
}

function tryCallBridgeListPages(
  projectRoot: string,
  rawUrl: string,
  cookie: string,
): BridgeListOutput | BridgeCallError {
  const bridgeScript = resolve(projectRoot, LANHU_BRIDGE_RELATIVE_DIR, "bridge.py");
  const mcpDir = resolve(projectRoot, LANHU_MCP_RELATIVE_DIR);
  try {
    const stdout = runCommand(
      "uv",
      ["run", "python", bridgeScript, "--url", rawUrl, "--list-pages"],
      {
        cwd: mcpDir,
        env: buildLanhuBridgeEnv(cookie),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60_000,
      },
    );

    return JSON.parse(stdout) as BridgeListOutput;
  } catch (err) {
    return parseBridgeCallError(err);
  }
}

function callBridgeListPagesWithRetry(
  projectRoot: string,
  rawUrl: string,
  cookie: string,
): { listResult: BridgeListOutput; cookie: string } {
  const result = tryCallBridgeListPages(projectRoot, rawUrl, cookie);
  if ("pages" in result) {
    return { listResult: result, cookie };
  }

  if (!result.isCookieError) {
    process.stderr.write(
      `${JSON.stringify({ error: result.error, code: result.code }, null, 2)}\n`,
    );
    process.exit(1);
  }

  process.stderr.write("Cookie 失效，正在自动刷新...\n");
  const newCookie = refreshCookie(projectRoot, rawUrl);
  if (!newCookie) {
    process.stderr.write(
      `${JSON.stringify(
        {
          error:
            "Cookie 刷新失败。请手动更新 .env 中的 KATA_LANHU_COOKIE，或配置 KATA_LANHU_USERNAME/KATA_LANHU_PASSWORD。",
          code: "COOKIE_REFRESH_FAILED",
        },
        null,
        2,
      )}\n`,
    );
    process.exit(1);
  }

  const retry = tryCallBridgeListPages(projectRoot, rawUrl, newCookie);
  if ("pages" in retry) {
    return { listResult: retry, cookie: newCookie };
  }

  process.stderr.write(`${JSON.stringify({ error: retry.error, code: retry.code }, null, 2)}\n`);
  process.exit(1);
  throw new Error("Unreachable");
}

function tryCallBridge(
  projectRoot: string,
  rawUrl: string,
  pageId: string | undefined,
  cookie: string,
  pageNames?: string,
): BridgeOutput | BridgeCallError {
  const bridgeScript = resolve(projectRoot, LANHU_BRIDGE_RELATIVE_DIR, "bridge.py");
  const mcpDir = resolve(projectRoot, LANHU_MCP_RELATIVE_DIR);

  const args = ["run", "python", bridgeScript, "--url", rawUrl];
  if (pageId) {
    args.push("--page-id", pageId);
  }
  if (pageNames) {
    args.push("--page-names", pageNames);
  }

  try {
    const stdout = runCommand("uv", args, {
      cwd: mcpDir,
      env: buildLanhuBridgeEnv(cookie),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 180_000,
    });

    return JSON.parse(stdout) as BridgeOutput;
  } catch (err) {
    return parseBridgeCallError(err);
  }
}

// ─── Cookie Refresh ─────────────────────────────────────────────────────────

function refreshCookie(projectRoot: string, targetUrl: string): string | null {
  const refreshScript = resolve(projectRoot, LANHU_BRIDGE_RELATIVE_DIR, "refresh-cookie.py");
  const mcpDir = resolve(projectRoot, LANHU_MCP_RELATIVE_DIR);
  const envPath = resolve(projectRoot, ".env");

  const args = ["run", "python", refreshScript, "--target-url", targetUrl, "--update-env", envPath];

  try {
    const newCookie = runCommand("uv", args, {
      cwd: mcpDir,
      encoding: "utf8",
      stdio: ["inherit", "pipe", "inherit"],
      timeout: 120_000,
    });
    return newCookie.trim() || null;
  } catch {
    return null;
  }
}

function callBridgeWithRetry(
  projectRoot: string,
  rawUrl: string,
  pageId: string | undefined,
  cookie: string,
  pageNames?: string,
): BridgeOutput {
  const result = tryCallBridge(projectRoot, rawUrl, pageId, cookie, pageNames);

  // Success on first try
  if ("pages" in result) {
    return result;
  }

  // Not a cookie error — fail immediately
  if (!result.isCookieError) {
    process.stderr.write(
      `${JSON.stringify({ error: result.error, code: result.code }, null, 2)}\n`,
    );
    process.exit(1);
  }

  // Cookie error — attempt auto-refresh
  process.stderr.write("Cookie 失效，正在自动刷新...\n");
  const newCookie = refreshCookie(projectRoot, rawUrl);

  if (!newCookie) {
    process.stderr.write(
      `${JSON.stringify(
        {
          error:
            "Cookie 刷新失败。请手动更新 .env 中的 KATA_LANHU_COOKIE，或配置 KATA_LANHU_USERNAME/KATA_LANHU_PASSWORD。",
          code: "COOKIE_REFRESH_FAILED",
        },
        null,
        2,
      )}\n`,
    );
    process.exit(1);
  }

  // Retry with new cookie
  const retry = tryCallBridge(projectRoot, rawUrl, pageId, newCookie, pageNames);
  if ("pages" in retry) {
    return retry;
  }

  process.stderr.write(`${JSON.stringify({ error: retry.error, code: retry.code }, null, 2)}\n`);
  process.exit(1);
  throw new Error("Unreachable");
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

export async function runFetch(rawUrl: string, options: RunOptions): Promise<void> {
  // 1. Load .env from repository root.
  const projectRoot = repoRoot();
  initEnv(resolve(projectRoot, ".env"));

  let cookie = getEnv("KATA_LANHU_COOKIE") ?? "";
  if (!cookie) {
    // No cookie at all — try to get one via auto-login
    process.stderr.write("KATA_LANHU_COOKIE 未配置，尝试自动登录获取...\n");
    const newCookie = refreshCookie(projectRoot, rawUrl);
    if (!newCookie) {
      const err: ErrorOutput = {
        error:
          "KATA_LANHU_COOKIE 未配置且自动登录失败。请配置 KATA_LANHU_USERNAME/KATA_LANHU_PASSWORD 或手动设置 KATA_LANHU_COOKIE。",
        code: "MISSING_COOKIE",
      };
      process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
      process.exit(1);
    }
    cookie = newCookie;
  }

  // 2. Parse URL
  const parsed = parseLanhuUrl(rawUrl);
  if (parsed.pageType === "unknown") {
    const err: ErrorOutput = {
      error:
        "Invalid or unsupported Lanhu URL. Expected format: https://lanhuapp.com/web/#/item/project/product?tid=xxx&pid=xxx&docId=xxx",
      code: "INVALID_URL",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // 3. Ensure bridge dependencies are ready
  ensureLanhuMcpReady(projectRoot);

  // 4. List all pages from document
  const listCall = callBridgeListPagesWithRetry(projectRoot, rawUrl, cookie);
  const listResult = listCall.listResult;
  cookie = listCall.cookie;
  const title = listResult.title || "蓝湖需求文档";

  // 5. Parse page names to extract requirement info
  const allRequirements = listResult.pages.map((page) => ({
    page,
    parsed: parseRequirementFromPageName(page.name, page.path),
  }));

  // 6. Prefer explicit --pages; otherwise use URL pageId to avoid exporting the whole Axure doc.
  const selectedRequirements = selectRequirementsForFetch(allRequirements, {
    pageId: parsed.params.pageId,
    pagesFilter: options.pagesFilter,
  });

  if (selectedRequirements.length === 0) {
    const err: ErrorOutput = {
      error: `No requirements matched the filter: ${options.pagesFilter ?? parsed.params.pageId ?? ""}`,
      code: "NO_MATCHING_REQUIREMENTS",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  // 7. Process each requirement
  const yyyymm = currentYYYYMM();
  const workspaceProject = resolveWorkspaceProject(
    projectRoot,
    options.project,
    selectedRequirements.map(({ parsed }) => parsed.project),
  );
  if (!options.baseDir && !workspaceProject) {
    const err: ErrorOutput = {
      error: "Cannot resolve a kata project. Pass --project or --base-dir.",
      code: "PROJECT_REQUIRED",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }
  let absBaseDir: string;
  if (options.baseDir) {
    absBaseDir = resolve(projectRoot, options.baseDir);
  } else if (workspaceProject) {
    absBaseDir = prdsDir(workspaceProject);
  } else {
    return;
  }

  // Feature 模式只能对准单个需求；命中多个时无法消歧，拒绝而非乱写同一目录
  const absFeatureDir = options.featureDir ? resolve(projectRoot, options.featureDir) : undefined;
  if (absFeatureDir && selectedRequirements.length !== 1) {
    const err: ErrorOutput = {
      error: `--feature-dir targets a single requirement, but ${selectedRequirements.length} matched. Narrow with --pages or a page-scoped URL.`,
      code: "FEATURE_DIR_MULTI_REQUIREMENT",
    };
    process.stderr.write(`${JSON.stringify(err, null, 2)}\n`);
    process.exit(1);
  }

  const requirementInfos: RequirementInfo[] = [];

  for (const { page, parsed: reqInfo } of selectedRequirements) {
    const reqDirName = reqInfo.requirementName;
    const layout = resolveOutputLayout({
      featureDir: absFeatureDir,
      baseDir: absBaseDir,
      yyyymm,
      reqDirName,
    });
    const reqDir = layout.reqDir;
    const imagesDir = layout.imagesDir;
    const tmpDir = layout.refDocsDir;
    mkdirSync(imagesDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });

    // Fetch content for this specific requirement
    const bridgeResult = callBridgeWithRetry(projectRoot, rawUrl, undefined, cookie, page.name);

    // Collect images: prefer per-element images from Axure resource dir over full-page screenshot
    const collectedImages: ImageRef[] = [];

    // Try to find Axure resource images for this page
    const docId = parsed.params.docId ?? "";
    const mcpDir = resolve(projectRoot, LANHU_MCP_RELATIVE_DIR);
    const axureImagesBase = join(mcpDir, "data", `axure_extract_${docId.slice(0, 8)}`, "images");
    // The page folder name in Axure resources uses the original page name (with ID prefix)
    const axurePageDir = existsSync(axureImagesBase)
      ? readdirSync(axureImagesBase).find((dir) => dir.startsWith(reqInfo.requirementId))
      : undefined;
    const axurePageImagesDir = axurePageDir ? join(axureImagesBase, axurePageDir) : undefined;

    if (
      axurePageImagesDir &&
      existsSync(axurePageImagesDir) &&
      statSync(axurePageImagesDir).isDirectory()
    ) {
      // Copy meaningful images from Axure resource dir (skip tiny icons)
      const MIN_IMAGE_SIZE = 2048; // 2KB minimum to skip tiny SVG icons
      const imageFiles = readdirSync(axurePageImagesDir).filter((f) => {
        const ext = extname(f).toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".svg", ".webp"].includes(ext)) return false;
        const filePath = join(axurePageImagesDir, f);
        return statSync(filePath).size >= MIN_IMAGE_SIZE;
      });

      for (const [idx, file] of imageFiles.entries()) {
        const srcPath = join(axurePageImagesDir, file);
        const ext = extname(file);
        const fileName = `${idx + 1}-${basename(file, ext)}${ext}`;
        const destPath = join(imagesDir, fileName);
        await compressImage(srcPath, destPath);
        collectedImages.push({ url: srcPath, name: fileName });
      }
    }

    // Also copy the full-page screenshot and save .txt to tmp/
    let imgIdx = collectedImages.length;
    const txtFiles: string[] = []; // track .txt files for later parsing
    for (const bridgePage of bridgeResult.pages) {
      for (const imgSrc of bridgePage.images) {
        // Save .txt files to tmp/ for archival and later parsing
        if (imgSrc.endsWith(".txt")) {
          if (existsSync(imgSrc)) {
            const txtName = basename(imgSrc);
            const destPath = join(tmpDir, txtName);
            copyFileSync(imgSrc, destPath);
            txtFiles.push(destPath);
          }
          continue;
        }
        // Skip non-image files (e.g. styles.json)
        if (imgSrc.endsWith(".json")) continue;
        imgIdx++;
        try {
          if (
            imgSrc.startsWith("http://") ||
            imgSrc.startsWith("https://") ||
            imgSrc.startsWith("//")
          ) {
            const fullUrl = imgSrc.startsWith("//") ? `https:${imgSrc}` : imgSrc;
            const urlObj = new URL(fullUrl);
            const rawName = urlObj.pathname.split("/").pop() ?? `image-${imgIdx}`;
            const ext = rawName.includes(".") ? (rawName.split(".").pop() ?? "png") : "png";
            const slug = slugify(rawName.replace(/\.[^.]+$/, "")) || `image-${imgIdx}`;
            const fileName = `${imgIdx}-${slug}.${ext}`;
            const destPath = join(imagesDir, fileName);
            await downloadImage(fullUrl, destPath, cookie);
            await compressImage(destPath, destPath);
            collectedImages.push({ url: fullUrl, name: fileName });
          } else if (existsSync(imgSrc)) {
            const ext = extname(imgSrc) || ".png";
            const rawName = basename(imgSrc, ext);
            const slug = slugify(rawName) || `screenshot-${imgIdx}`;
            const fileName = `${imgIdx}-fullpage-${slug}${ext}`;
            const destPath = join(imagesDir, fileName);
            await compressImage(imgSrc, destPath);
            collectedImages.push({ url: imgSrc, name: fileName });
          }
        } catch {
          // Non-fatal: skip failed images
        }
      }
    }

    // Parse structured text from .txt files
    const parsedSections = parseTxtSections(txtFiles);

    // Separate element images and fullpage screenshots
    const elementImages = collectedImages.filter((img) => !img.name.includes("fullpage-"));
    const fullpageImages = collectedImages.filter((img) => img.name.includes("fullpage-"));

    // Build well-organized markdown
    const fetchDate = new Date().toISOString().slice(0, 10);

    const frontMatter = [
      "---",
      `source: "lanhu"`,
      `source_url: "${rawUrl}"`,
      `fetch_date: "${fetchDate}"`,
      `requirement_id: "${reqInfo.requirementId}"`,
      `project: "${workspaceProject ?? reqInfo.project}"`,
      `lanhu_project: "${reqInfo.project}"`,
      `workspace_project: "${workspaceProject ?? ""}"`,
      `status: "原始"`,
      "---",
    ].join("\n");

    const bodyParts: string[] = [`# ${reqInfo.requirementName}`];

    // Important tips/warnings (red text annotations from product)
    if (parsedSections.tips) {
      bodyParts.push(`## 重要提示\n\n${parsedSections.tips}`);
    }

    // Element images section — high-res UI components for field/control recognition
    if (elementImages.length > 0) {
      const elementImgMd = elementImages
        .map((img, idx) => `![页面元素-${idx + 1}](${layout.imageRefPrefix}/${img.name})`)
        .join("\n\n");
      bodyParts.push(`## 页面元素截图\n\n${elementImgMd}`);
    }

    // Flowchart/Component text — UI control labels extracted from Axure
    if (parsedSections.componentText) {
      bodyParts.push(`## 控件文本\n\n${parsedSections.componentText}`);
    }

    // Full-page screenshot — overall page layout reference
    if (fullpageImages.length > 0) {
      const fullpageImgMd = fullpageImages
        .map((img, idx) => `![全页截图-${idx + 1}](${layout.imageRefPrefix}/${img.name})`)
        .join("\n\n");
      bodyParts.push(`## 整页截图\n\n${fullpageImgMd}`);
    }

    // Full page text — complete page text description
    if (parsedSections.fullText) {
      bodyParts.push(`## 页面完整文本\n\n${parsedSections.fullText}`);
    }

    // Fallback: if no parsed sections, include raw bridge content
    if (!parsedSections.tips && !parsedSections.componentText && !parsedSections.fullText) {
      for (const bridgePage of bridgeResult.pages) {
        if (bridgePage.content) {
          const cleaned = bridgePage.content
            .replace(/\[图片\]\s*images\/[^\s]+(\s*\(\d+x\d+\))?/g, "")
            .replace(/\n{3,}/g, "\n\n");
          bodyParts.push(cleaned);
        }
      }
    }

    const prdContent = `${frontMatter}\n\n${bodyParts.join("\n\n")}\n`;

    // Write assembled PRD (feature mode → prd.md at feature root; legacy → {reqName}.md)
    const prdPath = join(reqDir, layout.prdFileName);
    writeFileSync(prdPath, prdContent, "utf8");

    requirementInfos.push({
      requirement_id: reqInfo.requirementId,
      requirement_name: reqInfo.requirementName,
      project: workspaceProject ?? reqInfo.project,
      lanhu_project: reqInfo.project,
      workspace_project: workspaceProject ?? null,
      prd_dir: reqDir,
      prd_path: prdPath,
      images_count: collectedImages.length,
    });
  }

  // 8. Output JSON result（derived_version 供 orchestration 传给 `features resolve --feature-version`）
  const output: FetchOutput = {
    title,
    derived_version: deriveVersionDir(title),
    total_requirements: requirementInfos.length,
    requirements: requirementInfos,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
