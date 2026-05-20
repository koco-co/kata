import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "kata-engine";
import { serveStatic } from "./static.ts";

const WEB_ROOT = join(repoRoot(), "apps/web");
const WEB_DIST = join(WEB_ROOT, "dist");
const SIBLING_DIST = join(WEB_ROOT, "dist-static-test-sibling");
const OUTSIDE_TARGET = join(WEB_ROOT, "dist-static-test-outside");

const cleanupPaths = new Set<string>();

afterEach(() => {
  for (const path of [...cleanupPaths].reverse()) {
    rmSync(path, { force: true, recursive: true });
  }
  cleanupPaths.clear();
});

function ensureDist(indexText = "<div>console</div>\n"): string {
  const createdWebRoot = !existsSync(WEB_ROOT);
  const createdDist = !existsSync(WEB_DIST);
  mkdirSync(WEB_DIST, { recursive: true });

  const indexPath = join(WEB_DIST, "index.html");
  if (existsSync(indexPath)) {
    return readFileSync(indexPath, "utf8");
  }

  writeFileSync(indexPath, indexText);
  cleanupPaths.add(indexPath);
  if (createdDist) cleanupPaths.add(WEB_DIST);
  if (createdWebRoot) cleanupPaths.add(WEB_ROOT);
  return indexText;
}

test("missing web dist returns a friendly 503", async () => {
  if (existsSync(WEB_DIST)) {
    return;
  }

  const res = await serveStatic("/");

  expect(res.status).toBe(503);
  expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  expect(await res.text()).toContain("web/dist not built yet");
});

test("serves index for root and falls back to index for SPA routes", async () => {
  const indexText = ensureDist();

  const root = await serveStatic("/");
  const fallback = await serveStatic("/features/demo");

  expect(root.status).toBe(200);
  expect(await root.text()).toBe(indexText);
  expect(fallback.status).toBe(200);
  expect(await fallback.text()).toBe(indexText);
});

test("existing web dist without index returns a friendly 503", async () => {
  const indexPath = join(WEB_DIST, "index.html");
  if (existsSync(indexPath)) {
    return;
  }

  const createdWebRoot = !existsSync(WEB_ROOT);
  const createdDist = !existsSync(WEB_DIST);
  mkdirSync(WEB_DIST, { recursive: true });
  if (createdDist) cleanupPaths.add(WEB_DIST);
  if (createdWebRoot) cleanupPaths.add(WEB_ROOT);

  const res = await serveStatic("/");
  const body = await res.text();

  expect(res.status).toBe(503);
  expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
  expect(body).toContain("web/dist not built yet");
});

test("forbids traversal into same-prefix sibling directories", async () => {
  ensureDist();
  const createdSibling = !existsSync(SIBLING_DIST);
  const secretPath = join(SIBLING_DIST, "secret.txt");
  mkdirSync(SIBLING_DIST, { recursive: true });
  writeFileSync(secretPath, "secret\n");
  cleanupPaths.add(secretPath);
  if (createdSibling) cleanupPaths.add(SIBLING_DIST);

  const res = await serveStatic("/../dist-static-test-sibling/secret.txt");

  expect(res.status).toBe(403);
  expect(await res.text()).not.toBe("secret\n");
});

test("forbids serving when web dist root is a symlink", async () => {
  if (existsSync(WEB_DIST)) {
    return;
  }

  const createdWebRoot = !existsSync(WEB_ROOT);
  mkdirSync(OUTSIDE_TARGET, { recursive: true });
  writeFileSync(join(OUTSIDE_TARGET, "index.html"), "outside root\n");
  symlinkSync(OUTSIDE_TARGET, WEB_DIST, "dir");
  cleanupPaths.add(WEB_DIST);
  cleanupPaths.add(join(OUTSIDE_TARGET, "index.html"));
  cleanupPaths.add(OUTSIDE_TARGET);
  if (createdWebRoot) cleanupPaths.add(WEB_ROOT);

  const res = await serveStatic("/");

  expect(res.status).toBe(403);
  expect(await res.text()).not.toBe("outside root\n");
});

test("forbids serving requested symlink files inside web dist", async () => {
  ensureDist();
  const outsideFile = join(WEB_ROOT, "static-test-outside-file.txt");
  const symlinkPath = join(WEB_DIST, "linked-secret.txt");
  writeFileSync(outsideFile, "outside file\n");
  symlinkSync(outsideFile, symlinkPath);
  cleanupPaths.add(symlinkPath);
  cleanupPaths.add(outsideFile);

  const res = await serveStatic("/linked-secret.txt");

  expect(res.status).toBe(403);
  expect(await res.text()).not.toBe("outside file\n");
});

test("forbids serving through symlinked directories inside web dist", async () => {
  ensureDist();
  const outsideDir = join(WEB_ROOT, "static-test-outside-dir");
  const outsideFile = join(outsideDir, "secret.txt");
  const symlinkPath = join(WEB_DIST, "linked-dir");
  mkdirSync(outsideDir, { recursive: true });
  writeFileSync(outsideFile, "outside dir\n");
  symlinkSync(outsideDir, symlinkPath, "dir");
  cleanupPaths.add(symlinkPath);
  cleanupPaths.add(outsideFile);
  cleanupPaths.add(outsideDir);

  const res = await serveStatic("/linked-dir/secret.txt");

  expect(res.status).toBe(403);
  expect(await res.text()).not.toBe("outside dir\n");
});

test("forbids serving symlinked SPA fallback index", async () => {
  const createdWebRoot = !existsSync(WEB_ROOT);
  const createdDist = !existsSync(WEB_DIST);
  mkdirSync(WEB_DIST, { recursive: true });
  const outsideFile = join(WEB_ROOT, "static-test-outside-index.html");
  const indexPath = join(WEB_DIST, "index.html");
  if (existsSync(indexPath)) {
    return;
  }
  writeFileSync(outsideFile, "outside index\n");
  symlinkSync(outsideFile, indexPath);
  cleanupPaths.add(indexPath);
  cleanupPaths.add(outsideFile);
  if (createdDist) cleanupPaths.add(WEB_DIST);
  if (createdWebRoot) cleanupPaths.add(WEB_ROOT);

  const res = await serveStatic("/missing-route");

  expect(res.status).toBe(403);
  expect(await res.text()).not.toBe("outside index\n");
});
