#!/usr/bin/env bun
/**
 * source-ref.ts — CLI 入口，校验并解析 canonical hash-backed SourceRef。
 *
 * Usage:
 *   kata source-ref resolve --ref <ref> [--prd <p>] [--project <n>] [--workspace-dir <d>] [--yyyymm <ym>] [--prd-slug <slug>]
 *   kata source-ref batch   --refs-json <p>  [同上]
 *
 * Exit codes:
 *   resolve: 0 OK, 1 fail
 *   batch:   0 all OK, 2 any fail
 */

import { readFileSync } from "node:fs";
import { createCli } from "@shared/lib/cli-runner.ts";
import { getEnv } from "@shared/lib/env.ts";
import { type ResolveContext, resolveSourceRef } from "@shared/lib/source-ref.ts";

function buildCtx(opts: Record<string, unknown>): ResolveContext {
  const projectName = (opts.project as string | undefined) ?? undefined;
  const workspaceDir = (opts.workspaceDir as string | undefined) ?? getEnv("KATA_WORKSPACE_ROOT");
  return {
    projectName,
    workspaceDir,
    featureDir: (opts.featureDir as string | undefined) ?? undefined,
  };
}

export const program = createCli({
  name: "source-ref",
  description: "解析并定位 canonical hash-backed SourceRef",
  commands: [
    {
      name: "resolve",
      description: "Resolve a single source_ref. Exit 0 if OK, 1 if unresolvable.",
      options: [
        {
          flag: "--ref <ref>",
          description: "source_ref string",
          required: true,
        },
        { flag: "--project <name>", description: "project name" },
        {
          flag: "--workspace-dir <dir>",
          description: "workspace dir override",
        },
        { flag: "--feature-dir <path>", description: "feature 目录（解析 inputs 与快照）" },
      ],
      action: (opts) => {
        const o = opts as Record<string, unknown>;
        const res = resolveSourceRef(o.ref as string, buildCtx(o));
        process.stdout.write(`${JSON.stringify({ ref: o.ref, ...res }, null, 2)}\n`);
        if (!res.ok) process.exit(1);
      },
    },
    {
      name: "batch",
      description: "Resolve a JSON array of {ref} entries. Exit 0 if all OK, 2 if any fails.",
      options: [
        {
          flag: "--refs-json <path>",
          description: "JSON file: [{ref: string, ...}]",
          required: true,
        },
        { flag: "--project <name>", description: "project name" },
        {
          flag: "--workspace-dir <dir>",
          description: "workspace dir override",
        },
        { flag: "--feature-dir <path>", description: "feature 目录（解析 inputs 与快照）" },
      ],
      action: (opts) => {
        const o = opts as Record<string, unknown>;
        const raw = readFileSync(o.refsJson as string, "utf8");
        const items = JSON.parse(raw) as Array<{ ref: string }>;
        const resolveCtx = buildCtx(o);
        const results = items.map((it) => ({
          ref: it.ref,
          ...resolveSourceRef(it.ref, resolveCtx),
        }));
        process.stdout.write(
          `${JSON.stringify(
            {
              total: results.length,
              fails: results.filter((r) => !r.ok),
              results,
            },
            null,
            2,
          )}\n`,
        );
        if (results.some((r) => !r.ok)) process.exit(2);
      },
    },
  ],
});

if (import.meta.main) {
  program.parseAsync(process.argv);
}
