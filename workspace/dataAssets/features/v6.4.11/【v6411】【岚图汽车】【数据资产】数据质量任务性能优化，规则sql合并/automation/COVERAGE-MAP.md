# 自动化覆盖映射 — v6411 数据质量任务 SQL 合并

> 需求 72 条用例（P0 17 / P1 39 / P2 16），本表映射每条到自动化脚本或排除原因。
> 环境 ltqc，数据源 SparkThrift2.x（pw_test.test_info_1~8）。截至 2026-06-23。

## 已自动化（read-only contract — full.spec.ts 全绿 12 tests）

| 脚本 | 覆盖维度 | 对应 archive 用例（配置/报告维度） |
| ---- | -------- | --------------------------------- |
| t01 | test_info_1 规则集 / 规则包 / 规则任务配置 | 可合并+不可合并 多规则包配置、规则任务绑定表/分区/数据源 |
| t03 | test_info_1 已生成质量报告可查询 | 质量报告正确（查询入口层） |
| t05 | test_info_1 规则集 6 个规则包结构 | 多/单规则包、完整性多字段通过/不通过、有效性全通过/不通过 |
| t06 | 完整性校验包可合并候选组识别 | 完整性可合并（archive 步骤38「同过滤同强弱合并」前提） |
| t07 | 质量报告分类（有效性 / 完整性通过·不通过 / 可合并） | 有效性校验、完整性校验 质量报告正确 |
| t08 | test_info_2~8 一表一集配置维度（7 场景） | 不同/相同过滤条件、单/多规则包、不可合并部分规则、完整性+有效性组合、string强转int、强弱规则 |

**覆盖性质**：验证 SQL 合并的「配置前提」（规则按 function / filter / strength 的可合并候选分组）
与「报告产出」。这是 archive「校验功能」「质量报告正确」用例中**环境可 read-only 真实验证**的维度。

## 环境受阻排除（无法真实自动化）

| 排除项 | 数量 | 原因 | 证据 |
| ------ | ---- | ---- | ---- |
| `doris3.x` section 全部 | 35 | 环境无 doris 版 test_info_1 规则集（盘点 70 个规则集，对象表 test_info_1~8 全为 SparkThrift2.x；环境的 Doris3.x 数据源规则集是 vehicle_info_part10 等其它表，非 archive 用例对象） | `runs/preflight-02/.../inventory-result.json` |
| 立即执行 E2E（t04） | 1 | `immediatelyExecuted` 同步接口 nginx 5min 504、无有效实例落库 | `runs/preflight-02/.../execute-signal-compare.json` |
| 校验实例详情（t02） | 1 | `monitorRecord` 列表 4 种查询全 count=0（执行链路不落库） | `runs/preflight-02/.../execute-signal-compare.json` |
| 「查看明细功能」用例 | 4 | 依赖校验实例详情（同上受阻） | 同上 |
| 各「校验功能」用例的**运行结果维度** | — | 运行时合并 SQL 文本、子规则通过/不通过、merge_group_key 在校验实例详情里（受阻） | 同上 |

## 未覆盖的运行时验证（需其它手段）

- **运行时合并 SQL 文本 / merge_group_key**：用 `sql-merge-validate` skill + DB 只读凭据直接查库验证。
- **立即执行后的实例结果**：待环境后端 504 / 实例不落库修复后，t02、t04 可纳入 full.spec.ts。

## 小结

- 真实自动化：8 个脚本文件、full.spec.ts 12 个 test，覆盖 SQL 合并的**配置层 + 报告层**。
- 环境受阻排除：doris 35 + 立即执行/实例详情/明细类 + 各用例运行结果维度。
- 边界诚实：read-only contract 验证合并的**输入配置与报告输出**，**不含**运行时生成的合并 SQL 文本本身。
