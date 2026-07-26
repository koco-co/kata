// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C368",
  "title": "验证【通用配置-json格式校验管理】编辑key与新增子层级功能正常",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】页面",
      "expected": "1)页面展示「导 入」「导 出」「新 增」按钮\n2)列表列包含「key」「中文名称」「value格式」「数据源类型」「创建人」「创建时间」「更新人」「更新时间」「操作」"
    },
    {
      "action": "点击目标 key 的「编辑」修改中文名称和值格式后保存，再点击「新增子层级」新增 vin 子 key",
      "expected": "1)编辑保存成功且列表回显更新人、更新时间\n2)新增子层级成功\n3)展开父级 key 后展示子层级 vin"
    }
  ]
} as const;

test.describe("验证【通用配置-json格式校验管理】编辑key与新增子层级功能正常", () => {
  test("C368 验证【通用配置-json格式校验管理】编辑key与新增子层级功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
