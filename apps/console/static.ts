import { lstatSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { repoRoot } from "kata-engine";

const WEB_DIST = join(repoRoot(), "apps/web/dist");
const WEB_DIST_ROOT = resolve(WEB_DIST);
const MISSING_BUILD_TEXT = "web/dist not built yet. Run `bun run web:build` (see web plan).";

function isInsideDist(path: string): boolean {
  const rel = relative(WEB_DIST_ROOT, path);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

type SafePathStatus = "file" | "missing" | "forbidden";

function safeFileStatus(path: string): SafePathStatus {
  const rel = relative(WEB_DIST_ROOT, path);
  const parts = rel.split(sep).filter(Boolean);
  let current = WEB_DIST_ROOT;

  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const isLast = index === parts.length - 1;

    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (isMissing(error)) return "missing";
      throw error;
    }

    if (stat.isSymbolicLink()) return "forbidden";
    if (isLast) return stat.isFile() ? "file" : "missing";
    if (!stat.isDirectory()) return "missing";
  }

  return "missing";
}

function safeDistStatus(): "directory" | "missing" | "forbidden" {
  try {
    const stat = lstatSync(WEB_DIST_ROOT);
    if (stat.isSymbolicLink()) return "forbidden";
    return stat.isDirectory() ? "directory" : "forbidden";
  } catch (error) {
    if (isMissing(error)) return "missing";
    throw error;
  }
}

export async function serveStatic(pathname: string): Promise<Response> {
  const distStatus = safeDistStatus();
  if (distStatus === "missing") {
    return missingBuildResponse();
  }
  if (distStatus === "forbidden") {
    return new Response("Forbidden", { status: 403 });
  }

  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const full = resolve(WEB_DIST_ROOT, rel);

  if (!isInsideDist(full)) {
    return new Response("Forbidden", { status: 403 });
  }

  const requestedStatus = safeFileStatus(full);
  if (requestedStatus === "forbidden") {
    return new Response("Forbidden", { status: 403 });
  }

  const filePath = requestedStatus === "file" ? full : join(WEB_DIST_ROOT, "index.html");
  const fallbackStatus = requestedStatus === "file" ? requestedStatus : safeFileStatus(filePath);
  if (fallbackStatus === "forbidden") {
    return new Response("Forbidden", { status: 403 });
  }
  if (fallbackStatus === "missing") {
    return missingBuildResponse();
  }

  return new Response(Bun.file(filePath));
}

function missingBuildResponse(): Response {
  return new Response(MISSING_BUILD_TEXT, {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
