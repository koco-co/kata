// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1114",
  "title": "验证【数据质量 规则集管理 规则编辑-且或关系切换】在规则集中已保存的且关系规则编辑切换为或关系后保存成功",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面打开，列表显示已有规则集数据行"
    },
    {
      "action": "找到\"ruleset_15695_and\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，找到已配置的取值范围&枚举范围规则，将且或关系从【且】切换为【或】单选按钮",
      "expected": "且或关系单选按钮切换为「或」被选中"
    },
    {
      "action": "点击【保存】按钮，再点击页面底部【保存】完成规则集保存",
      "expected": "规则保存成功，规则列表中且或关系列由「且」变更为「或」"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 规则编辑-且或关系切换】在规则集中已保存的且关系规则编辑切换为或关系后保存成功", () => {
  test("C1114 验证【数据质量 规则集管理 规则编辑-且或关系切换】在规则集中已保存的且关系规则编辑切换为或关系后保存成功", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
