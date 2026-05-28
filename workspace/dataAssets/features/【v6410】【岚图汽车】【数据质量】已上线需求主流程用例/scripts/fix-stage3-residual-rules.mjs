#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");

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

function removeFillerStepAndRenumber(block) {
  if (!block.includes("| 3 | 前提条件标示 |")) return { block, changed: false };
  const lines = block.split("\n");
  const next = [];
  let changed = false;
  let inSteps = false;
  for (const line of lines) {
    if (line.trim() === "> 用例步骤") {
      inSteps = true;
      next.push(line);
      continue;
    }
    if (inSteps && /^#####\s+【P[0-3]】/.test(line)) inSteps = false;
    if (inSteps && /^\|\s*\d+\s*\|/.test(line)) {
      const cells = splitMarkdownTableRow(line);
      const number = Number(cells[0]);
      if (Number.isInteger(number) && cells[1]?.trim() === "前提条件标示") {
        changed = true;
        continue;
      }
      if (Number.isInteger(number) && number > 3) {
        cells[0] = String(number - 1);
        next.push(joinMarkdownTableRow(cells));
        changed = true;
        continue;
      }
    }
    next.push(line);
  }
  return { block: next.join("\n"), changed };
}

let markdown = readFileSync(archivePath, "utf8");
let r7Replacements = 0;
let r8Replacements = 0;

const rawApiStep =
  "| 2 | 执行 `curl -X POST ${BASE_URL}/dassets/v1/scheduleJob/affectCountStatistic` | 1)接口调用成功，影响统计任务被触发且无报错。 |";
const uiReviewStep =
  "| 2 | 按前置条件完成血缘影响数统计任务触发后，刷新【资产 → 资产盘点】页面并查看影响统计区域 | 1)影响统计区域刷新完成<br>2)近7天影响表数量统计展示最新统计结果 |";
if (markdown.includes(rawApiStep)) {
  markdown = markdown.replace(rawApiStep, uiReviewStep);
  r7Replacements += 1;
}

const caseTitle =
  "##### 【P0】点击临时保存规则后，留存在当前页面不进行跳转，并提示“规则已临时保存” 验证规则配置中间态保存不进行页面跳转（监控规则处保存）";
const start = markdown.indexOf(caseTitle);
if (start !== -1) {
  const nextStart = markdown.indexOf("\n##### ", start + caseTitle.length);
  const end = nextStart === -1 ? markdown.length : nextStart;
  let block = markdown.slice(start, end);
  const result = removeFillerStepAndRenumber(block);
  block = result.block
    .replace(/「规则描述」 不作填写/g, "「规则描述」 校验多表数据行数对比临时保存")
    .replace(/规则已临时保存/g, "临时保存成功")
    .replace(/找到【test】规则/g, "找到「test」规则")
    .replace(/【test】规则/g, "「test」规则")
    .replace(/查看【监控对象】内容/g, "查看「监控对象」内容")
    .replace(/查看【监控规则】内容/g, "查看「监控规则」内容")
    .replace(/在【校验结果查询】\/【数据质量报告】中查询【test】任务产生的实例及报告/g, "在【数据质量 → 校验结果查询】和【数据质量 → 数据质量报告】中查询「test」任务产生的实例及报告");
  if (block !== markdown.slice(start, end)) {
    markdown = `${markdown.slice(0, start)}${block}${markdown.slice(end)}`;
    r8Replacements += result.changed ? 1 : 0;
  }
}

writeFileSync(archivePath, markdown);
console.log(JSON.stringify({ r7Replacements, r8Replacements }));
