// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1216",
  "title": "验证【数据地图 指标结果页 业务口径搜索】指标结果页按业务口径搜索无匹配时显示空状态",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【指标】",
      "expected": "指标结果页正常加载。"
    },
    {
      "action": "在搜索框输入\"完全不存在的业务口径描述\"，点击【查询】按钮",
      "expected": "页面完成查询，不报错。"
    },
    {
      "action": "查看指标结果列表",
      "expected": "结果区域展示空状态或\"暂无数据\"提示，不展示任何指标记录。"
    }
  ]
} as const;

test.describe("验证【数据地图 指标结果页 业务口径搜索】指标结果页按业务口径搜索无匹配时显示空状态", () => {
  test("C1216 验证【数据地图 指标结果页 业务口径搜索】指标结果页按业务口径搜索无匹配时显示空状态", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
