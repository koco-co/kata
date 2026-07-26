// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C699",
  "title": "验证前端交互框校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】，新建单表规则选择必选项进入监控规则步骤，点击添加规则",
      "expected": "下拉框规范性校验更改为\"有效性校验\""
    },
    {
      "action": "点击统计规则下拉框",
      "expected": "新增\n格式-日期格式-date\n格式-日期格式-datetime\n格式校验-自定义正则\n这三种统计规则"
    },
    {
      "action": "点击分别选中格式-日期格式-date/格式-日期格式-datetime",
      "expected": "后方增加格式输入框，可选范围为\ndate：YYYY-MM-DD、MM/DD/YYYY、MM-DD-YYYY、DD.MM.YYYY、DD-MM-YYYY、YY-MM-DD、YYYY/MM/DD\ndatetime：YYYY-MM-DDThh:mm:ss、YYYY-MM-DDThh:mm:ss±hh:mm、MM/DD/YYYY hh:mm:ss AM/PM、MM/DD/YYYY HH:mm:ss、DD.MM.YYYY hh:mm:ss、YY-MM-DD hh:mm:ss、YYYY/MM/DD hh:mm:ss\n期望值默认展示\"占比=100%\""
    },
    {
      "action": "点击选中格式校验-自定义正则",
      "expected": "后方增加选择规则选择框与新增自定义正则按钮"
    },
    {
      "action": "鼠标悬浮规则之上",
      "expected": "展示规则详情，样式参考建模时引用标准样式"
    },
    {
      "action": "点击选中数值-取值范围，期望值选择\"=\"",
      "expected": "后部且/或及选择框隐藏"
    },
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】，选择一个校验类型为格式类型任务，点击表名",
      "expected": "右侧弹出实例详情\n统计函数显示：格式类型\n下方新增字段：校验类型\n校验类型枚举值：身份证号、手机号、邮箱、日期格式-date、日期格式-datetime"
    }
  ]
} as const;

test.describe("验证前端交互框校验", () => {
  test("C699 验证前端交互框校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
