#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");

const NAV_TEMPLATE = "1)页面路由进入目标菜单<br>2)页面标题或列表主区域可见";
const OP_TEMPLATE = "1)页面提示操作成功<br>2)目标记录状态或列表内容按本次操作更新";

let weakExpectedReplacements = 0;
let stepCellReplacements = 0;

function splitMarkdownTableRow(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed.startsWith("|")) return [];
  const source = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let buffer = "";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "|" && source[index - 1] !== "\\") {
      cells.push(buffer.replace(/\\\|/g, "|").trim());
      buffer = "";
    } else {
      buffer += char;
    }
  }
  cells.push(buffer.replace(/\\\|/g, "|").trim());
  return cells;
}

function joinMarkdownTableRow(cells) {
  return `| ${cells.map((cell) => String(cell ?? "").trim().replace(/\|/g, "\\|")).join(" | ")} |`;
}

function textOnly(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\\\|/g, "|")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function lastNavigationSegment(step) {
  const navMatch = step.match(/进入【([^】]+)】/);
  if (!navMatch) return "";
  const parts = navMatch[1].split(/\s*→\s*/).map((part) => part.trim()).filter(Boolean);
  return parts.at(-1) ?? "";
}

function navigationExpected(step) {
  const segment = lastNavigationSegment(step);
  const stepMatch = step.match(/进入「([^」]+)」步骤/);
  if (segment && stepMatch) {
    return `1)「${segment}」页面已打开<br>2)「${stepMatch[1]}」步骤内容可见`;
  }
  if (segment && /新建监控规则/.test(step) && /监控对象/.test(step)) {
    return `1)「${segment}」页面已打开<br>2)「新建监控规则」入口和「监控对象」步骤内容可见`;
  }
  if (segment) {
    return `1)「${segment}」页面已打开<br>2)页面展示与「${segment}」相关的筛选区、列表或配置区域`;
  }
  const quoted = step.match(/进入「([^」]+)」/);
  if (quoted) {
    return `1)「${quoted[1]}」区域已打开<br>2)页面展示与「${quoted[1]}」相关的业务内容`;
  }
  return "1)目标功能区域已打开<br>2)页面展示本步骤对应的业务内容";
}

function targetFromStep(step) {
  const quoted = [...step.matchAll(/「([^」]{1,40})」/g)].map((match) => match[1]);
  const usefulQuoted = quoted.find((value) => !["确定", "保存", "查询", "重置", "下一步"].includes(value));
  if (usefulQuoted) return `「${usefulQuoted}」`;
  const named = step.match(/\b(?:rule|task)\d+\b/i)?.[0];
  if (named) return `「${named}」`;
  const table = step.match(/\b[a-z][a-z0-9_]{5,}\b/i)?.[0];
  if (table) return `「${table}」`;
  return "目标记录";
}

function operationExpected(step) {
  if (/环境参数/.test(step) && /修改|配置|点击确定/.test(step)) {
    return "1)环境参数修改提交成功<br>2)任务配置中的环境参数回显为本次修改内容";
  }
  if (/环境参数/.test(step) && /查看/.test(step)) {
    return "1)环境参数内容展示成功<br>2)数据源限制和已配置参数信息可见";
  }
  if (/新建监控规则|监控规则/.test(step) && /配置如下|引入规则包|规则包/.test(step)) {
    return "1)监控规则配置保存成功<br>2)规则任务详情回显本次监控对象、规则包和调度属性配置";
  }
  const target = targetFromStep(step);
  return `1)本次操作提交成功<br>2)${target}的列表状态或详情内容更新为本次操作结果`;
}

function normalizeWeakExpected(step, expected) {
  const normalized = textOnly(expected).replace(/\n/g, "<br>");
  if (normalized === NAV_TEMPLATE) {
    weakExpectedReplacements += 1;
    return navigationExpected(step);
  }
  if (normalized === OP_TEMPLATE) {
    weakExpectedReplacements += 1;
    return operationExpected(step);
  }
  return expected;
}

function normalizeLongStepCell(step) {
  const plain = textOnly(step);
  if (/<br\s*\/?>/i.test(step) || !/(?:^|[^0-9])[2-9]\)/.test(plain) || plain.length <= 80) {
    return step;
  }

  let next = step
    .replace(/配置如下:1\)/g, "配置如下:<br>1)")
    .replace(/立即执行:1\)/g, "立即执行:<br>1)")
    .replace(/\/2\)\s*/g, "/<br>2) ")
    .replace(/([>=]=?\s*0)3\)\s*/g, "$1<br>3) ")
    .replace(/(=\s*0)3\)\s*/g, "$1<br>3) ")
    .replace(/(?<!<br>)([（(][^)）]+[)）])2\)\s*/g, "$1<br>2) ")
    .replace(/(?<!<br>)2\)\s*监控规则/g, "<br>2) 监控规则")
    .replace(/(?<!<br>)3\)\s*调度属性/g, "<br>3) 调度属性")
    .replace(/:\s+-\s*/g, ":<br>- ")
    .replace(/(?<!<br>)-\s+(?=[\u4e00-\u9fa5A-Za-z])/g, "<br>- ")
    .replace(/(?<!<br>)(完整性校验|一致性校验|合理性校验|时效性校验|有效性校验|唯一性校验)([:：])/g, "<br>$1$2");

  if (next !== step) stepCellReplacements += 1;
  return next;
}

const markdown = readFileSync(archivePath, "utf8");
const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
const output = [];

for (const line of lines) {
  if (!line.startsWith("|") || /^\|\s*(?:编号|-+)/.test(line)) {
    output.push(line);
    continue;
  }

  const cells = splitMarkdownTableRow(line);
  if (cells.length < 3) {
    output.push(line);
    continue;
  }

  const nextStep = normalizeLongStepCell(cells[1]);
  const nextExpected = normalizeWeakExpected(nextStep, cells.slice(2).join("|"));
  if (nextStep === cells[1] && nextExpected === cells.slice(2).join("|")) {
    output.push(line);
    continue;
  }
  output.push(joinMarkdownTableRow([cells[0], nextStep, nextExpected]));
}

const nextMarkdown = output.join("\n");
if (nextMarkdown !== markdown) writeFileSync(archivePath, nextMarkdown);

console.log(
  JSON.stringify({
    weakExpectedReplacements,
    stepCellReplacements,
  }),
);
