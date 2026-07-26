// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1217",
  "title": "验证【数据地图 指标结果页 业务口径搜索】指标结果页支持按指标名称和业务口径模糊搜索",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【指标】",
      "expected": "指标结果页正常加载，搜索框提示文案为\"请输入指标名称、业务口径\"。"
    },
    {
      "action": "在搜索框输入\"活跃\"，点击【查询】按钮",
      "expected": "列表展示指标\"客户活跃度\"，不展示名称不匹配的\"订单履约率\"。"
    },
    {
      "action": "清空搜索框后输入\"近30天客户登录\"，再次点击【查询】按钮",
      "expected": "列表通过业务口径模糊匹配命中\"客户活跃度\"，说明业务口径搜索生效。"
    }
  ]
} as const;

test.describe("验证【数据地图 指标结果页 业务口径搜索】指标结果页支持按指标名称和业务口径模糊搜索", () => {
  test("C1217 验证【数据地图 指标结果页 业务口径搜索】指标结果页支持按指标名称和业务口径模糊搜索", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
