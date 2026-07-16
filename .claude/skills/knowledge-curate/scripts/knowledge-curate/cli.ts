#!/usr/bin/env bun
/**
 * knowledge-curate.ts — 业务知识库 CRUD + lint/index。
 * Usage:
 *   kata knowledge <action> --project <name> [...]
 * Actions: read-core | read-module | read-pitfall | write | update | index | lint
 */

import { createCli } from "@shared/lib/cli-runner.ts";
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
      description: "读取核心知识：概览、术语与索引",
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
      description: "按名称读取单个知识模块",
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
      description: "按关键词检索踩坑记录的文件名与标签",
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
      description: "重建 _index.md，并修复初始模板",
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
      description: "写入术语、概览、模块或踩坑记录",
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
      description: "更新知识文件的 frontmatter 或正文",
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
      description: "只检查与现有知识的冲突，不写入文件",
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
      description: "列出最近的写入、更新与回滚记录",
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
      description: "从审计记录引用的快照恢复文件",
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
      description: "检查知识文件健康状态",
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
