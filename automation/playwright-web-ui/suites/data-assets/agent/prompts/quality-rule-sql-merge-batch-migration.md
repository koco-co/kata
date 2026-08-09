# 15862 SQL 合并 Python 自动化批量迁移提示词

这是一份可直接交给其他模型执行的工作说明。它只负责批量实现明确分配的
canonical case，不负责修改共享架构、业务用例语义、私密配置或正式运行证据。
该文件是 data-assets suite 的版本化 agent source，与 executor `agent/guide.md` 同类；
它不是运行产物、临时报告或手工 evidence。

## 使用前填写

- `ASSIGNED_CASE_IDS`：本次独占的 case ID，例如 `C0032,C0035,C0036`。
- `CANONICAL_DECISIONS`：已由用户确认的业务决策。没有确认就写 `none`，不得自行猜测。

## 可复制给执行模型的提示词

你正在 Kata 仓库中迁移 15862「数据质量任务性能优化，规则 SQL 合并」的 Python
Playwright 自动化。先完整读取以下文件，再开始修改：

1. `.claude/skills/automation/SKILL.md`
2. `.claude/skills/automation/workflows/prepare.md`
3. `.claude/skills/automation/workflows/implement.md`
4. `.claude/skills/automation/workflows/deliver.md`
5. `.claude/skills/automation/references/conventions.md`
6. `automation/playwright-web-ui/executor.toml`
7. `automation/playwright-web-ui/agent/guide.md`
8. 本文档
9. canonical YAML：
   `workspace/dataAssets/features/v6.4.11/【15862】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并/cases/数据质量任务性能优化_规则sql合并.yaml`
10. 冻结参考实现：
    `automation/playwright-web-ui/suites/data-assets/tests/e2e/v6.4.11/quality-rule-sql-merge-optimization/c0031_completeness_multi_field_full_scan_all_unpassed_test.py`

### 任务边界

- 只修改 `ASSIGNED_CASE_IDS` 对应的 E2E 文件。
- 不得修改 `domains/data_quality/sql_merge_optimization/`、suite fixture、contract、Skill、
  descriptor、YAML、`config/`、运行产物或其他 case。共享 capability 必须另开任务和提示词，
  且由唯一 owner 处理；本批量提示词不授权共享层写入。
- 不读取 `config/private/`，不输出 Cookie、密码、环境地址或任何 secret。
- 不提交代码，不执行正式环境 `run`，不创建或修补 handoff。
- 不把旧 TS、Doris 分支、`C0037 = C0001 + 36` 等历史实现当作事实源。
- 不写 case ID 分发器、万能 flow、generated runner、skip、xfail、自动重试、
  `time.sleep`、弱断言或假 business record。
- 发现共享能力缺口时停止该 case，返回固定 blocker code、证据和精确解决方案；不得在
  case 文件里绕过。

### 当前冻结状态

- YAML 有 72 条 case，全部保持 `playwright-web-ui: planned`。
- 60 条 write，12 条 read-only。
- 仓库只保留 C0031 作为已类型化骨架参考；其余文件由批量迁移任务按独占范围创建。
- 共享骨架的 unit/contract、Ruff、Pyright 必须先保持绿色。
- C0031 仅证明代码骨架，不代表 live pass。Canonical seed 语义尚待用户确认，因此不得
  将它或其他 case 改为 active。

### 稳定 case 文件名

以下 slug 已冻结；标题变化不得重算文件名，不同 worker 也不得自行发明另一套 slug。

| Case | Target file |
|---|---|
| C0001 | `c0001_mixed_rules_different_filters_strength_multi_batch_test.py` |
| C0002 | `c0002_mixed_rules_different_filters_single_batch_test.py` |
| C0003 | `c0003_mixed_rules_same_filter_strength_multi_batch_test.py` |
| C0004 | `c0004_mixed_rules_same_filter_single_batch_test.py` |
| C0005 | `c0005_partial_merge_sample_partition_test.py` |
| C0006 | `c0006_partial_merge_sample_test.py` |
| C0007 | `c0007_partial_merge_full_scan_test.py` |
| C0008 | `c0008_unmergeable_sample_partition_test.py` |
| C0009 | `c0009_unmergeable_sample_test.py` |
| C0010 | `c0010_unmergeable_full_scan_test.py` |
| C0011 | `c0011_completeness_validity_strength_batch_resize_test.py` |
| C0012 | `c0012_completeness_validity_single_batch_test.py` |
| C0013 | `c0013_completeness_validity_different_filters_test.py` |
| C0014 | `c0014_completeness_validity_string_to_int_test.py` |
| C0015 | `c0015_completeness_validity_same_filter_test.py` |
| C0016 | `c0016_validity_unpassed_detail_download_test.py` |
| C0017 | `c0017_validity_unpassed_quality_report_test.py` |
| C0018 | `c0018_validity_passed_quality_report_test.py` |
| C0019 | `c0019_validity_sample_partition_test.py` |
| C0020 | `c0020_validity_sample_all_unpassed_test.py` |
| C0021 | `c0021_validity_sample_all_passed_test.py` |
| C0022 | `c0022_validity_full_scan_all_unpassed_test.py` |
| C0023 | `c0023_validity_full_scan_all_passed_test.py` |
| C0024 | `c0024_completeness_unpassed_detail_download_test.py` |
| C0025 | `c0025_completeness_unpassed_quality_report_test.py` |
| C0026 | `c0026_completeness_passed_quality_report_test.py` |
| C0027 | `c0027_completeness_multi_field_sample_partition_test.py` |
| C0028 | `c0028_completeness_single_field_sample_partition_test.py` |
| C0029 | `c0029_completeness_multi_field_sample_all_unpassed_test.py` |
| C0030 | `c0030_completeness_multi_field_sample_all_passed_test.py` |
| C0031 | `c0031_completeness_multi_field_full_scan_all_unpassed_test.py` |
| C0032 | `c0032_completeness_multi_field_full_scan_all_passed_test.py` |
| C0033 | `c0033_completeness_single_field_sample_all_unpassed_test.py` |
| C0034 | `c0034_completeness_single_field_sample_all_passed_test.py` |
| C0035 | `c0035_completeness_single_field_full_scan_all_unpassed_test.py` |
| C0036 | `c0036_completeness_single_field_full_scan_all_passed_test.py` |
| C0037 | `c0037_mixed_rules_different_filters_strength_multi_batch_test.py` |
| C0038 | `c0038_mixed_rules_different_filters_single_batch_test.py` |
| C0039 | `c0039_mixed_rules_same_filter_strength_multi_batch_test.py` |
| C0040 | `c0040_mixed_rules_same_filter_single_batch_test.py` |
| C0041 | `c0041_partial_merge_sample_partition_test.py` |
| C0042 | `c0042_partial_merge_sample_test.py` |
| C0043 | `c0043_partial_merge_full_scan_test.py` |
| C0044 | `c0044_unmergeable_sample_partition_test.py` |
| C0045 | `c0045_unmergeable_sample_test.py` |
| C0046 | `c0046_unmergeable_full_scan_test.py` |
| C0047 | `c0047_completeness_validity_strength_multi_batch_test.py` |
| C0048 | `c0048_completeness_validity_single_batch_test.py` |
| C0049 | `c0049_completeness_validity_different_filters_test.py` |
| C0050 | `c0050_completeness_validity_string_to_int_test.py` |
| C0051 | `c0051_completeness_validity_same_filter_test.py` |
| C0052 | `c0052_validity_unpassed_detail_content_test.py` |
| C0053 | `c0053_validity_unpassed_report_content_test.py` |
| C0054 | `c0054_validity_passed_report_content_test.py` |
| C0055 | `c0055_validity_sample_partition_test.py` |
| C0056 | `c0056_validity_sample_all_unpassed_test.py` |
| C0057 | `c0057_validity_sample_all_passed_test.py` |
| C0058 | `c0058_validity_full_scan_all_unpassed_test.py` |
| C0059 | `c0059_validity_full_scan_all_passed_test.py` |
| C0060 | `c0060_completeness_unpassed_detail_content_test.py` |
| C0061 | `c0061_completeness_unpassed_report_details_test.py` |
| C0062 | `c0062_completeness_passed_report_details_test.py` |
| C0063 | `c0063_completeness_multi_field_sample_partition_test.py` |
| C0064 | `c0064_completeness_single_field_sample_partition_test.py` |
| C0065 | `c0065_completeness_multi_field_sample_all_unpassed_test.py` |
| C0066 | `c0066_completeness_multi_field_sample_all_passed_test.py` |
| C0067 | `c0067_completeness_multi_field_full_scan_all_unpassed_test.py` |
| C0068 | `c0068_completeness_multi_field_full_scan_all_passed_test.py` |
| C0069 | `c0069_completeness_single_field_sample_all_unpassed_test.py` |
| C0070 | `c0070_completeness_single_field_sample_all_passed_test.py` |
| C0071 | `c0071_completeness_single_field_full_scan_all_unpassed_test.py` |
| C0072 | `c0072_completeness_single_field_full_scan_all_passed_test.py` |

## 固定目录与职责

```text
automation/playwright-web-ui/suites/data-assets/
├── agent/prompts/
│   └── quality-rule-sql-merge-batch-migration.md
├── src/data_assets_playwright_web_ui/domains/data_quality/sql_merge_optimization/
│   ├── rules.py                 # typed rule/card/package/task contract
│   ├── catalog_builders.py      # rule constructors; no case dispatch
│   ├── *_rule_catalog.py        # reusable immutable rule profiles
│   ├── write_models.py          # source/provisioned scenario boundary
│   ├── sql_seed_model.py        # owned table plan/fingerprint models
│   ├── sql_seed.py              # controlled Batch API setup/cleanup
│   ├── seed_catalog.py          # explicit six-row/two-partition seed intent
│   ├── fixtures.py              # function-scoped seed factory and cleanup
│   ├── rule_contract.py         # submitted/persisted semantic fingerprint
│   ├── rule_*_screen.py         # source-backed UI interactions
│   ├── task_provisioning_screen.py
│   ├── provisioning.py          # rule-set -> task -> MonitorRule IDs
│   ├── api_client.py            # stable API identity readback
│   ├── assertions.py            # SQL topology and safe XLSX oracle
│   ├── result_*.py              # fresh result identity and rule rows
│   ├── report_*.py              # fresh report identity and rule rows
│   └── actions.py               # explicit business journey composition
└── tests/e2e/v6.4.11/quality-rule-sql-merge-optimization/
    └── c0031_completeness_multi_field_full_scan_all_unpassed_test.py
```

共享层负责身份、隔离、API/UI 契约和证据；case 文件只负责显式声明本条 YAML 的规则、
拓扑、结果和步骤。不要把 case 差异重新塞回共享层。

## Write case 固定消费链

每条 write case 必须沿用以下顺序，不得把未持久化的 `WriteScenario` 直接传给 SQL、
result 或 report 断言：

```python
actions.verify_identity(_SCENARIO)
seed_receipt = sql_merge_spark_seed.setup(
    canonical_main_seed_plan(
        case_id=_SCENARIO.case_id,
        ownership_token=automation_identity.collision_token,
    )
)
scenario = _SCENARIO.bind_seed(seed_receipt)
provisioned = actions.provision(scenario)
topology = actions.inspect_sql_topology(provisioned)
drawer, instance_id, finished_at = actions.execute_and_open_fresh_result(provisioned)
readback = actions.verify_result(
    drawer=drawer,
    scenario=provisioned,
    instance_id=instance_id,
    finished_at=finished_at,
)
```

之后写一份真实 business record，至少包含：

- 本次 `instance_id`；
- result readback；
- SQL topology readback；
- seed 的 schema/data/binding fingerprints；
- 每条规则的 `rule_set_record_id` 与 `monitor_rule_id`。

规则集阶段的 child ID 与任务阶段的 MonitorRule ID 不是同一个 ID：

- `rule_set_record_id` 只用于规则集保存回读和溯源；
- `/monitor/add` 后必须调用 `/monitorRule/getRules {monitorId}`；
- SQL `hit_cnt_rule_<id>`、结果和报告只允许使用重新绑定后的 `monitor_rule_id`。

## 每个 case 文件的实现要求

1. 文件名为 `c<4位ID>_<lowercase_english_slug>_test.py`。
2. 只有一个同步 pytest item，并用唯一
   `@automation_case(project_id="data-assets", feature_id="quality-rule-sql-merge-optimization", case_id="Cxxxx")`。
3. `_RULE_SPECS` 必须逐条对应 YAML 规则，不得按相邻 case 或编号镜像推断。
4. `_SCENARIO` 必须显式包含：
   - canonical case/table/task/package identity；
   - `FieldShape`；
   - `SqlTopologyExpectation`；
   - `RuleResultExpectation`；
   - 一个 source `RuleSetSpec`；
   - 一个 `TaskSpec`。
5. 每个 write case 只有一个 canonical source rule package。“规则拼接包”是 task SQL
   batching 参数，不得把 source package 按 10 条拆分。
6. 有效性规则按 `field + strength + shared parent description` 组成父 card；每个
   `standardRules` child 是独立可执行规则，必须保留独立 ID 和 fingerprint。
7. 每个业务 checkpoint 使用 `with step(action=..., expected=..., target=...)`。
8. 只使用 `automation_identity.unique_name` 派生的持久化名称和 attempt-owned table。
9. SQL/result/report 断言必须消费已持久化 ID；禁止 `.first`、固定 `RuleA`、
   `monitor_id=None` 或仅凭表名消歧。
10. 下载必须走已有 bounded XLSX reader，先 stat/ZIP 限制，再流式读取并 finally close。

持久化基名只能来自 `TaskSpec.base_name` 和 `RuleSetSpec.source_packages`；`provision()`
会通过 `materialize_names()` 把它们替换成 attempt-scoped `unique_name`，后续只能使用
`ProvisionedWriteScenario.task_name` 和已回读 package identity。`WriteScenario` 不再接受
重复的 `task_name`/`rule_package_name` 字段，不得在 case 里重新引入。
共享 `open_rule_sql(... monitor_id=None)` 当前是 read-only 未具备 typed donor identity 时的
fail-closed 哨兵，调用必定失败；它不是参考实现。先完成 `READ_ONLY_FIXTURE_IDENTITY_MISSING`
对应的独立共享能力任务，再实现 read-only case。

## 规则与拓扑矩阵

### 复杂规则组

| Cases | 子规则/父卡 | task | topology | compare | report |
|---|---:|---|---|---|---|
| C0001/C0003/C0037/C0039 | 21/21 | batch10, sample50%, dt | 见下 | R14/R17 self-table | required |
| C0002/C0004/C0038/C0040 | 21/20 | batch1, sample50%, dt | 见下 | R14/R17 self-table | required |
| C0005/C0041 | 15/15 | batch1, sample50%, dt | merge(1,2,4,5) | R8/R11 | required |
| C0006/C0042 | 15/15 | batch1, sample50%, all | 同上 | R8/R11 | required |
| C0007/C0043 | 15/15 | batch1, full, all | 同上 | R8/R11 | required |
| C0008/C0044 | 12/12 | batch1, sample50%, dt | all isolated | R2/R5/R8 | required |
| C0009/C0045 | 13/13 | batch1, sample50%, all | all isolated | R2/R6/R9 | required |
| C0010/C0046 | 13/13 | batch1, full, all | all isolated | R2/R6/R9 | required |

- C0001/C0037 merged `(1,5,7,9)`、`(2,10,11)`。
- C0002/C0038 merged `(1,3,5,7,9,11)`、`(2,10)`。
- C0003/C0039 merged `(1,4,5,7,9)`、`(2,3,8,10,11)`；第二组的 R8
  才是 `count(DISTINCT)`。
- C0004/C0040 merged `(1,2,3,4,5,7,8,9,10,11)`；R6、R12-R21 isolated。
- 同一 merged group 共用一个 dirty target；不同 group 与 isolated rule 的 target 必须
  两两不同。

### 完整性 + 有效性组

| Cases | 子规则/父卡 | task | topology | canonical P/F |
|---|---:|---|---|---|
| C0011 | 9/9 | batch4→8, sample50%, dt | 初始弱(1,4,5,6,8)、强(2,3,7,9)；改8后全 isolated | P 1,2,5,6,7; F 3,4,8,9 |
| C0012/C0048 | 9/9 | batch1, sample50%, dt | all merged | 同 C0011 |
| C0013/C0049 | 9/8 | batch10, sample50%, dt | (1,5,6),(2,7),(4,9); 3/8 isolated | 同 C0011 |
| C0014 | 8/5 | batch10, sample50%, dt | all merged | P 1,2,5,6; F 3,4,7,8 |
| C0015/C0051 | 9/8 | batch10, sample50%, dt | all merged | 同 C0011 |
| C0047 | 10/10→9 cards | batch4, sample50%, dt | 初始强/弱两组；改弱后全 merged | P 1,2,5,6,7,10; F 3,4,8,9 |
| C0050 | 8/6 | batch10, sample50%, dt | all merged | 同 C0014 |

C0011 第二阶段只改同一 task 的 batch4→8、再次 inspect 和查看原报告，不再次执行。
C0047 第二阶段原地修改同一规则集强弱、重新引入同一 task，只验证 SQL 下拉 2→1，
不再次执行。

### 有效性 4 规则组

| Cases | task | topology | canonical P/F |
|---|---|---|---|
| C0019/C0055 | batch10, sample50%, dt | all merged | P1,2; F3,4 |
| C0020/C0056 | batch10, sample50%, all | all merged | all F |
| C0021/C0057 | batch10, sample50%, all | all merged | all P |
| C0022/C0058 | batch10, full, all | all merged | all F |
| C0023/C0059 | batch10, full, all | all merged | all P |

R1/R4 是同字段、同强弱、同 parent description 的两个 nested children；四个子规则共三张
父 card。

### 纯完整性 20 条

| Profile | Cases | Shape/rules | Sample | Partition | Canonical P/F |
|---|---|---|---|---|---|
| M6-S-P | C0027/C0063 | multi/6 | 50% | dt | P1,2,5; F3,4,6 |
| S6-S-P | C0028/C0064 | single/6 | 50% | dt | 同上 |
| M5-S-P | C0029/C0030 | multi/5 | 50% | dt | C29 all F; C30 all P |
| M5-F-P | C0031/C0032 | multi/5 | full | dt | C31 all F; C32 all P |
| S5-S-P | C0033/C0034 | single/5 | 50% | dt | C33 all F; C34 all P |
| S5-F-P | C0035/C0036 | single/5 | full | dt | C35 all F; C36 all P |
| M5-S-A | C0065/C0066 | multi/5 | 50% | all | C65 all F; C66 all P |
| M5-F-A | C0067/C0068 | multi/5 | full | all | C67 all F; C68 all P |
| S5-S-A | C0069/C0070 | single/5 | 50% | all | C69 all F; C70 all P |
| S5-F-A | C0071/C0072 | single/5 | full | all | C71 all F; C72 all P |

Seed 采用 `seed_catalog.canonical_main_seed_plan` 的显式六行意图：2026-08-04 为 id1-6，
2026-08-05 复制其余值并将 id 改为7-12。不得在 case 文件中重新拼 SQL 或复制 seed。

### Read-only 12 条

- C0016/C0024/C0052/C0060：task SQL、实例未达标明细下载、报告未达标明细再次下载，
  是两个独立下载 checkpoint。
- C0017/C0053：有效性未达标报告，4 条、0%。
- C0018/C0054：有效性达标报告；canonical 的四条 identity 与“规则数5”冲突。
- C0025/C0061：完整性未达标报告，精确4条、0%。
- C0026/C0062：完整性达标报告，精确4条、100%。
- 在受控 fixture manifest 提供唯一 `monitorId/recordId/reportRecordId` 和 semantic
  fingerprint 前，不得实现成按固定表名、`RuleA` 或首行查找。

## 批次顺序

1. 第一批只做 deterministic/full-scan completeness：
   `C0032,C0035,C0036,C0067,C0068,C0071,C0072`。它们复用 C0031 骨架，但仍需等待
   canonical seed 修正确认后才可 active/live run。
2. 第二批 `C0022,C0023,C0058,C0059`。开始前先由唯一 capability owner 完成
   `RangeAndEnum`、NOT_IN 等 source-backed editor + request/persisted matcher；case worker
   不得自己改共享层。
3. 复杂规则只在对应 detail editor、metadata preflight、compare-table selector、report
   contract 都完成后分组处理。
4. Read-only 只在 typed donor fixture manifest 合同完成后处理。
5. 以下 28 条 50% 抽样固定结果用例保持 planned，直到业务/产品采样契约完成决策：
   `C0011-C0015,C0019-C0021,C0027-C0030,C0033-C0034,C0047-C0051,`
   `C0055-C0057,C0063-C0066,C0069-C0070`。

不同 worker 的 `ASSIGNED_CASE_IDS` 必须互斥。每个 worker 完成离线门禁后，使用 repeatable
`--case` 只 collect 自己的 planned case；主会话负责复核各批结果和最终整体验收。

## 固定 blocker code 与解决方案

| Code | 何时使用 | 解决方案 |
|---|---|---|
| `CANONICAL_SEED_SQL_UNCONFIRMED` | write YAML 仍使用未定义 `user_idx`、`range(1,7)` 和错误 Spark 日期方言 | 用户确认后改为 `range(0,6) AS seed(user_idx)` + `date_add(current_date(), cast(-30+user_idx as int))`，或显式六行 VALUES |
| `SAMPLED_RESULT_NONDETERMINISTIC` | 50% case 固定断言 P/F | 产品提供 stable sample seed/key；或 canonical 改为动态按实际样本推导；或只验采样 topology，不固定 P/F |
| `SQL_MERGE_RULE_EDITOR_CONTRACT_UNSUPPORTED` | 共享 editor 没有 source-backed locator/payload/readback | 单独 capability 任务先补 UI 探测、红测、request fingerprint 和 persisted fingerprint，case 不绕过 |
| `CUSTOM_RULE_TEMPLATE_MISSING` | C0001-C0007 未声明“自定义规则测试”模板 | 补 canonical precondition，或新增受控 template provisioner 并完整回读 scope/family/SQL/parameters |
| `READ_ONLY_FIXTURE_IDENTITY_MISSING` | donor 没有稳定三类 ID/fingerprint | 扩展受控 fixture manifest；不按表名/首行猜 |
| `CANONICAL_RULE_COUNT_CONFLICT` | C0018/C0054 只列4条却期望5 | 业务确认第五条；若不存在，将相关 canonical 期望统一改4 |
| `SQL_MERGE_SOURCE_PACKAGE_LIMIT` | source packages 超过产品上限20 | 修正明确的 source package 设计；不得把 task batching 当 source package |
| `SQL_MERGE_NORMATIVE_CHILD_LIMIT` | 单个有效性父卡 nested children 超过10 | 按真实 field/strength/description 语义拆父卡，并确认不是掩盖业务分组错误 |

不要重新引入错误的“top-level card 最多10条”限制。产品的 10 只约束一个有效性父卡的
`standardRules` children；top-level cards 没有该限制。

## 离线验证

先对分配文件运行 Ruff 和 Pyright，再运行共享骨架测试：

```bash
UV_CACHE_DIR=/private/tmp/kata-uv-cache uv run --locked --no-sync \
  ruff check <ASSIGNED_CASE_FILES>

UV_CACHE_DIR=/private/tmp/kata-uv-cache uv run --locked --no-sync pyright

UV_CACHE_DIR=/private/tmp/kata-uv-cache uv run --locked --no-sync pytest -q \
  automation/playwright-web-ui/suites/data-assets/tests/unit/test_sql_merge_optimization_*.py \
  automation/playwright-web-ui/suites/data-assets/tests/contract/test_sql_merge_optimization_feature.py \
  automation/playwright-web-ui/suites/data-assets/tests/contract/test_package.py
```

如果全量 Pyright 因未分配的旧 shell 失败，不能加 ignore 或缩小声明范围；应由主会话先从
基线删除旧 shell。当前冻结骨架已完成该清理。

Worker 必须对分配范围执行受控 planned collect，例如：

```bash
bun cli/bin/kata.ts automation collect \
  'v6.4.11/【15862】【岚图汽车】【数据资产】数据质量任务性能优化，规则sql合并' \
  --project dataAssets \
  --executor playwright-web-ui \
  --include-planned \
  --case C0032 \
  --case C0035
```

Manifest 必须恰好等于 `ASSIGNED_CASE_IDS`，并保持 canonical YAML 顺序；少、重、额外任意
一种都失败。Collect 只证明 identity 和装配，不证明真实 UI 或业务通过。

当全部 blocker 已解决且 72 个实现都落地时，主会话再执行一次不带 `--case` 的完整
`--include-planned` collect，预期恰好 72 个唯一 item。

## Worker 返回格式

```text
Assigned cases:
Changed files:
Shared files changed: none (required; any non-none result fails scope review)
Per-case YAML coverage:
Rule/card counts:
Topology expectation:
Result/report/business-record expectation:
Offline commands and exit codes:
Remaining blockers: <code + evidence + solution>
Planned collection command, manifest cases and exit code:
YAML state changed: no
Live run/verify: not run
```

Worker 不修改 YAML 状态。主会话按以下顺序交付一个无 blocker 的批次：

1. 复核 worker patch 与 planned 精确 collect；
2. 只将该批对应 implementation 改为 active，并运行 `kata cases lint`；
3. 使用相同 `--case` 集合做 active 精确 collect；
4. 使用相同 `--case` 集合执行正式新 attempt `automation run`；
5. 对该 execution/attempt 执行 `kata runs verify`。

任何一步失败都按产品、实现、数据、权限或环境分类；不得把 collect、静态测试或单独
exit 0 冒充 live pass。
