#!/usr/bin/env bun
/**
 * knowledge-curate.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   kata knowledge-curate <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { createCli } from "../../lib/cli-runner.ts";
import {
  CONFIDENCE_LEVELS,
  ENTRY_TYPES,
  runHistory,
  runLint,
  runRollback,
  runVerify,
} from "./maintenance.ts";
import { runIndex, runReadCore, runReadModule, runReadPitfall } from "./read.ts";
import { runUpdate } from "./update.ts";
import { runWrite } from "./write.ts";

export const program = createCli({
  name: "knowledge-curate",
  description: "知识库 CRUD + 健康检查与索引",
  commands: [
    {
      name: "read-core",
      description: "Load core knowledge (overview + terms + index)",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
      ],
      action: runReadCore,
    },
    {
      name: "read-module",
      description: "Load a single module by name",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        {
          flag: "--module <name>",
          description: "Module name (without .md)",
          required: true,
        },
      ],
      action: runReadModule,
    },
    {
      name: "read-pitfall",
      description: "Search pitfalls by query (filename + tags)",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        {
          flag: "--query <keyword>",
          description: "Search keyword",
          required: true,
        },
      ],
      action: runReadPitfall,
    },
    {
      name: "index",
      description: "Rebuild _index.md (and auto-fix phase-0 templates)",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
      ],
      action: runIndex,
    },
    {
      name: "write",
      description: "Write knowledge entry (term/overview/module/pitfall)",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        {
          flag: "--type <type>",
          description: "Entry type",
          required: true,
          choices: ENTRY_TYPES,
        },
        {
          flag: "--content <json>",
          description: "Content as JSON string",
          required: true,
        },
        {
          flag: "--confidence <level>",
          description: "Confidence level",
          defaultValue: "medium",
          choices: CONFIDENCE_LEVELS,
        },
        {
          flag: "--confirmed",
          description: "Confirm medium-confidence write",
          defaultValue: false,
        },
        {
          flag: "--dry-run",
          description: "Preview without writing",
          defaultValue: false,
        },
        {
          flag: "--overwrite",
          description: "Allow overwriting existing module/pitfall file",
          defaultValue: false,
        },
        {
          flag: "--force",
          description: "Bypass conflict detection (term/overview/body-rewrite)",
          defaultValue: false,
        },
      ],
      action: runWrite,
    },
    {
      name: "update",
      description: "Update an existing knowledge file (frontmatter / body)",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        {
          flag: "--path <rel>",
          description: "Relative path under knowledge/",
          required: true,
        },
        {
          flag: "--content <json>",
          description: "JSON patch spec",
          required: true,
        },
        {
          flag: "--confirmed",
          description: "Confirm update",
          defaultValue: false,
        },
        {
          flag: "--dry-run",
          description: "Preview without persisting",
          defaultValue: false,
        },
        {
          flag: "--force",
          description: "Bypass body-rewrite conflict detection",
          defaultValue: false,
        },
      ],
      action: runUpdate,
    },
    {
      name: "verify",
      description: "Dry-run conflict check against existing knowledge (no write, no side effect)",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        {
          flag: "--type <type>",
          description: "Entry type",
          required: true,
          choices: ENTRY_TYPES,
        },
        {
          flag: "--content <json>",
          description: "Content as JSON string",
          required: true,
        },
      ],
      action: runVerify,
    },
    {
      name: "history",
      description: "List recent write/update/rollback audit entries",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        {
          flag: "--limit <n>",
          description: "How many recent entries to show (default 20)",
        },
      ],
      action: runHistory,
    },
    {
      name: "rollback",
      description: "Restore a file from the snapshot referenced by an audit entry",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        {
          flag: "--index <n>",
          description: "Audit entry index (default: latest)",
          defaultValue: -1,
        },
        {
          flag: "--confirmed",
          description: "Confirm rollback (required for real run)",
          defaultValue: false,
        },
        {
          flag: "--dry-run",
          description: "Preview without restoring",
          defaultValue: false,
        },
      ],
      action: runRollback,
    },
    {
      name: "lint",
      description: "Health check for knowledge files",
      options: [
        {
          flag: "--project <name>",
          description: "Project name",
          required: true,
        },
        { flag: "--strict", description: "Treat warnings as errors" },
      ],
      action: runLint,
    },
  ],
});
