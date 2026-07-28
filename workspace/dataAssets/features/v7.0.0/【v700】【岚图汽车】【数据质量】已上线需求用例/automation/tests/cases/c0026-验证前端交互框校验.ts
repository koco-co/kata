// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0026",
  "title": "验证前端交互框校验",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】，新建单表规则选择必选项进入监控规则步骤，点击添加规则-有效性校验，点击统计函数下拉框",
      "expected": "下方唯一性校验配置框\n新增\"多表唯一性判断\""
    },
    {
      "action": "选择多表唯一性判断",
      "expected": "过滤条件展示在统计函数后方，新增条件设置按钮\n下方新增展示选择校验字段逻辑框、选择和其他表的校验关系、选择对比表、输入分区、选择对比表1字段、表后选择校验字段逻辑，新增表按钮（+）"
    },
    {
      "action": "点击选择校验字段逻辑",
      "expected": "可选唯一/允许重复"
    },
    {
      "action": "点击选择和其他表的校验关系",
      "expected": "可选且/或"
    },
    {
      "action": "点击条件设置",
      "expected": "弹窗形式展示过滤条件，配置完成后自动拼接到过滤条件框中"
    },
    {
      "action": "点击过滤条件下拉框",
      "expected": "支持选择=/>/>=/</<=/!=/in/not in/包含/不包含"
    },
    {
      "action": "点击添加表",
      "expected": "最多添加十张表"
    },
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】，选择一个校验类型为格式类型任务，点击表名",
      "expected": "右侧弹出实例详情\n显示唯一性校验配置详情"
    },
    {
      "action": "对于校验未通过结果点击查看明细",
      "expected": "标题文案修改为：查看\"唯一性校验-多表唯一性判断\"明细\n默认界面显示校验结果，内容为表名、字段、校验字段逻辑"
    },
    {
      "action": "点击查看明细数据",
      "expected": "显示所有不符合规则的表名.字段，最多展示前1000条\n展示下载明细按钮，最多展示10000条"
    }
  ]
} as const;

test.describe("验证前端交互框校验", () => {
  test("C0026 验证前端交互框校验", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
