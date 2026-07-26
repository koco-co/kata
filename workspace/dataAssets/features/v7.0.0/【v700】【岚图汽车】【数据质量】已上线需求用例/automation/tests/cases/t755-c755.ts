// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C755",
  "title": "验证前端交互框校验",
  "steps": [
    {
      "action": "进入数据质量模块",
      "expected": "左侧新增规则库配置模块"
    },
    {
      "action": "进入规则库配置模块",
      "expected": "左上角显示自定义正则、规则搜索框\n界面显示已新增的规则，包含字段规则名称、规则模式、规则分类、关联范围、关联规则数（计算此规则关联的规则数量）、规则描述、操作列编辑、查看详情\n右侧新增新建自定义正则按钮\n右下方分页框"
    },
    {
      "action": "点击分页上下翻页",
      "expected": "正常翻页"
    },
    {
      "action": "筛选框筛选规则模式、规则分类、关联范围",
      "expected": "正常筛选"
    }
  ]
} as const;

test.describe("验证前端交互框校验", () => {
  test("C755 验证前端交互框校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
