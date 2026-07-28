// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1069",
  "title": "验证「数据质量-总览」-「校验异常top排名」展示正确（相同--最近时间--表名字母排序）",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看【校验异常top排名】板块",
      "expected": "包含\n1）标题右上角\"？\"，悬浮提示\"以数据表维度对校验异常数最多的表进行排名\"\n2）表格形式-包含表头：排名、数据表、所属数据库、所属数据源、校验任务数、校验失败/不通过数、最近一次校验时间\n3）支持横向/竖向滑动列表"
    },
    {
      "action": "1）新增表A的规则，共5条规则任务，包含2条校验通过，2条校验不通过，1条运行失败\n2）新增表B的规则，共10条规则任务，包含4条校验通过，5条校验不通过，1条运行失败\n3）立即运行",
      "expected": "新增并立即运行成功"
    },
    {
      "action": "查看校验异常排名详情",
      "expected": "展示为：表头从左到右\n1）第一行：1，表B，「${DATABASE}」 ，「${DATASOURCE}」，10，1/5，「${datetime}」\n2）第二行：2，表A，「${DATABASE}」 ，「${DATASOURCE}」，5，1/2，「${datetime}」"
    },
    {
      "action": "1）修改表B里面的部分子规则，删除子规则使其共3条规则任务，包含2条校验通过，1条校验不通过，0条运行失败\n2）立即运行",
      "expected": "修改并立即运行成功"
    },
    {
      "action": "查看校验异常排名详情",
      "expected": "展示为：表头从左到右\n1）第一行：1，表A，「${DATABASE}」 ，「${DATASOURCE}」，5，1/2，「${datetime}」\n2）第二行：2，表B，「${DATABASE}」 ，「${DATASOURCE}」，3，0/1，「${datetime}」"
    },
    {
      "action": "删除表A的规则任务",
      "expected": "删除成功"
    },
    {
      "action": "查看校验异常排名详情",
      "expected": "不显示表A的相关详情"
    },
    {
      "action": "创建共10张表的规则任务，查看校验异常排名",
      "expected": "显示10张表的校验异常详情"
    },
    {
      "action": "创建共11张表的规则任务，查看校验异常排名",
      "expected": "仅显示校验失败+不通过总数最高的前10张表的详情"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」-「校验异常top排名」展示正确（相同--最近时间--表名字母排序）", () => {
  test("C1069 验证「数据质量-总览」-「校验异常top排名」展示正确（相同--最近时间--表名字母排序）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
