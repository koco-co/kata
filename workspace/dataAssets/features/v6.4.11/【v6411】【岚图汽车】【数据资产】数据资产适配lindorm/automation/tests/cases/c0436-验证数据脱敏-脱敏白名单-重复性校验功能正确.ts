// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0436",
  "title": "验证数据脱敏-脱敏白名单-重复性校验功能正确",
  "steps": [
    {
      "action": "准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：tableA1\n\n再次进入新增白名单弹窗，选择\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：tableA1\n点击【确定】",
      "expected": "提示：已存在相同的白名单信息"
    },
    {
      "action": "准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：tableA1\n\n再次进入新增白名单弹窗，选择\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：全部\n点击【确定】",
      "expected": "创建成功"
    },
    {
      "action": "准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：全部\n\n再次进入新增白名单弹窗，选择\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：全部\n点击【确定】",
      "expected": "提示：已存在相同的白名单信息"
    },
    {
      "action": "准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：全部\n\n再次进入新增白名单弹窗，选择\n\t数据源：datasourceA \n\t数据库：schemaA1 \n\t数据表：tableA1\n点击【确定】",
      "expected": "创建成功"
    },
    {
      "action": "准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：全部\n\t数据表：全部\n\n再次进入新增白名单弹窗，选择\n\t数据源：datasourceA \n\t数据库：全部\n\t数据表：全部\n点击【确定】",
      "expected": "提示：已存在相同的白名单信息"
    },
    {
      "action": "准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：全部\n\t数据表：全部\n\n再次进入新增白名单弹窗，选择\n\t数据源：datasourceA \n\t数据库：schemaA1\n\t数据表：全部\n点击【确定】",
      "expected": "创建成功"
    },
    {
      "action": "准备一条白名单记录配置如下：\n\t数据源：datasourceA \n\t数据库：全部\n\t数据表：全部\n\n再次进入新增白名单弹窗，选择\n\t数据源：datasourceA \n\t数据库：schemaA1\n\t数据表：tableA1\n点击【确定】",
      "expected": "创建成功"
    }
  ]
} as const;

test.describe("验证数据脱敏-脱敏白名单-重复性校验功能正确", () => {
  test("C0436 验证数据脱敏-脱敏白名单-重复性校验功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
