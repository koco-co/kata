import { describe, expect, it } from "bun:test";
import {
  compactLintText,
  LINT_PAGE_SIZE,
  lintDetail,
  lintLabel,
  lintPageCount,
  lintPageSlice,
  lintScope,
  lintSummary,
  type TuiLintViolation,
} from "../../cli/lib/tui/lint-result.ts";

const violation: TuiLintViolation = {
  rule: "case_first_step_navigation",
  case_id: "C0359",
  message: `标题: YAML用例存在违规内容，必须整改.
预期：进入【一至三级实际菜单路径】页面
实际：进入【元数据 → 数据地图】，打开 test_table_13186_c0359 表详情
修复：将首步骤 action 改为：进入【数据质量 → 规则库配置】页面
要求：语义级重写全部同类内容后重新执行 lint；未通过前不得交由用户验收!`,
};

describe("TUI lint result", () => {
  it("prefers case id as the violation scope", () => {
    expect(lintScope(violation)).toBe("C0359");
  });

  it("falls back to file scope for feature-level violations", () => {
    expect(lintScope({ rule: "p0_ratio", message: "cases/需求.yaml P0 占比超出范围" })).toBe(
      "cases/需求.yaml",
    );
  });

  it("renders a compact list label and actual summary", () => {
    expect(lintLabel(violation)).toBe("C0359 [case_first_step_navigation]");
    expect(lintSummary(violation)).toContain("实际: 进入");
  });

  it("keeps full detail for the selected violation", () => {
    expect(lintDetail(violation)).toBe(violation.message);
  });

  it("compacts multiline text for hints", () => {
    expect(compactLintText("abcdef\nghij", 6)).toBe("abc...");
  });

  it("pages lint results ten at a time", () => {
    const items = Array.from({ length: 13 }, (_, index) => `v${index}`);
    expect(LINT_PAGE_SIZE).toBe(10);
    expect(lintPageCount(13)).toBe(2);
    expect(lintPageSlice(items, 0)).toHaveLength(10);
    expect(lintPageSlice(items, 1)).toEqual(["v10", "v11", "v12"]);
  });
});
