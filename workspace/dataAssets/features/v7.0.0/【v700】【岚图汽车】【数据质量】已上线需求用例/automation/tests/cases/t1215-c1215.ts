// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1215",
  "title": "验证【数据地图 指标结果页 业务口径展示】指标结果页列表展示业务口径列且位置在创建人前",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【指标】",
      "expected": "指标结果页正常加载并展示结果列表。"
    },
    {
      "action": "查看列表表头顺序",
      "expected": "列表新增\"业务口径\"列，且该列位于\"创建人\"列之前，不覆盖原有字段。"
    },
    {
      "action": "查看指标\"客户活跃度\"所在行的业务口径值",
      "expected": "\"业务口径\"列展示\"用于评估近30天客户登录与下单活跃程度\"等实际文本，显示内容与该指标配置一致。"
    }
  ]
} as const;

test.describe("验证【数据地图 指标结果页 业务口径展示】指标结果页列表展示业务口径列且位置在创建人前", () => {
  test("C1215 验证【数据地图 指标结果页 业务口径展示】指标结果页列表展示业务口径列且位置在创建人前", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
