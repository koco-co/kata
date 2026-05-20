#!/usr/bin/env bun
/**
 * kata console — local read-only dashboard server (P1).
 *
 * Serves a catalog of workspace QA artifacts (projects → features → archive /
 * cases.xmind / metadata) so they no longer need to be hunted in folders.
 * Read-only: every route only reads the workspace.
 *
 * Run:  bun apps/console/server.ts   (or  bun run console  from repo root)
 */
import { join } from "node:path";
import {
  getFeature,
  listArtifacts,
  listFeatures,
  listProjectSummaries,
  parseXmind,
  readTextArtifact,
} from "../shared/catalog.ts";

const PORT = Number(process.env.KATA_CONSOLE_PORT ?? 4317);
const PUBLIC_DIR = join(import.meta.dir, "public");

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function errToStatus(message: string): number {
  if (/not found|missing/i.test(message)) return 404;
  if (/unknown|invalid|not allowed|escape/i.test(message)) return 400;
  return 500;
}

const FILTER_KEYS = [
  "module",
  "customer",
  "version",
  "owner",
  "createdAfter",
  "status",
  "automationStatus",
  "lastRun",
] as const;

function readFilters(url: URL): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = url.searchParams.get(key);
    if (value) filters[key] = value;
  }
  return filters;
}

async function handleApi(pathname: string, url: URL): Promise<Response> {
  // /api/projects
  if (pathname === "/api/projects") {
    return json(listProjectSummaries());
  }

  const parts = pathname.split("/").filter(Boolean); // ["api","projects",<p>,"features",...]
  if (parts[0] !== "api" || parts[1] !== "projects" || !parts[2]) {
    return json({ error: "not found" }, 404);
  }
  const project = decodeURIComponent(parts[2]);

  // /api/projects/:project/features
  if (parts[3] === "features" && parts.length === 4) {
    return json(await listFeatures(project, readFilters(url)));
  }

  if (parts[3] === "features" && parts[4]) {
    const featureId = decodeURIComponent(parts[4]);

    // /api/projects/:project/features/:id
    if (parts.length === 5) {
      return json(await getFeature(project, featureId));
    }
    // /api/projects/:project/features/:id/artifacts
    if (parts[5] === "artifacts" && parts.length === 6) {
      return json(listArtifacts(project, featureId));
    }
    // /api/projects/:project/features/:id/artifact/:name
    if (parts[5] === "artifact" && parts[6] && parts.length === 7) {
      const name = decodeURIComponent(parts[6]);
      const text = readTextArtifact(project, featureId, name);
      return new Response(text, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    // /api/projects/:project/features/:id/xmind
    if (parts[5] === "xmind" && parts.length === 6) {
      return json(await parseXmind(project, featureId));
    }
  }

  return json({ error: "not found" }, 404);
}

async function serveStatic(pathname: string): Promise<Response> {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  // Block traversal; only serve from PUBLIC_DIR.
  if (rel.includes("..")) return new Response("forbidden", { status: 403 });
  const file = Bun.file(join(PUBLIC_DIR, rel));
  if (await file.exists()) return new Response(file);
  // SPA-ish fallback to index for unknown non-api routes.
  const index = Bun.file(join(PUBLIC_DIR, "index.html"));
  if (await index.exists()) return new Response(index);
  return new Response("not found", { status: 404 });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    try {
      if (pathname.startsWith("/api/")) {
        return await handleApi(pathname, url);
      }
      return await serveStatic(pathname);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[console] ${pathname} failed:`, message);
      return json({ error: message }, errToStatus(message));
    }
  },
});

console.log(`kata console → http://localhost:${server.port}`);
