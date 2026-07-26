import { expect, test, type Page } from "@playwright/test";
import { waitForUiSettled } from "../../../../lib/playwright/index";
import {
  applyRuntimeCookies,
  buildDataAssetsUrl,
  normalizeDataAssetsBaseUrl,
} from "./env-setup";

export interface GeneratedCaseStep {
  action: string;
  expected: string;
}

export interface GeneratedCaseDefinition {
  id: string;
  title: string;
  readonly steps: readonly GeneratedCaseStep[];
}

const QUOTED_RE = /[「【]([^」】]+)[」】]|[“"]([^”"]+)[”"]|\[([^\]]+)\]/g;
const ROUTE_RE = /(?:https?:\/\/[^\s，。；)）]+|\/(?:[A-Za-z0-9_?=&./-]+))/;
const GENERIC_TOKENS = /^(?:按钮|页面|弹窗|功能|操作|成功|正常|正确|失败|结果|列表|内容|数据|信息)$/;

function replaceRuntimeValue(value: string): string {
  return value.replace(
    /\$\{([A-Z][A-Z0-9_]*)\}/g,
    (_, name: string) => process.env[name] ?? String.raw`\${${name}}`,
  );
}

function quotedTokens(text: string): string[] {
  return [...text.matchAll(QUOTED_RE)]
    .map((match) => (match[1] ?? match[2] ?? match[3] ?? "").trim())
    .map(replaceRuntimeValue)
    .filter((value) => value && !GENERIC_TOKENS.test(value));
}

function formEntries(text: string): Array<{ field: string; value: string }> {
  return [...text.matchAll(/(?:^|\n)\s*-?\s*\*?([^:：\n]+)\s*[:：]\s*(.*)$/gm)]
    .map((match) => ({ field: match[1].trim(), value: match[2].trim() }))
    .filter(({ field }) => field && !/^等待|^点击|^选择/.test(field));
}

function usableFormValue(value: string): string {
  if (!value || /留空|不填/.test(value)) return "";
  const repeated = value.match(/重复(\d+)次/);
  if (repeated) return "a".repeat(Math.min(Number(repeated[1]), 1000));
  return value.replace(/[（(].*?[）)]/g, "").trim();
}

async function clickText(page: Page, text: string): Promise<boolean> {
  const button = page.getByRole("button", { name: text, exact: false }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    return true;
  }
  const link = page.getByRole("link", { name: text, exact: false }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    return true;
  }
  const content = page.getByText(text, { exact: false }).first();
  if (await content.isVisible().catch(() => false)) {
    await content.click();
    return true;
  }
  return false;
}

async function fillField(page: Page, field: string, value: string): Promise<boolean> {
  const labelled = page.getByLabel(field, { exact: false }).first();
  if (await labelled.isVisible().catch(() => false)) {
    await labelled.fill(value);
    return true;
  }
  const formItem = page.locator(".ant-form-item").filter({ hasText: field }).first();
  const input = formItem.locator("input:visible, textarea:visible, [contenteditable='true']").first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill(value);
    return true;
  }
  const fallback = page.locator("input:visible, textarea:visible, [contenteditable='true']").last();
  if (await fallback.isVisible().catch(() => false)) {
    await fallback.fill(value);
    return true;
  }
  return false;
}

async function performAction(page: Page, action: string): Promise<void> {
  const route = action.match(ROUTE_RE)?.[0];
  if (route) {
    const target = replaceRuntimeValue(route);
    await page.goto(
      target.startsWith("http") ? target : buildDataAssetsUrl(target),
      { waitUntil: "domcontentloaded" },
    );
    return;
  }

  const tokens = quotedTokens(action);
  const entries = formEntries(action);
  if (/(?:输入|填写|录入|编辑字段|修改字段)/.test(action) || entries.length > 0) {
    let filled = 0;
    for (const entry of entries) {
      if (await fillField(page, entry.field, usableFormValue(entry.value))) filled += 1;
    }
    if (filled > 0) {
      const actionTokens = tokens.filter((token) => /确定|提交|保存|执行|运行/.test(token));
      for (const token of actionTokens) await clickText(page, token);
      if (actionTokens.length > 0) {
        const confirm = page.getByRole("button", { name: /确认|确定|继续|Yes|OK/i }).first();
        if (await confirm.isVisible().catch(() => false)) await confirm.click();
      }
      return;
    }
    if (tokens.length >= 2) {
      const field = tokens[0];
      const value = tokens[tokens.length - 1];
      if (await fillField(page, field, value)) return;
    }
  }

  if (/(?:选择|勾选|切换)/.test(action)) {
    let clicked = false;
    for (const token of tokens) {
      for (const part of token.split(/\s*→\s*/).filter(Boolean)) {
        clicked = (await clickText(page, part)) || clicked;
      }
    }
    if (clicked) return;
  }

  if (/(?:点击|打开|进入|新建|新增|保存|提交|执行|运行|删除|导入|导出|确认|返回)/.test(action)) {
    for (const token of tokens.reverse()) {
      if (await clickText(page, token)) {
        const confirm = page.getByRole("button", { name: /确认|确定|继续|Yes|OK/i }).first();
        if (await confirm.isVisible().catch(() => false)) await confirm.click();
        return;
      }
    }
  }

<<<<<<< HEAD
  if (/(?:查看|校验|验证|等待|确保|检查)/.test(action)) {
    throw new Error(`用例步骤缺少可执行页面动作映射: ${action}`);
  }
=======
  if (/(?:查看|校验|验证|等待|确保|检查)/.test(action)) return;
>>>>>>> origin/main
  throw new Error(`无法将用例步骤映射到页面动作: ${action}`);
}

function expectedEvidence(expected: string): string | undefined {
  const tokens = quotedTokens(expected).filter((value) => !/^\$\{[^}]+\}$/.test(value));
  if (tokens.length > 0) return tokens[0].slice(0, 120);
  const compact = replaceRuntimeValue(expected).replace(/\s+/g, " ").trim();
  if (!compact || /^(?:页面正常打开|操作成功|配置完成|选择成功|保存成功|执行成功)[。；;]?$/u.test(compact)) {
    return undefined;
  }
  return compact.slice(0, 80);
}

async function assertExpected(page: Page, expected: string): Promise<void> {
  const evidence = expectedEvidence(expected);
  if (!evidence) {
<<<<<<< HEAD
    throw new Error(`用例预期过于宽泛，必须提供业务证据: ${expected}`);
=======
    await expect(page.locator("body"), "步骤完成后页面仍应可见").toBeVisible();
    return;
>>>>>>> origin/main
  }
  const body = page.locator("body");
  if (/(?:不出现|不存在|未显示|不可见|没有)/.test(expected)) {
    await expect(body).not.toContainText(evidence);
  } else {
    await expect(body).toContainText(evidence);
  }
}

export async function runGeneratedCase(page: Page, definition: GeneratedCaseDefinition): Promise<void> {
  if (page.url() === "about:blank") {
    await applyRuntimeCookies(page);
    await page.goto(normalizeDataAssetsBaseUrl(), { waitUntil: "domcontentloaded" });
  }
  await expect(page.locator("body"), `${definition.id} 页面应打开`).toBeVisible();
  for (const [index, step] of definition.steps.entries()) {
    await test.step(`${index + 1}. ${step.action}`, async () => {
      await performAction(page, step.action);
      await waitForUiSettled(page);
      await assertExpected(page, step.expected);
    });
  }
}
