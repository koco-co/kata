// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1066",
  "title": "验证「数据质量-总览」-「近期校验异常结果」展示正确",
  "steps": [
    {
      "action": "进入【资产-数据质量-总览】页面",
      "expected": "页面正常进入"
    },
    {
      "action": "查看【近期校验异常结果】板块",
      "expected": "包含\n1）标题右上角\"？\"，悬浮提示\"仅展示最近运行有问题的任务信息，展示最近20条\"\n2）表格形式-包含表头：数据表、所属数据库、所属数据源、任务名称、状态、执行周期、是否关联任务、计划时间、开始时间、结束时间、操作-【查看详情】按钮\n3）【查看更多】按钮"
    },
    {
      "action": "1）新增表A的规则，执行周期为天，关联任务，使其子规则运行失败\n2）新增表B的规则，执行周期为周，不关联任务，使其子规则运行失败\n3）立即运行",
      "expected": "新增并立即运行成功"
    },
    {
      "action": "查看校验异常结果详情",
      "expected": "展示为：表头从左到右\n1）第一行：表A，「${DATABASE}」 ，「${DATASOURCE}」，test_ruleA，校验异常，天，是，「${计划时间}」，「${开始时间}」，「${结束时间}」，查看详情按钮\n2）第二行：表B，「${DATABASE}」 ，「${DATASOURCE}」，test_ruleB，校验异常，周，否，「${计划时间}」，「${开始时间}」，「${结束时间}」，查看详情按钮"
    },
    {
      "action": "点击表A的【查看详情】按钮",
      "expected": "抽屉式展开结果详情，详情正确"
    },
    {
      "action": "1）修改表A的规则详情\n2）立即运行",
      "expected": "修改并立即运行成功"
    },
    {
      "action": "查看校验异常结果详情",
      "expected": "表A的详情展示为修改后的正确内容"
    },
    {
      "action": "删除表A的规则任务",
      "expected": "删除成功"
    },
    {
      "action": "查看校验异常结果详情",
      "expected": "不显示表A的相关详情"
    },
    {
      "action": "创建共20条运行失败的规则任务，查看校验异常结果详情",
      "expected": "显示20条的校验异常结果详情"
    },
    {
      "action": "创建共21条运行失败的规则任务，查看校验异常结果详情",
      "expected": "仅显示最近的20条校验异常结果详情"
    },
    {
      "action": "点击【查看更多】按钮",
      "expected": "成功跳转至【校验结果查询】页面"
    }
  ]
} as const;

test.describe("验证「数据质量-总览」-「近期校验异常结果」展示正确", () => {
  test("C1066 验证「数据质量-总览」-「近期校验异常结果」展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
