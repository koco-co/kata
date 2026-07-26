// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C107",
  "title": "验证物化视图的源表存在多个，表详情显示正确",
  "steps": [
    {
      "action": "底层创建多源物化视图：\nCREATE MATERIALIZED VIEW mv_trade_usr\nTBLPROPERTIES(\"mv.enableAutoRefresh\"=\"true\",\n\"mv.refreshInterval\"=\"10 min\")\nAS\nSELECT\n\tdu.cust_id ,\n\tdu.cust_name ,\n\tou.new_user,\n\tou.source ,\n\t1 + 2 as cnt\nFROM\n\tdws_trad_user_dz du\nLEFT JOIN ods.ods_risk_devicefingerprint_user_data_df ou on\n\tou.user_id = du.cust_id;",
      "expected": "操作成功"
    },
    {
      "action": "创建mv_trade_usr的元数据同步任务并同步完成",
      "expected": "操作成功"
    },
    {
      "action": "查看mv_trade_usr 详情页",
      "expected": "源表名显示为dws_trad_user_dz;ods.ods_risk_devicefingerprint_user_data_df"
    }
  ]
} as const;

test.describe("验证物化视图的源表存在多个，表详情显示正确", () => {
  test("C107 验证物化视图的源表存在多个，表详情显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
