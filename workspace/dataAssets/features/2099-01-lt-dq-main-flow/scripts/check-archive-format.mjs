#!/usr/bin/env bun
// 用法: bun check-archive-format.mjs <archive.md>
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: bun check-archive-format.mjs <archive.md>");
  process.exit(1);
}

const md = readFileSync(file, "utf8");
const lines = md.split("\n");
const errors = [];

// 1. frontmatter 字段
const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
const fm = fmMatch ? fmMatch[1] : "";
const required = ["suite_name", "root_name", "module", "prd_version", "prd_id", "tags", "status", "create_at", "case_count", "origin"];
for (const k of required) {
  if (!new RegExp(`^${k}:`, "m").test(fm)) {
    errors.push(`frontmatter 缺字段: ${k}`);
  }
}
if (/^description:/m.test(fm)) {
  errors.push("frontmatter 含禁用字段 description");
}

// 2. 泄漏的一级标题（正文中 # 后非空且非 ## 起）
let inCode = false;
lines.forEach((l, i) => {
  if (l.startsWith("```")) inCode = !inCode;
  if (!inCode && /^# [^#]/.test(l) && i > 12) {
    errors.push(`第 ${i + 1} 行疑似泄漏一级标题: ${l.slice(0, 40)}`);
  }
});

// 3. 用例标题必带【Pn】
lines.forEach((l, i) => {
  if (/^##### /.test(l) && !/^##### 【P[0-3]】/.test(l)) {
    errors.push(`第 ${i + 1} 行用例标题缺【Pn】: ${l.slice(0, 40)}`);
  }
});

// 4. 机器标识泄漏到标题
lines.forEach((l, i) => {
  if (/^#{2,5} /.test(l) && /(TC-|SR-|RA-)/.test(l)) {
    errors.push(`第 ${i + 1} 行标题含机器标识: ${l.slice(0, 40)}`);
  }
});

// 5. case_count 一致性
const declared = (fm.match(/case_count:\s*(\d+)/) || [])[1];
const actual = (md.match(/^##### /gm) || []).length;
if (declared && Number(declared) !== actual) {
  errors.push(`case_count 声明 ${declared} ≠ 实际 ${actual}`);
}

if (errors.length) {
  console.error("FAIL:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`PASS: ${actual} 例，frontmatter/层级/标题/标识 均合规`);
