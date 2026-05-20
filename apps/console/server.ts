#!/usr/bin/env bun
/**
 * kata console - Bun.serve HTTP + static host for the read-only platform UI.
 * PORT from KATA_CONSOLE_PORT (default 4317). Read-only.
 * Run:  bun apps/console/server.ts   (or  bun run console)
 */
import { handleApi } from "./api.ts";
import { serveStatic } from "./static.ts";

const port = Number(process.env.KATA_CONSOLE_PORT ?? 4317);

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const api = await handleApi(url);
    if (api) return api;
    return serveStatic(url.pathname);
  },
});

process.stderr.write(`[kata-console] listening on http://localhost:${server.port}\n`);
