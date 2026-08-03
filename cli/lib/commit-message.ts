/** Validate the repository's compact Emoji Conventional Commit subject format. */

const COMMIT_PREFIXES = new Set([
  "✨ feat",
  "🐛 fix",
  "♻️ refactor",
  "🧪 test",
  "📚 docs",
  "🎨 style",
  "⚡ perf",
  "🔧 chore",
  "🚨 security",
]);

export function validateCommitMessage(message: string): string | undefined {
  const subject = message.trim();
  if (subject.includes("\n") || subject.includes("\r")) {
    return "提交消息检查只接受单行 subject";
  }
  const match = subject.match(/^(.+?):\s*(.*)$/u);
  if (!match) return "提交消息必须使用 <emoji> <type>: <摘要> 格式";
  const prefix = match[1] ?? "";
  const summary = match[2]?.trim() ?? "";
  if (!COMMIT_PREFIXES.has(prefix)) {
    return `不支持的提交前缀「${prefix}」；请使用 Emoji Conventional Commit 类型`;
  }
  if (!summary) return "提交消息摘要不能为空";
  return undefined;
}
