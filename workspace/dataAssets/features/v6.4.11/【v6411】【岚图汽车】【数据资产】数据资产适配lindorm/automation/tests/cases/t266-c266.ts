// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C266",
  "title": "验证建表语句解析功能",
  "steps": [
    {
      "action": "进入建表流程-“表结构”步骤；\n选择“建表语句解析模式”；\n输入建表语句，进行解析：\nCREATE TABLE IF NOT EXISTS `batch_test_v53x_new_asset`.`ods_bu_par4_df` (\n`busine_line_id` STRING COMMENT '业务线ID',\n`busine_line` INT COMMENT '业务线',\n`bu_id` STRING COMMENT '事业 部ID',\n`bu_name` STRING COMMENT '事业部',\n`busi_team` STRING COMMENT '隶属商务团队',\n`busi_team_date` STRING COMMENT '隶属时间',\n`load_dt` TIMESTAMP COMMENT '隶属时间'\n)\nCOMMENT 'dim维度表_新核心业务线'\nPARTITIONED BY (\n`data_dt` STRING COMMENT '数据时间',\n`is_save` INT COMMENT '数据是否保留：0-否，1-是'\n)\nSTORED AS PARQUET\nTBLPROPERTIES ('transactional'='true');",
      "expected": "每个字段解析正确；\n所属标准匹配成功；\n分区字段解析正确"
    }
  ]
} as const;

test.describe("验证建表语句解析功能", () => {
  test("C266 验证建表语句解析功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
