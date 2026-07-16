import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@shared/lib/paths.ts";

export interface TestCaseFlowSession {
  sessionId: string;
  project: string;
  currentStep: string;
  sourceHash: string;
  lastUpdated: string;
  [key: string]: unknown;
}

export interface SessionPaths {
  workspaceRoot: string;
  project: string;
  yyyymm: string;
  prdSlug: string;
  enhancedPath: string;
}

/**
 * Map of Chinese terms (multi-character words) to English equivalents.
 * Used by buildPrdSlug to generate kebab-case URL-friendly slugs.
 */
const wordMap: Record<string, string> = {
  // Common test/PRD terms
  用户: "user",
  管理: "management",
  原型: "prototype",
  登录: "login",
  权限: "permission",
  角色: "role",
  菜单: "menu",
  列表: "list",
  新增: "create",
  编辑: "edit",
  删除: "delete",
  查询: "search",
  配置: "config",
  审批: "approve",
  导入: "import",
  导出: "export",
  设置: "setting",
  测试: "test",
  用例: "case",
  项目: "project",
  模块: "module",
  数据: "data",
  仪表: "dashboard",
  报告: "report",
  页面: "page",
  组织: "org",
  部门: "dept",
  职位: "position",
  公司: "company",
  流程: "flow",
  通知: "notice",
  消息: "message",
  待办: "todo",
  完成: "complete",
  成功: "success",
  失败: "fail",
  异常: "error",
  边界: "boundary",
  行为: "behavior",
  默认: "default",
  自动: "auto",
  手动: "manual",
  时间: "time",
  日期: "date",
  格式: "format",
  校验: "validate",
  规则: "rule",
  条件: "condition",
  触发: "trigger",
  回滚: "rollback",
  提交: "submit",
  保存: "save",
  取消: "cancel",
  关闭: "close",
  打开: "open",
  下载: "download",
  上传: "upload",
  复制: "copy",
  粘贴: "paste",
  移动: "move",
  排序: "sort",
  过滤: "filter",
  分页: "page",
  显示: "show",
  隐藏: "hide",
  高亮: "highlight",
  链接: "link",
  帮助: "help",
  版本: "version",
  历史: "history",
  日志: "log",
  监控: "monitor",
  预警: "alert",
  短信: "sms",
  邮件: "email",
  国际化: "i18n",
  多语言: "i18n",
  性能: "performance",
  安全: "security",
  兼容: "compat",
  回归: "regression",
  端到端: "e2e",
  集成: "integration",
  单元: "unit",
  功能: "function",
  非功能: "nonfunctional",
};

/**
 * Creates a session ID with project prefix and truncated source hash.
 */
export function createSessionId(input: { project: string; sourceHash: string }): string {
  return `${input.project}-${input.sourceHash.slice(0, 8)}`;
}

/**
 * Converts a Chinese PRD title to a kebab-case English slug.
 *
 * Matches known Chinese terms from the word map, then deduplicates
 * consecutive identical words and joins with hyphens.
 */
export function buildPrdSlug(title: string): string {
  const words: string[] = [];
  let i = 0;

  while (i < title.length) {
    let matched = false;

    // Try longest match first (3 chars, then 2)
    for (let len = 3; len >= 2; len--) {
      if (i + len <= title.length) {
        const chunk = title.slice(i, i + len);
        if (wordMap[chunk] !== undefined) {
          words.push(wordMap[chunk]);
          i += len;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Try single character
      if (wordMap[title[i]] !== undefined) {
        words.push(wordMap[title[i]]);
      }
      i++;
    }
  }

  // Deduplicate consecutive identical words
  const deduped: string[] = [];
  for (const word of words) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== word) {
      deduped.push(word);
    }
  }

  return deduped.join("-").toLowerCase();
}

/**
 * Builds session-related paths for a project workspace.
 */
export function buildSessionPaths(input: {
  workspaceRoot: string;
  project: string;
  yyyymm: string;
  prdSlug: string;
}): SessionPaths {
  return {
    workspaceRoot: input.workspaceRoot,
    project: input.project,
    yyyymm: input.yyyymm,
    prdSlug: input.prdSlug,
    enhancedPath: join(
      input.workspaceRoot,
      input.project,
      "features",
      `${input.yyyymm}-${input.prdSlug}`,
      "enhanced.md",
    ),
  };
}

function defaultSessionDir(): string {
  return join(repoRoot(), ".kata", "sessions");
}

/**
 * Persists session state to disk as JSON.
 */
export function saveSessionState(session: TestCaseFlowSession, sessionsDir?: string): void {
  const dir = sessionsDir || defaultSessionDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, `${session.sessionId}.json`);
  writeFileSync(
    filePath,
    JSON.stringify({ ...session, lastUpdated: new Date().toISOString() }, null, 2),
  );
}

/**
 * Loads a session state from disk. Returns null if not found.
 */
export function loadSessionState(
  sessionId: string,
  sessionsDir?: string,
): TestCaseFlowSession | null {
  const dir = sessionsDir || defaultSessionDir();
  const filePath = join(dir, `${sessionId}.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readFileSync(filePath, "utf8")) as TestCaseFlowSession;
}

/**
 * Evaluates an enhanced.md to determine the next workflow step.
 *
 * Scans content for pending item patterns (unchecked checkboxes or
 * "待确认" section headings). Returns a blocked status if any are found.
 */
export function evaluateNextStep(input: { enhancedContent: string; sessionDir?: string }): {
  next_step: string;
  reason: string;
  blocked: boolean;
} {
  const content = input.enhancedContent;

  const hasPendingItems = /-\s*\[\s*\]/.test(content) || /##\s*待确认事项/.test(content);

  if (hasPendingItems) {
    return {
      next_step: "discuss",
      blocked: true,
      reason: "pending items remain",
    };
  }

  return {
    next_step: "analyze",
    blocked: false,
    reason: "zero pending items",
  };
}

/** Matches a YAML frontmatter block delimited by `---` on their own lines. */
const frontmatterRegex = /^---\n([\s\S]*?)\n---/;

/**
 * Extracts knowledge_dropped entries from the YAML frontmatter of an
 * enhanced.md file.  Returns an empty list when no frontmatter or no
 * knowledge_dropped key is present.
 */
export function evaluateKnowledgeDropped(input: { enhancedContent: string }): {
  knowledge_dropped: Array<{ term: string; confidence: string }>;
  knowledge_summary: string;
} {
  const fmMatch = input.enhancedContent.match(frontmatterRegex);

  if (!fmMatch) {
    return { knowledge_dropped: [], knowledge_summary: "no knowledge dropped" };
  }

  const frontmatter = fmMatch[1];

  // Extract the YAML block under `knowledge_dropped:` (indented list items)
  const blockMatch = frontmatter.match(/knowledge_dropped:\n((?: {2}.*(?:\n|$))*)/);
  if (!blockMatch) {
    return { knowledge_dropped: [], knowledge_summary: "no knowledge dropped" };
  }

  const items: Array<{ term: string; confidence: string }> = [];
  let current: { term?: string; confidence?: string } = {};

  for (const line of blockMatch[1].split("\n")) {
    const trimmed = line.trim();

    // List item prefix (e.g. "- term: foo")
    const listMatch = trimmed.match(/^-\s+term:\s+(.+)$/);
    if (listMatch) {
      if (current.term) {
        items.push(current as { term: string; confidence: string });
      }
      current = { term: listMatch[1] };
      continue;
    }

    const termMatch = trimmed.match(/^term:\s+(.+)$/);
    if (termMatch) {
      if (current.term) {
        items.push(current as { term: string; confidence: string });
      }
      current = { term: termMatch[1] };
      continue;
    }

    const confMatch = trimmed.match(/^confidence:\s+(.+)$/);
    if (confMatch && current.term !== undefined) {
      current.confidence = confMatch[1];
    }
  }

  // Flush last item
  if (current.term) {
    items.push(current as { term: string; confidence: string });
  }

  const summary =
    items.length > 0
      ? `dropped ${items.length} knowledge terms: ${items.map((i) => `${i.term}(${i.confidence})`).join(", ")}`
      : "no knowledge dropped";

  return { knowledge_dropped: items, knowledge_summary: summary };
}

/**
 * Checks whether a session exists and returns the last known step.
 */
export function checkResumeSession(
  input: { sessionId: string },
  sessionsDir?: string,
): { exists: boolean; lastStep?: string } {
  const session = loadSessionState(input.sessionId, sessionsDir);
  if (session === null) {
    return { exists: false };
  }
  return { exists: true, lastStep: session.currentStep };
}
