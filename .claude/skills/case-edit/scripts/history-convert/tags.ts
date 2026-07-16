#!/usr/bin/env bun
/**
 * history-convert.ts — Convert historical CSV/XMind files to Archive Markdown.
 *
 * Usage:
 *   kata history convert --path <file-or-dir> --project <name> [--module <key>] [--detect] [--force] [--no-split]
 *   kata history convert --help
 */

export const TAG_STOP_WORDS = new Set([
  "列表页",
  "新增页",
  "编辑页",
  "详情页",
  "设置页",
  "配置页",
  "新增",
  "编辑",
  "删除",
  "详情",
  "查询",
  "搜索",
  "导入",
  "导出",
  "页面",
  "功能",
  "模块",
  "列表",
  "测试",
  "验证",
  "测试用例",
  "用例",
  "步骤",
  "预期",
  "前置条件",
  "未分类",
]);

/** Infer tags from module names, page names, sub-group names, and case titles */
export function inferTags(options: {
  suiteName: string;
  modules: string[];
  pages: string[];
  subGroups: string[];
  caseTitles: string[];
}): string[] {
  const candidates = new Set<string>();

  // Suite name itself
  if (options.suiteName) candidates.add(options.suiteName);

  // Module names (high value)
  for (const m of options.modules) {
    if (m && !TAG_STOP_WORDS.has(m)) candidates.add(m);
  }

  // Page names (medium value — extract meaningful parts)
  for (const p of options.pages) {
    if (p && !TAG_STOP_WORDS.has(p)) candidates.add(p);
  }

  // Sub-group names (medium value)
  for (const sg of options.subGroups) {
    if (sg && !TAG_STOP_WORDS.has(sg)) candidates.add(sg);
  }

  // Extract business keywords from case titles (remove priority prefix + "验证" prefix)
  for (const title of options.caseTitles) {
    const cleaned = title
      .replace(/^【P[012]】/, "")
      .replace(/^验证/, "")
      .trim();
    // Extract noun phrases (Chinese: 2-6 char segments that look like feature names)
    const matches = cleaned.match(/[\u4e00-\u9fff]{2,8}/g);
    if (matches) {
      for (const m of matches) {
        if (!TAG_STOP_WORDS.has(m) && m.length >= 2) {
          candidates.add(m);
        }
      }
    }
  }

  // Deduplicate and limit to 15 tags, prioritize shorter (more specific) tags
  return [...candidates]
    .filter((t) => t.length >= 2)
    .sort((a, b) => a.length - b.length)
    .slice(0, 15);
}
