import { describe, expect, it } from "bun:test";
import { validateCommitMessage } from "../../cli/lib/commit-message.ts";

describe("commit message policy", () => {
  it("accepts every supported Emoji Conventional Commit type", () => {
    for (const message of [
      "✨ feat: 新增能力",
      "🐛 fix: 修复边界",
      "♻️ refactor: 调整归属",
      "🧪 test: 增加覆盖",
      "📚 docs: 更新说明",
      "🎨 style: 统一格式",
      "⚡ perf: 减少重复扫描",
      "🔧 chore: 清理产物",
      "🚨 security: 收紧凭据边界",
    ]) {
      expect(validateCommitMessage(message), message).toBeUndefined();
    }
  });

  it("rejects an unknown prefix, missing summary and multiline subject", () => {
    expect(validateCommitMessage("feat: missing emoji")).toContain("不支持的提交前缀");
    expect(validateCommitMessage("✨ feat: ")).toContain("摘要不能为空");
    expect(validateCommitMessage("✨ feat: first\nsecond")).toContain("单行");
  });
});
