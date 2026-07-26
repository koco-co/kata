// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C027",
  "title": "验证规则集引用功能正常(规则包单选)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置监控对象(hive_table)后点击下一步",
      "expected": "进入【新建单表校验规则 ❯ 监控规则】配置页面"
    },
    {
      "action": "检查规则包下拉框数据",
      "expected": "支持选择全部、hive_rulePkg01~04共5个选项"
    },
    {
      "action": "选择hive_rulePkg01规则包, 检查规则类型下拉框数据",
      "expected": "存在级联关系, 仅筛选出该规则包下的规则类型: 完整性校验"
    },
    {
      "action": "勾选【完整性校验】后, 点击【引入】",
      "expected": "成功引入一个【完整性校验】, 配置正确"
    },
    {
      "action": "正常配置调度属性后, 保存",
      "expected": "配置保存成功"
    },
    {
      "action": "重新配置监控规则页面: 选择hive_rulePkg02规则包, 检查规则类型下拉框数据",
      "expected": "筛选结果: 唯一性校验"
    },
    {
      "action": "勾选【唯一性校验】后, 点击【引入】",
      "expected": "成功引入十个【唯一性校验】, 配置正确"
    },
    {
      "action": "正常配置调度属性后, 保存",
      "expected": "配置保存成功"
    },
    {
      "action": "重新配置监控规则页面: 选择hive_rulePkg03规则包, 检查规则类型下拉框数据",
      "expected": "筛选结果: 完整性校验~合理性校验共8项"
    },
    {
      "action": "勾选所有校验类型后, 点击【引入】",
      "expected": "成功引入所有校验类型, 配置正确"
    },
    {
      "action": "正常配置调度属性后, 保存",
      "expected": "配置保存成功"
    }
  ]
} as const;

test.describe("验证规则集引用功能正常(规则包单选)", () => {
  test("C027 验证规则集引用功能正常(规则包单选)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
