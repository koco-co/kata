// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C300",
  "title": "验证【规则库配置-自定义sql模版】详情、编辑与引用保护正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置 → 自定义sql模版】页面",
      "expected": "1)列表展示自定义sql模版数据\n2)已被规则引用的模板展示关联规则数量"
    },
    {
      "action": "打开模板详情并点击「编辑」修改规则描述后保存",
      "expected": "1)详情展示「规则分类」「关联范围」「关联规则」「规则描述」「规则内容」\n2)编辑保存后详情回显最新内容"
    },
    {
      "action": "尝试删除已被规则引用的自定义sql模版",
      "expected": "1)系统提示「已存在规则引用自定义规则，请先调整规则后再删除自定义sql模版」\n2)模板未被删除且关联规则不受影响"
    }
  ]
} as const;

test.describe("验证【规则库配置-自定义sql模版】详情、编辑与引用保护正常", () => {
  test("C300 验证【规则库配置-自定义sql模版】详情、编辑与引用保护正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
