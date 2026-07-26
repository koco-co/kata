<!-- 填写示例（脱敏虚构，展示格式与详细程度，不是真实交付）。 -->

# 自动化交付 handoff：【v6411】【岚图汽车】【数据质量】单表校验规则支持枚举值个数统计

- run-id：20260722-143051-a7f3
- 环境：ltqc-local
- 日期：2026-07-22

## 用例结果

（每条用例一行：状态（通过 / 排除）与证据——Allure 结果、关键截图、平台业务记录的名称或 ID。）

| 用例 | 状态 | 证据 |
|------|------|------|
| C001 新建规则可选「枚举值个数」并按阈值告警 | 通过 | allure-results/suite-01.json；截图 c01-threshold.png；平台规则记录 AUTO_20260722_rule01 |
| C002 空表按 0 参与比较不报错 | 排除 | 见「排除说明」 |
| C003 阈值填负数禁止提交 | 通过 | allure-results/suite-03.json；平台无新增记录（表单拦截） |

## 排除说明

（被排除用例的原因类别与阻塞点；没有排除的用例就写「无」。）

- C002：产品 bug——空表运行触发 NPE（见 analyses/bug-report/202607/enum-count-null.md），停止该用例，未弱化断言；待修复后回补。

## 书面用例与真实 UI 差异

（实现阶段发现的书面用例与真实 UI 不一致处，供 test-case 侧修正用例源；无差异写「无」。）

- C001 步骤 2：书面用例写「统计函数下拉含 4 项」，真实 UI 的下拉顺序为「行数、空值个数、枚举值个数、重复值个数」，枚举值个数为第 3 项；用例源未写顺序，无需修正，仅备注。

## 验收

（重跑 full 的命令；已验证与未验证范围，逐条对照 SKILL.md 完成标准说明达成情况。）

重跑命令：

```bash
kata runs exec <feature-id> --project dataAssets -- kata env run ltqc-local -- bunx playwright test automation/tests/runners/full.spec.ts
```

- full.spec.ts 全量通过：达成（2 通过 / 1 排除）。
- runs/20260722-143051-a7f3/ 下有 Allure 结果：达成。
- 平台产生核心业务记录：达成（AUTO_20260722_rule01）。
- 未验证范围：C002 空表场景（产品 bug 阻塞）；负数边界以外的阈值边界值未覆盖。
