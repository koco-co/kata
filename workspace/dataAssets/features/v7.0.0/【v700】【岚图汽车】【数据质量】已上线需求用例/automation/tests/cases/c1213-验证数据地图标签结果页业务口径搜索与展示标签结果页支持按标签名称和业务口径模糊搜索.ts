// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1213",
  "title": "验证【数据地图 标签结果页 业务口径搜索与展示】标签结果页支持按标签名称和业务口径模糊搜索",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【标签】",
      "expected": "标签结果页正常加载，搜索框提示文案为\"请输入标签名称、业务口径\"。"
    },
    {
      "action": "在搜索框输入\"高价值\"，点击【查询】按钮",
      "expected": "结果列表展示标签\"高价值客户\"，不展示名称不匹配的\"待回访客户\"。"
    },
    {
      "action": "清空搜索框后输入\"累计订单金额大于10万元\"，再次点击【查询】按钮",
      "expected": "列表通过业务口径模糊匹配命中\"高价值客户\"，说明标签业务口径搜索生效。"
    }
  ]
} as const;

test.describe("验证【数据地图 标签结果页 业务口径搜索与展示】标签结果页支持按标签名称和业务口径模糊搜索", () => {
  test("C1213 验证【数据地图 标签结果页 业务口径搜索与展示】标签结果页支持按标签名称和业务口径模糊搜索", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
