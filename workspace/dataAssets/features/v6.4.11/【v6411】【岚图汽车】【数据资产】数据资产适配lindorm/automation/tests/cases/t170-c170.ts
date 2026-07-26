// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C170",
  "title": "验证数据库列表-编辑功能正确",
  "steps": [
    {
      "action": "勾选数据源，点击【编辑】",
      "expected": "显示“编辑”弹窗：\n\t1）包含“生命周期批量配置”元素，hover提示：如果是非分区表，自最后一次数据被修改开始计算，经过N天后数据仍未更新，则会自动触发删表操作。\n如果是分区表，根据各分区的最后一次数据被修改时间开始计算，经过N天后数据仍未更新，则会自动触发删分区操作。当表的所有分区删除后，表本身及表的元数据信息删除。\n\t2）下方提示文案为：注意：生命周期配置后，该数据源内所有的数据表生命周期均会修改，后续在该数据源内新增的数据表也会默认为本次配置的生命周期"
    },
    {
      "action": "生命周期选择“3天”；\n点击【确定】",
      "expected": "保存成功；\n所选数据库下所有表的生命周期修改为3天"
    },
    {
      "action": "生命周期选择“365天”；\n点击【确定】",
      "expected": "保存成功；\n所选数据库下所有表的生命周期修改为365天"
    },
    {
      "action": "生命周期选择“自定义”；\n输入具体天数，如：10天\n点击【确定】",
      "expected": "保存成功；\n所选数据库下所有表的生命周期修改为10天"
    }
  ]
} as const;

test.describe("验证数据库列表-编辑功能正确", () => {
  test("C170 验证数据库列表-编辑功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
