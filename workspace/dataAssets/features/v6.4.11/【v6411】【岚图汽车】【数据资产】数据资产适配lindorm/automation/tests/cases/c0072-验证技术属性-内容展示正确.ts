// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0072",
  "title": "验证【技术属性】-内容展示正确",
  "steps": [
    {
      "action": "点击表详情页右侧【技术属性】栏",
      "expected": "【表名】【数据源】【表创建时间】【数据库】【存储格式】【DDL最后变更时间】【存储位置】【存储大小】【表行数】【最近同步时间】展示正确"
    },
    {
      "action": "鼠标hover“存储大小”？符号",
      "expected": "提示“最近同步时间--”"
    },
    {
      "action": "鼠标hover“表行数”？符号",
      "expected": "提示“最近同步时间--”"
    },
    {
      "action": "再次点击表详情页右侧【技术属性】栏",
      "expected": "侧边栏收起"
    }
  ]
} as const;

test.describe("验证【技术属性】-内容展示正确", () => {
  test("C0072 验证【技术属性】-内容展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
