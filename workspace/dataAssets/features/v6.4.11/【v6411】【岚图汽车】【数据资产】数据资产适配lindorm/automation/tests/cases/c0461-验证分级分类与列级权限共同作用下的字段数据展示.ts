// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0461",
  "title": "验证分级分类与列级权限共同作用下的字段数据展示",
  "steps": [
    {
      "action": "分级分类配置字段referrer_url，列级权限包含字段referrer_url的情况：\n1）配置“保密”级别，“开放用户等级”为L2；\n2）【自动分级】中为SparkThrift2.x类型配置“字段名识别”referrer_url，级别为：保密\n3）L1用户配置了SparkThrift2.x表A的列级权限包含referrer_url字段；\n4）L1用户进入表A的数据预览页面",
      "expected": "1）分级分类对该用户生效\n2）L1用户可以看到表A的referrer_url字段，但referrer_url列数据加密显示；\n3）referrer_url字段添加“保密”标识"
    },
    {
      "action": "分级分类配置字段referrer_url，列级权限不包含字段referrer_url的情况：\n1）配置“保密”级别，“开放用户等级”为L2；\n2）【自动分级】中为SparkThrift2.x类型配置“字段名识别”referrer_url，级别为：保密\n3）L1用户配置了SparkThrift2.x表A的列级权限不包含referrer_url字段；\n4）L1用户进入表A的数据预览页面",
      "expected": "1）分级分类对该用户生效\n2）L1用户可以看到表A的referrer_url字段，但referrer_url列数据加密显示；\n3）referrer_url字段添加“保密”标识"
    },
    {
      "action": "分级分类不配置字段referrer_url，列级权限包含字段referrer_url的情况：\n1）配置“保密”级别，“开放用户等级”为L2；\n2）【自动分级】中为SparkThrift2.x类型配置“字段名识别”排除referrer_url，级别为：保密\n3）L1用户配置了SparkThrift2.x表A的列级权限包含referrer_url字段；\n4）L1用户进入表A的数据预览页面",
      "expected": "1）列级权限对该用户生效；\n2）该用户有权限看到表A的referrer_url字段；"
    },
    {
      "action": "分级分类不配置字段referrer_url，列级权限不包含字段referrer_url的情况：\n1）配置“保密”级别，“开放用户等级”为L2；\n2）【自动分级】中为SparkThrift2.x类型配置“字段名识别”排除referrer_url，级别为：保密\n3）L1用户配置了SparkThrift2.x表A的列级权限不包含referrer_url字段；\n4）L1用户进入表A的数据预览页面",
      "expected": "1）列级权限对该用户生效；\n2）该用户无权限看到表A的referrer_url字段；"
    }
  ]
} as const;

test.describe("验证分级分类与列级权限共同作用下的字段数据展示", () => {
  test("C0461 验证分级分类与列级权限共同作用下的字段数据展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
