// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0366",
  "title": "验证【通用配置-报告关联维表设置】配置更新后数据质量报告车辆信息同步更新",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → 报告关联维表设置】页面",
      "expected": "1)页面展示「报告关联维表设置（hive）」「报告关联维表设置（doris）」「车辆信息关联维表设置」\n2)表单字段包含「数据源」「数据库」「数据表」「车辆数统计字段」「车系关联字段」「车型关联字段」「动力类型关联字段」"
    },
    {
      "action": "在「车辆信息关联维表设置」中配置:\n- 数据源: SparkThrift2.x\n- 数据库: ${SchemaA}\n- 数据表: dim_voyah_vehicle_info\n- 车辆数统计字段: vehicle_count\n- 车系关联字段: car_series_code\n- 车型关联字段: car_model_code\n- 动力类型关联字段: power_type\n点击「保 存」",
      "expected": "1)保存成功\n2)再次进入页面时字段配置回显正确\n3)新生成数据质量报告时可生成车辆信息维度数据"
    },
    {
      "action": "修改「车型关联字段」后重新保存，并生成一份数据质量报告",
      "expected": "1)配置更新成功\n2)报告详情中的车型维度统计按新字段展示\n3)未生成报告提示不再出现「请先前往通用配置模块，设置报告关联的维表信息」"
    }
  ]
} as const;

test.describe("验证【通用配置-报告关联维表设置】配置更新后数据质量报告车辆信息同步更新", () => {
  test("C0366 验证【通用配置-报告关联维表设置】配置更新后数据质量报告车辆信息同步更新", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
