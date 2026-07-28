// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0102",
  "title": "验证视图的源表存在多个，表详情显示正确",
  "steps": [
    {
      "action": "底层执行SQL：\nCREATE VIEW v_trade_usr AS SELECT  du.cust_id ,du.cust_name ,ou.new_user,ou.source ,1+2 FROM  dws_trad_user_dz du LEFT JOIN ods_risk_devicefingerprint_user_data_df ou on ou.user_id = du.cust_id;",
      "expected": "操作成功"
    },
    {
      "action": "创建v_trade_usr的元数据同步任务；并同步完成",
      "expected": "操作成功"
    },
    {
      "action": "查看v_trade_usr详情页",
      "expected": "源表名显示为dws_trad_user_dz;ods.ods_risk_devicefingerprint_user_data_df"
    }
  ]
} as const;

test.describe("验证视图的源表存在多个，表详情显示正确", () => {
  test("C0102 验证视图的源表存在多个，表详情显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
