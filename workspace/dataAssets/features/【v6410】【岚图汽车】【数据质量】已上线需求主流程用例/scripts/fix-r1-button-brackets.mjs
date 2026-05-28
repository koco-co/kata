#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");

const archive = readFileSync(archivePath, "utf8");
let replacements = 0;

function normalizeNonNavigationBracket(value) {
  return value.replace(/【([^】\n→]+)】/g, (_match, label) => {
    replacements += 1;
    return `「${label.trim()}」`;
  });
}

let next = archive;

// UI controls followed by explicit control nouns.
next = next.replace(/【([^】\n→]+)】(?=\s*(?:按钮|页签|链接|入口|弹窗|下拉框|输入框|选项|列|区域))/g, (_match, label) => {
  replacements += 1;
  return `「${label.trim()}」`;
});

// Adjacent button names such as 【查询】【重置】按钮.
next = next.replace(/【([^】\n→]+)】(?=【[^】\n→]+】按钮)/g, (_match, label) => {
  replacements += 1;
  return `「${label.trim()}」`;
});

// Direct UI verbs covered by the audit rule.
next = next.replace(/(点击|选择|新增|新建|输入|配置|开启|关闭)【([^】\n→]+)】/g, (_match, verb, label) => {
  replacements += 1;
  return `${verb}「${label.trim()}」`;
});

// Same verbs with a short target phrase before the UI control name.
next = next.replace(
  /(点击|选择|新增|新建|输入|配置|开启|关闭)([^|\n。；;，,]{1,24})【([^】\n→]+)】/g,
  (_match, verb, middle, label) => {
    replacements += 1;
    return `${verb}${middle}「${label.trim()}」`;
  },
);

// Normalize remaining non-navigation brackets inside common UI action phrases.
next = next.replace(
  /(显示|展示|包含|提供|进入 Step \d+|在 Step \d+|页面底部|操作列|确认弹窗|导入弹窗)([^|\n]*)/g,
  (match) => normalizeNonNavigationBracket(match),
);

if (next === archive) {
  console.log("R1 replacements: 0");
  process.exit(0);
}

writeFileSync(archivePath, next);
console.log(`R1 replacements: ${replacements}`);
