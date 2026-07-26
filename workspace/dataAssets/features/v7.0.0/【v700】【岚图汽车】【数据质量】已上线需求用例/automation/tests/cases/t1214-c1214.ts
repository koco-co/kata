// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1214",
  "title": "验证【数据地图 指标结果页 业务口径展示】指标详情展示业务口径且与列表值一致",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【指标】",
      "expected": "指标结果页正常加载。"
    },
    {
      "action": "搜索\"客户活跃度\"后打开该指标的详情侧栏或详情页",
      "expected": "页面成功打开指标详情区域。"
    },
    {
      "action": "查看详情中的\"业务口径\"字段，并与列表行中的\"业务口径\"列对比",
      "expected": "详情中的业务口径字段正常展示，且其值与列表中该指标对应的业务口径内容保持一致。"
    }
  ]
} as const;

test.describe("验证【数据地图 指标结果页 业务口径展示】指标详情展示业务口径且与列表值一致", () => {
  test("C1214 验证【数据地图 指标结果页 业务口径展示】指标详情展示业务口径且与列表值一致", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
