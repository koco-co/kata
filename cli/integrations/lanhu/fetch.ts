#!/usr/bin/env bun
/**
 * cli/integrations/lanhu/fetch.ts — 蓝湖 PRD 内容 + 截图抓取器 (bridge adapter)
 *
 * Calls cli/integrations/lanhu/mcp-bridge/bridge.py via subprocess to fetch PRD content,
 * then downloads images and produces per-requirement PRD files.
 *
 * Usage:
 *   kata prd extract --url "https://lanhuapp.com/web/#/item/..." --feature <feature-dir>
 */

import { type SpawnSyncOptionsWithStringEncoding, spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import sharp from "sharp";
import { writeFileAtomic } from "../../lib/atomic-writer.ts";
import { assertFeatureNoSymlink, assertNoSymlinkPath } from "../../lib/features-layout.ts";
import { loadLanhuConfig, pluginConfigPath, updatePluginConfig } from "../../lib/plugin-config.ts";
import { computePrdDigest, type PrdEvidence, type PrdEvidencePage } from "../../lib/prd.ts";
import { repoRoot } from "../../lib/workspace-locator.ts";

const LANHU_BRIDGE_RELATIVE_DIR = "cli/integrations/lanhu/mcp-bridge";
const LANHU_MCP_RELATIVE_DIR = "cli/vendor/lanhu-mcp";

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
  id?: string;
  name: string;
  path: string;
  content: string;
  images: string[];
}

interface BridgeOutput {
  title: string;
  doc_type: string;
  total_pages: number;
  version_id?: string;
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

interface ErrorOutput {
  error: string;
  code: string;
}

export class LanhuIntegrationError extends Error {
  readonly exitCode = 1;

  constructor(
    readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "LanhuIntegrationError";
  }
}

export interface PrdExtractOptions {
  featureDir: string;
  force?: boolean;
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

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { pageType: "unknown", params: {} };
  }

  // Strict host match: "evil-lanhuapp.com" or "lanhuapp.com.evil.com" must not pass.
  const host = url.hostname;
  if (host !== "lanhuapp.com" && !host.endsWith(".lanhuapp.com")) {
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

// ─── Bridge Helpers ──────────────────────────────────────────────────────────

function ensureLanhuMcpReady(projectRoot: string): void {
  const mcpDir = join(projectRoot, LANHU_MCP_RELATIVE_DIR);
  const venvPath = join(mcpDir, ".venv");
  if (existsSync(venvPath)) return;

  // Check if the bundled lanhu-mcp directory exists at all
  if (!existsSync(mcpDir)) {
    throw new LanhuIntegrationError(
      "LANHU_MCP_MISSING",
      `外部依赖 ${LANHU_MCP_RELATIVE_DIR} 不存在，无法抓取 Lanhu/Axure PRD`,
    );
  }

  const setupScript = join(projectRoot, LANHU_BRIDGE_RELATIVE_DIR, "setup.sh");
  try {
    runCommand("bash", [setupScript], {
      encoding: "utf8",
      stdio: "pipe",
      cwd: projectRoot,
    });
  } catch {
    throw new LanhuIntegrationError(
      "LANHU_MCP_SETUP_FAILED",
      "lanhu-mcp Python 环境初始化失败；请确认已安装 Python 3 和 uv",
    );
  }
}

interface BridgeCallError {
  error: string;
  code: string;
  isCookieError: boolean;
}

export function buildLanhuBridgeEnv(
  configPath: string,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return { ...baseEnv, KATA_LANHU_CONFIG: configPath };
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
): BridgeListOutput | BridgeCallError {
  const bridgeScript = resolve(projectRoot, LANHU_BRIDGE_RELATIVE_DIR, "bridge.py");
  const mcpDir = resolve(projectRoot, LANHU_MCP_RELATIVE_DIR);
  try {
    const stdout = runCommand(
      "uv",
      ["run", "python", bridgeScript, "--url", rawUrl, "--list-pages"],
      {
        cwd: mcpDir,
        env: buildLanhuBridgeEnv(pluginConfigPath("lanhu", projectRoot)),
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

function callBridgeListPagesWithRetry(projectRoot: string, rawUrl: string): BridgeListOutput {
  const result = tryCallBridgeListPages(projectRoot, rawUrl);
  if ("pages" in result) {
    return result;
  }

  if (!result.isCookieError) {
    throw new LanhuIntegrationError(result.code, result.error);
  }

  const newCookie = refreshCookie(projectRoot, rawUrl);
  if (!newCookie) {
    throw new LanhuIntegrationError(
      "COOKIE_REFRESH_FAILED",
      "Cookie 刷新失败。请更新 config/private/integrations/lanhu.yaml 的账号密码",
    );
  }

  const retry = tryCallBridgeListPages(projectRoot, rawUrl);
  if ("pages" in retry) {
    return retry;
  }

  throw new LanhuIntegrationError(retry.code, retry.error);
}

function tryCallBridge(
  projectRoot: string,
  rawUrl: string,
  pageId: string | undefined,
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
      env: buildLanhuBridgeEnv(pluginConfigPath("lanhu", projectRoot)),
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
  const args = ["run", "python", refreshScript, "--target-url", targetUrl];
  const outputDir = mkdtempSync(join(tmpdir(), "kata-lanhu-cookie-"));
  const outputPath = join(outputDir, "cookie");

  try {
    runCommand("uv", args, {
      cwd: mcpDir,
      encoding: "utf8",
      env: {
        ...process.env,
        KATA_LANHU_CONFIG: pluginConfigPath("lanhu", projectRoot),
        KATA_LANHU_COOKIE_OUTPUT: outputPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120_000,
    });
    if (!existsSync(outputPath) || lstatSync(outputPath).isSymbolicLink()) return null;
    const newCookie = readFileSync(outputPath, "utf8");
    const cookie = newCookie.trim();
    if (!cookie) return null;
    updatePluginConfig("lanhu", { cookie }, projectRoot);
    return cookie;
  } catch {
    return null;
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
}

function callBridgeWithRetry(
  projectRoot: string,
  rawUrl: string,
  pageId: string | undefined,
  pageNames?: string,
): BridgeOutput {
  const result = tryCallBridge(projectRoot, rawUrl, pageId, pageNames);

  // Success on first try
  if ("pages" in result) {
    return result;
  }

  // Not a cookie error — fail immediately
  if (!result.isCookieError) {
    throw new LanhuIntegrationError(result.code, result.error);
  }

  // Cookie error — attempt auto-refresh
  const newCookie = refreshCookie(projectRoot, rawUrl);

  if (!newCookie) {
    throw new LanhuIntegrationError(
      "COOKIE_REFRESH_FAILED",
      "Cookie 刷新失败。请更新 config/private/integrations/lanhu.yaml 的账号密码",
    );
  }

  // Retry with the refreshed cookie (bridge reads it back from the YAML)
  const retry = tryCallBridge(projectRoot, rawUrl, pageId, pageNames);
  if ("pages" in retry) {
    return retry;
  }

  throw new LanhuIntegrationError(retry.code, retry.error);
}

function assertCanonicalExtractUrl(parsed: ParsedLanhuUrl): {
  docId: string;
  versionId: string;
  pageId: string;
} {
  const { docId, versionId, pageId } = parsed.params;
  if (!docId || !versionId || !pageId) {
    throw new LanhuIntegrationError(
      "INVALID_URL",
      "PRD 提取 URL 必须同时包含 docId、versionId 与 pageId",
    );
  }
  return { docId, versionId, pageId };
}

function cachedEvidenceIsUsable(
  path: string,
  manifestPath: string,
  assetsDir: string,
  identity: { docId: string; versionId: string; pageId: string },
): PrdEvidence | undefined {
  if (!existsSync(path) || !existsSync(manifestPath)) return undefined;
  try {
    const evidenceText = readFileSync(path, "utf8");
    const evidence = JSON.parse(evidenceText) as PrdEvidence;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      contract?: string;
      doc_id?: string;
      version_id?: string;
      page_id?: string;
      evidence_digest?: string;
      assets?: string[];
    };
    if (
      evidence.contract !== "kata.prd.evidence/v1" ||
      evidence.doc_id !== identity.docId ||
      evidence.version_id !== identity.versionId ||
      evidence.page_id !== identity.pageId ||
      manifest.contract !== "kata.prd.extract-cache/v1" ||
      manifest.doc_id !== identity.docId ||
      manifest.version_id !== identity.versionId ||
      manifest.page_id !== identity.pageId ||
      manifest.evidence_digest !== computePrdDigest(evidenceText)
    ) {
      return undefined;
    }
    const assets = evidence.pages.flatMap((page) => page.assets).sort();
    if (JSON.stringify(assets) !== JSON.stringify([...(manifest.assets ?? [])].sort())) {
      return undefined;
    }
    if (assets.some((asset) => !existsSync(join(assetsDir, asset)))) return undefined;
    return evidence;
  } catch {
    return undefined;
  }
}

/**
 * Extract immutable Lanhu evidence and screenshots. This command deliberately does not
 * generate a PRD: the model must inject knowledge/source facts and complete Q&A first.
 */
export async function runPrdExtract(
  rawUrl: string,
  options: PrdExtractOptions,
): Promise<{
  evidence_path: string;
  evidence_digest: string;
  assets: string[];
  cached: boolean;
  requirement_id: string;
}> {
  const projectRoot = repoRoot();
  const parsed = parseLanhuUrl(rawUrl);
  if (parsed.pageType !== "product-spec") {
    throw new LanhuIntegrationError("INVALID_URL", "仅支持蓝湖 PRD/Axure 产品文档 URL");
  }
  const identity = assertCanonicalExtractUrl(parsed);
  const featureDir = assertFeatureNoSymlink(resolve(projectRoot, options.featureDir));
  const evidenceDir = join(featureDir, "prd", "evidence");
  const assetsDir = join(featureDir, "prd", "assets");
  const processDir = join(featureDir, "prd", ".process");
  const evidencePath = join(evidenceDir, "lanhu.json");
  const extractManifestPath = join(processDir, "extract.json");
  assertNoSymlinkPath(featureDir, evidenceDir, "PRD evidence");
  assertNoSymlinkPath(featureDir, assetsDir, "PRD assets");
  assertNoSymlinkPath(featureDir, processDir, "PRD process");
  assertNoSymlinkPath(featureDir, evidencePath, "PRD evidence");
  assertNoSymlinkPath(featureDir, extractManifestPath, "PRD extract manifest");
  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(assetsDir, { recursive: true });
  mkdirSync(processDir, { recursive: true });

  if (!options.force) {
    const cached = cachedEvidenceIsUsable(evidencePath, extractManifestPath, assetsDir, identity);
    if (cached) {
      const text = readFileSync(evidencePath);
      return {
        evidence_path: evidencePath,
        evidence_digest: computePrdDigest(text),
        assets: cached.pages.flatMap((page) => page.assets),
        cached: true,
        requirement_id: cached.requirement_id,
      };
    }
  }

  if (!loadLanhuConfig(projectRoot).cookie) {
    const newCookie = refreshCookie(projectRoot, rawUrl);
    if (!newCookie) {
      throw new LanhuIntegrationError(
        "MISSING_COOKIE",
        "config/private/integrations/lanhu.yaml 未配置 cookie 且自动登录失败",
      );
    }
  }
  ensureLanhuMcpReady(projectRoot);
  const listResult = callBridgeListPagesWithRetry(projectRoot, rawUrl);
  const selected = listResult.pages.filter((page) => page.id === identity.pageId);
  if (selected.length !== 1) {
    throw new LanhuIntegrationError(
      "PAGE_NOT_FOUND",
      `蓝湖中无法唯一定位 pageId=${identity.pageId}`,
    );
  }
  const selectedPage = selected[0];
  const requirementId = selectedPage.requirement_id ?? selectedPage.name.match(/^(\d+)/)?.[1] ?? "";
  if (!requirementId) {
    throw new LanhuIntegrationError(
      "REQUIREMENT_ID_MISSING",
      `蓝湖页面名称不含需求 ID: ${selectedPage.name}`,
    );
  }

  const bridge = callBridgeWithRetry(projectRoot, rawUrl, identity.pageId);
  if (bridge.pages.length !== 1) {
    throw new LanhuIntegrationError(
      "PAGE_COUNT_MISMATCH",
      `蓝湖 pageId=${identity.pageId} 返回 ${bridge.pages.length} 个页面`,
    );
  }
  const evidencePages: PrdEvidencePage[] = [];
  const copiedAssets: string[] = [];
  for (const page of bridge.pages) {
    if (
      /二狗工作指引|STAGE\s*[1-4]|Return Format|Your Mission|Building God's View/i.test(
        page.content,
      )
    ) {
      throw new LanhuIntegrationError(
        "PROMPT_CONTAMINATION",
        "蓝湖桥接结果混入 MCP 工作提示，拒绝写入证据",
      );
    }
    const pageAssets: string[] = [];
    for (const [index, source] of page.images.entries()) {
      if (!existsSync(source)) continue;
      const ext = extname(source).toLowerCase() || ".png";
      const purpose = index === 0 ? "overview" : `detail-${index + 1}`;
      const name = `${identity.pageId}-${purpose}${ext}`;
      const target = join(assetsDir, name);
      assertNoSymlinkPath(featureDir, target, "PRD asset");
      await compressImage(source, target);
      pageAssets.push(name);
      copiedAssets.push(name);
    }
    evidencePages.push({
      id: page.id || identity.pageId,
      name: page.name,
      path: page.path,
      text: page.content.trim(),
      assets: pageAssets,
    });
  }
  const evidence: PrdEvidence = {
    contract: "kata.prd.evidence/v1",
    source: "lanhu",
    source_url: rawUrl,
    doc_id: identity.docId,
    version_id: identity.versionId,
    page_id: identity.pageId,
    requirement_id: requirementId,
    title: listResult.title,
    pages: evidencePages,
  };
  const text = `${JSON.stringify(evidence, null, 2)}\n`;
  assertNoSymlinkPath(featureDir, evidencePath, "PRD evidence");
  writeFileAtomic(evidencePath, text);
  const evidenceDigest = computePrdDigest(text);
  assertNoSymlinkPath(featureDir, extractManifestPath, "PRD extract manifest");
  writeFileAtomic(
    extractManifestPath,
    `${JSON.stringify(
      {
        contract: "kata.prd.extract-cache/v1",
        doc_id: identity.docId,
        version_id: identity.versionId,
        page_id: identity.pageId,
        evidence_digest: evidenceDigest,
        assets: copiedAssets,
      },
      null,
      2,
    )}\n`,
  );
  return {
    evidence_path: evidencePath,
    evidence_digest: evidenceDigest,
    assets: copiedAssets,
    cached: false,
    requirement_id: requirementId,
  };
}
