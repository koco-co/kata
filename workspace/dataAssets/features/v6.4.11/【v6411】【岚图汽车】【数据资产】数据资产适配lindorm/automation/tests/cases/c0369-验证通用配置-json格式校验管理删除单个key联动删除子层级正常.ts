// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0369",
  "title": "验证【通用配置-json格式校验管理】删除单个key联动删除子层级正常",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】页面",
      "expected": "1)页面展示「导 入」「导 出」「新 增」按钮\n2)列表列包含「key」「中文名称」「value格式」「数据源类型」「创建人」「创建时间」「更新人」「更新时间」「操作」"
    },
    {
      "action": "删除包含子层级的目标 key",
      "expected": "1)弹出删除确认\n2)确认后父 key 与子层级 key 均从列表移除\n3)已被规则引用的历史规则执行不受影响"
    }
  ]
} as const;

test.describe("验证【通用配置-json格式校验管理】删除单个key联动删除子层级正常", () => {
  test("C0369 验证【通用配置-json格式校验管理】删除单个key联动删除子层级正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
