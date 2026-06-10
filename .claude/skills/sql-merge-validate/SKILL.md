---
name: sql-merge-validate
description: 拿到数据质量监控任务 monitorId（或落标检查任务 id）+ 合并预期描述，校验该任务所有规则包生成 SQL 的合并正确性（可合并/不可合并/抽样/分区/过滤条件/强弱/多规则包），终端逐包给 PASS/FAIL。发现缺陷转 defect-analyze 生成 bug。仅做静态扫描或写用例请转对应 skill。
argument-hint: "<monitorId | 落标任务 id> + 合并预期"
user-invocable: true
model: sonnet
effort: high
---

# sql-merge-validate

校验数据质量/落标合并 SQL 的合并正确性。一次性 skill，脚本自包含在 `scripts/`，只读、不产文件。

## 工作流

1. **取参（AskUser）**：模式（dq/std）、任务标识、baseUrl+cookie+X-Valid-Project-ID（dq）、
   DB host/port/user/pass（默认 172.16.124.100:30882 / root，口令仅运行期传入、不落仓库），可选预期描述。
2. **跑校验**：`python3 scripts/run.py --mode <dq|std> --task-id <id> --host <h> --password <p> [--base --cookie --project-id]`
   → 得到 verdict JSON。pymysql 缺失时先 `pip install pymysql`。
3. **语义复核**：对照 `references/`，复核占比规则 val/expansion、SUM(CASE WHEN) condition 是否匹配
   function 模板、have_dirty 子检查；白名单分歧等 globalFindings 单列。
4. **终端报告**：逐包 8 维矩阵（①可合并 ②不可合并 ③抽样 ④分区 ⑤过滤 ⑥强弱 ⑦多包 ⑧规则SQL完整性）+ 每个
   FAIL 的证据片段；verdict 的 `customRules` 列出自定义 SQL 规则及 `valid`/`defect`：SQL 残缺（空/空 WHERE/悬空运算符）即 ⑧ FAIL，不放行。不落盘。
5. **bug 联动**：有 FAIL/finding → AskUser「是否转 defect-analyze 生成 bug/推禅道？」（推荐是），
   选是则带证据交接。

## 合并判定规则

- 合并与否以 DB `merge_group_key` 为准：key 非空且组内≥2 即「应合并」，空 key 即「应独立」。
- 文档白名单只用于发现「合并了规格外 function」（如 fn26）的 globalFindings，不左右 ①② 的 PASS/FAIL。
- 抽样：扫抽样表与脏数据 `rand()` 是独立信号；不可合并包可能扫抽样表却无 rand，不据此判 FAIL。

## 路由边界

- 纯静态 diff 扫描 → defect-analyze；写用例 → case-*；UI 自动化 → playwright-automation。
- DB 不可达 → 降级为「SQL 结构事实 + 预期文本」并显式声明无法独立判定实际分组。
- std 落标当前环境无数据，仅结构校验，未端到端验证。

## 知识库

`references/rule-dictionary.md`、`references/merge-rules.md`、`references/std-check-merge.md`。
