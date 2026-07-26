// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C029",
  "title": "验证数据模型-审批功能",
  "steps": [
    {
      "action": "数据开发角色用户，进入数据模型-新建表，选择doris数据源、数据库、数仓层级、模型元素\n表名：自定义内容：「T_doris_A」\n中文名：doris表A\n数据模型类型：【主键表】\n2）点击下一步",
      "expected": "1）进入数据模型新建页面\n2）进入表结构页面"
    },
    {
      "action": "新增多个字段，其中包含字段ID\n字段id勾选主键，分区字段，动态分区，分桶字段(分桶数1)，编辑动态分区配置：同前置条件",
      "expected": "新增成功"
    },
    {
      "action": "点击【生成建表语句】按钮，建表",
      "expected": "1）提示：提交审批成功\n2）我的模型-已审批页面记录新增一条记录为审批中"
    },
    {
      "action": "管理员用户进入「审批中心」，审批拒绝",
      "expected": "1）表未新建，数据模型新增一条记录，为未建表状态\n2）数据开发用户，我的模型-已审批页面记录状态变为已拒绝"
    },
    {
      "action": "管理员用户进入「审批中心」，审批通过",
      "expected": "1）数据模型新增一条记录，为已建表状态\n2）表详情正确\n3）数据开发用户，我的模型-已审批页面记录状态变为已通过"
    }
  ]
} as const;

test.describe("验证数据模型-审批功能", () => {
  test("C029 验证数据模型-审批功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
