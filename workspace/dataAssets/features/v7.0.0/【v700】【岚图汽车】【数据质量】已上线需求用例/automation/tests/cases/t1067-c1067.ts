// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1067",
  "title": "验证「数据质量-总览」-「近7日校验结果分析」展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看【近7日校验结果分析】板块",
      "expected": "包含\n1）曲线图-统计子规则的通过数、不通过数，横坐标-最近7日的日期（年-月-日），纵坐标-数量\n2）统计范围筛选下拉框-支持选择所有已配置了任务的表，默认显示为\"全部\"占位，格式为数据源.数据库.数据表"
    },
    {
      "action": "统计范围处默认为全部表时，查看曲线图详情",
      "expected": "显示为所有存在子规则的通过数、不通过数各自的总和"
    },
    {
      "action": "在统计范围下拉框内输入test",
      "expected": "下拉项中显示所有包含关键字test，且已配置了任务的数据表，支持点击"
    },
    {
      "action": "1）新增表A的规则，共5条规则任务，包含2条校验通过，2条校验不通过，1条运行失败\n2）新增表B的规则，共10条规则任务，包含4条校验通过，5条校验不通过，1条运行失败\n3）立即运行",
      "expected": "新增并立即运行成功"
    },
    {
      "action": "在统计范围筛选框内输入A",
      "expected": "显示下拉项：「${DATASOURCE}」.「${DATABASE}」.A"
    },
    {
      "action": "选择并点击表A，查看校验结果分析曲线图",
      "expected": "展示正确，鼠标悬浮结点时显示年月日、通过数：2/不通过数：2"
    },
    {
      "action": "切换统计范围，选择并点击表B，查看校验结果分析曲线图",
      "expected": "展示正确，鼠标悬浮结点时显示年月日、通过数：4/不通过数：5"
    },
    {
      "action": "1）修改表B里面的部分子规则，删除子规则使其共3条规则任务，包含2条校验通过，1条校验不通过，0条运行失败\n2）立即运行",
      "expected": "修改并立即运行成功"
    },
    {
      "action": "选择并点击表B，查看校验结果分析曲线图",
      "expected": "展示正确，鼠标悬浮结点时显示年月日、通过数：2/不通过数：1"
    },
    {
      "action": "删除表A的规则任务",
      "expected": "删除成功"
    },
    {
      "action": "在统计范围搜索A",
      "expected": "不显示下拉项：「${DATASOURCE}」.「${DATABASE}」.A"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」-「近7日校验结果分析」展示正确", () => {
  test("C1067 验证「数据质量-总览」-「近7日校验结果分析」展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
