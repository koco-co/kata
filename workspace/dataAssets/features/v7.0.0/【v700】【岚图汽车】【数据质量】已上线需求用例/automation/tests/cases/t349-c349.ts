// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C349",
  "title": "验证【所有支持配置分区的地方支持\"选择动态分区\"，选择后配置内容和选表时保持一致】「唯一性校验」-「多表唯一性判断」-「选择对比表」-「输入分区」-\"选择动态分区\"，「规则任务管理」-「详情」-「监控规则」相关的显示内容",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建监控规则】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "监控对象配置如下：[规则名称]输入「test_rule」[选择数据源]选择「${DATASOURCE}」[选择数据库]选择「${DATABASE}」[选择数据表]选择「${TABLE}」[选择分区] 手动输入分区 - \"id=1\"",
      "expected": "[监控对象]配置完成"
    },
    {
      "action": "点击【下一步】按钮",
      "expected": "进入[监控规则]配置页面"
    },
    {
      "action": "点击【添加规则】按钮-选择[唯一性验证]",
      "expected": "页面新增[唯一性验证]配置栏"
    },
    {
      "action": "唯一性验证配置如下：[规则类型] 多表唯一性判断[选择对比表]- [对比表所属库] DataQuery_Doris [对比表] user_profile_4023 [输入分区] 选择动态分区[强弱规则] 弱规则[规则描述] 不作填写",
      "expected": "[唯一性验证]配置完毕，\"选择动态分区\"选择后提示\"监控对象未选择分区\""
    }
  ]
} as const;

test.describe("验证【所有支持配置分区的地方支持\"选择动态分区\"，选择后配置内容和选表时保持一致】「唯一性校验」-「多表唯一性判断」-「选择对比表」-「输入分区」-\"选择动态分区\"，「规则任务管理」-「详情」-「监控规则」相关的显示内容", () => {
  test("C349 验证【所有支持配置分区的地方支持\"选择动态分区\"，选择后配置内容和选表时保持一致】「唯一性校验」-「多表唯一性判断」-「选择对比表」-「输入分区」-\"选择动态分区\"，「规则任务管理」-「详情」-「监控规则」相关的显示内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
