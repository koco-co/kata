// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0117",
  "title": "验证「完整性校验」-「多表数据行数对比」规则校验(记录数百分比差异)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建监控规则」按钮，进入监控规则配置页面",
      "expected": "进入成功"
    },
    {
      "action": "配置「数据源」「数据库」「数据表」car_compare02等信息，选择【完整性校验】规则",
      "expected": "选择成功，展示【完整性校验】规则配置项"
    },
    {
      "action": "「校验类型」选择「多表数据行数对比」「选择对比表1所属库/对比表/分区」选择car_compare02所在的库/表/分区「强弱规则」选择「弱规则」「规则描述」输入「测试规则」「比对细节设置」输入并选择「记录数百分比差异」「20」",
      "expected": "配置完成"
    },
    {
      "action": "点击「保存」按钮, 点击「下一步」，配置「周期任务」, 点击「完成」按钮",
      "expected": "规则保存成功"
    },
    {
      "action": "立即运行、周期运行",
      "expected": "任务实例状态由「运行中」 > 「校验通过」\n1) 任务实例详情弹窗中存在「校验通过」的标识\n2) 不记录明细数据；\n3) 完整性检验表格中新增键值对: 规则类型-多表数据行数对比"
    },
    {
      "action": "重新编辑规则任务, 记录数百分比差异改为0.1并确定后",
      "expected": "规则编辑成功"
    },
    {
      "action": "保存并重新运行规则任务",
      "expected": "任务实例状态由「运行中」 > 「校验异常」1) 任务实例详情页面显示「校验未通过」标识, 可支持查看明细, 明细按照表和校验字段记录不符合规则的数值2) 完整性检验表格中新增键值对: 规则类型-多表数据内容对比"
    },
    {
      "action": "点击「查看明细」",
      "expected": "展示校验表和所有对比表的表名/分区/所属库/表行数"
    }
  ]
} as const;

test.describe("验证「完整性校验」-「多表数据行数对比」规则校验(记录数百分比差异)", () => {
  test("C0117 验证「完整性校验」-「多表数据行数对比」规则校验(记录数百分比差异)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
