// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1222",
  "title": "验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页模糊匹配可按关键字返回多条相关字段",
  "steps": [
    {
      "action": "进入【元数据 → 数据地图】页面，切换结果类型到【字段】",
      "expected": "字段结果页正常加载，搜索逻辑默认可切换。"
    },
    {
      "action": "将搜索逻辑切换为【模糊匹配】，在搜索框输入\"cust_\"，点击【查询】按钮",
      "expected": "结果列表展示字段名包含\"cust_\"的记录，至少包含 cust_name、cust_cert_type、cust_cert_code 三条字段数据。"
    },
    {
      "action": "查看结果列表中的所属表和资产目录信息",
      "expected": "模糊匹配结果均展示正确的所属表和资产目录信息，字段列表未混入与关键字无关的 order_amount 记录。"
    }
  ]
} as const;

test.describe("验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页模糊匹配可按关键字返回多条相关字段", () => {
  test("C1222 验证【数据地图 字段结果页 搜索逻辑与目录联动】字段结果页模糊匹配可按关键字返回多条相关字段", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
