import { describe, expect, it } from "bun:test";
import { evaluateKnowledgeDropped, evaluateNextStep } from "../../src/test-case-flow/session";

describe("Enhanced PRD gates", () => {
  it("detects pending items and blocks progress", () => {
    const result = evaluateNextStep({
      enhancedContent: "## 待确认事项\n- [ ] 问题1\n- [ ] 问题2",
    });
    expect(result.next_step).toBe("discuss");
    expect(result.reason).toContain("pending items remain");
  });

  it("allows progress when zero pending items", () => {
    const result = evaluateNextStep({
      enhancedContent: "## 已确认事项\n- 全部已解决",
    });
    expect(result.next_step).toBe("analyze");
    expect(result.blocked).toBe(false);
  });

  it("detects knowledge dropping from frontmatter", () => {
    const result = evaluateKnowledgeDropped({
      enhancedContent: "---\nknowledge_dropped:\n  - term: 用户状态\n    confidence: high\n---",
    });
    expect(result.knowledge_dropped).toBeDefined();
    expect(result.knowledge_dropped.length).toBeGreaterThan(0);
    expect(result.knowledge_summary).toBeDefined();
  });
});
