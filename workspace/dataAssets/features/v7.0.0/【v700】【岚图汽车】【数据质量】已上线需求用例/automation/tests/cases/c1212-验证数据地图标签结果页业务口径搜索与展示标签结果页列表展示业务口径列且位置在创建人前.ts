// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1212",
  "title": "验证【数据地图 标签结果页 业务口径搜索与展示】标签结果页列表展示业务口径列且位置在创建人前",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【标签】",
      "expected": "标签结果页正常加载并展示标签结果列表。"
    },
    {
      "action": "查看列表表头顺序与标签\"高价值客户\"所在行",
      "expected": "列表新增\"业务口径\"列，且位于\"创建人\"列之前；\"高价值客户\"行展示其对应业务口径文本。"
    },
    {
      "action": "打开\"高价值客户\"详情侧栏或详情页并查看\"业务口径\"字段",
      "expected": "详情中的业务口径字段正常展示，且其值与列表中同一标签的业务口径内容一致。"
    }
  ]
} as const;

test.describe("验证【数据地图 标签结果页 业务口径搜索与展示】标签结果页列表展示业务口径列且位置在创建人前", () => {
  test("C1212 验证【数据地图 标签结果页 业务口径搜索与展示】标签结果页列表展示业务口径列且位置在创建人前", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
