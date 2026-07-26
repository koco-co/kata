// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C297",
  "title": "验证【规则库配置-自定义正则】编辑、详情与删除功能正常",
  "steps": [
    {
      "action": "进入【数据质量 → 规则库配置 → 自定义正则】页面",
      "expected": "1)自定义正则列表加载成功\n2)目标规则展示「编辑」「删除」操作"
    },
    {
      "action": "点击目标规则「编辑」修改规则描述后保存，再打开详情",
      "expected": "1)编辑保存成功\n2)详情回显修改后的规则描述、规则分类、关联范围和正则内容"
    },
    {
      "action": "删除未被引用的自定义正则；尝试删除已被规则引用的自定义正则",
      "expected": "1)未被引用规则删除成功\n2)已被引用规则提示需先调整规则后再删除"
    }
  ]
} as const;

test.describe("验证【规则库配置-自定义正则】编辑、详情与删除功能正常", () => {
  test("C297 验证【规则库配置-自定义正则】编辑、详情与删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
