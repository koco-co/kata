// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C082",
  "title": "验证前端交互框校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】，新建单表规则选择必选项进入监控规则步骤，点击添加规则",
      "expected": "下拉框新增\"统计性校验\""
    },
    {
      "action": "点击统计性校验",
      "expected": "新增统计性校验配置框"
    },
    {
      "action": "点击统计函数下拉框",
      "expected": "新增\n异常值校验\n选项"
    },
    {
      "action": "点击校验方法下拉框",
      "expected": "新增\nIQR离群点数量\nIQR离群点占比\nZ- score置信区间\n三个选项"
    },
    {
      "action": "点击选中IQR离群点数量",
      "expected": "期望值下拉框展示>/</>=/<=/=/!="
    },
    {
      "action": "点击选中IQR离群点占比",
      "expected": "期望值下拉框展示>/</>=/<=/=/!=\n占比单位默认%"
    },
    {
      "action": "点击选中Z- score置信区间",
      "expected": "期望值格式为\"(\"或者\"[\"+默认值-1.96，1.96+\")\"或者\"]\"\n校验方法右侧新增❓提示：默认期望的Z- score置信区间为（-1.96，1.96），表示值超出了95%，为异常值"
    },
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】，分别选择校验规则为统计性校验同时校验方法为IQR离群点数量/IQR离群点占比/Z- score置信区间的任务实例，点击表名",
      "expected": "右侧弹出实例详情\n下方展示校验规则，格式字段详见prd\n校验未通过右上角显示查看明细按钮\n校验通过右上角按钮隐藏\n查看明细标题：查看\"统计性校验-异常值检测\"明细\n具体明细内容详见prd"
    }
  ]
} as const;

test.describe("验证前端交互框校验", () => {
  test("C082 验证前端交互框校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
