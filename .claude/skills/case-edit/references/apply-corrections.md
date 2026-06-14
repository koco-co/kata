# apply-corrections

## 调用

```
/case-edit apply-corrections <feature_path> <run-id>
```

例：

```
/case-edit apply-corrections workspace/dataAssets/features/v6.4.11/2026-04-dq-builtin-reasonability-field-calc-compare 20260520-1500-run-1
```

## 读取时机

仅在 case-edit 子命令为 `apply-corrections` 时读取本 reference。不得在普通 case-edit 路径中加载。

## 输入工件

- `<feature_path>/runs/<run-id>/case-corrections.md` — pending 清单（必读）
- `<feature_path>/runs/<run-id>/case-corrections-summary.json` — sidecar，必须符合 `CaseCorrections@1` schema（必读，用作 dry-run summary 数据源）
- `<feature_path>/cases/archive.md` — 写回目标
- `<feature_path>/cases/cases.xmind` — 写回同步目标
- 历史 `<feature_path>/runs/*/case-corrections-applied.md` — 去重时的参照（只读）

若任一必读工件缺失，输出 `blocked_by_missing_artifact` 并停止。若 sidecar JSON 不符合 `CaseCorrections@1`，输出 `blocked_by_invalid_summary` 并停止。

## 执行流程

### 第一步：加载并校验

1. 读取 `case-corrections-summary.json`，按 `CaseCorrections@1` 校验。
2. 读取 `case-corrections.md`，解析 frontmatter；若 `status != pending`，提示当前状态并停止（不重复写回）。
3. 解析每条 correction，提取 `id`、`case_ref`、`category`、`confidence`、`doc_claim`、`proposed_change`、`status`、`user_note`、`previously_rejected`。

### 第二步：Dry-run summary

按 category 分组打印计数，每组列出前 3 条样例（C-id、confidence、doc_claim 前 60 字符、当前 status），随后输出三选一提示：

```
Case Corrections — <featureId> / <run-id>
Total: N (approved=A, pending=P, rejected=R, edited=E)

By category:
  ui_text_drift: 4
    C-001 ★★★ "进入【概览】页面..." [pending]
    C-005 ★★  "新建规则集 按钮..."   [approved]
    ...
  business_rule: 2
    ...

请选择：
- proceed  — 落地所有 status=approved 的条目
- edit first — 退出，请先编辑 case-corrections.md 调整 status / proposed_change 后重跑
- abort    — 不做任何改动，把 frontmatter status 改为 aborted
```

通过 AskUserQuestion 获取选择；若交互模式不可用，回退为直接文本提示并等待下一次显式调用。

### 第三步：写回（仅 proceed 分支）

对每条 `status: approved` 的 correction：

1. **定位**：用 `case_ref` 的 cases/archive.md 行号与 `doc_claim` 文本精确匹配。
   - 行号与 doc_claim 均不匹配时跳过，记 `skipped: source_changed`。
2. **去重**：检查 `proposed_change` 目标文本是否已是 cases/archive.md 当前内容；若是则跳过，记 `skipped: already_applied`。
3. **应用 diff**：用 Edit 工具按 `proposed_change` 的 diff 替换 cases/archive.md 对应片段（仅替换 `doc_claim` 那一段文本，不动周围内容）。
4. **xmind 同步**：cases/archive.md 所有 approved 条目改完后，按 `references/archive-xmind-sync.md` 现有契约同步到 `cases/cases.xmind`，并跑现有自检（archive↔xmind 数量/优先级/标题/前置条件/步骤/预期 6 项一致）。
5. **xmind 同步失败**：回滚本轮所有 archive 改动（git restore），把失败原因写入 apply-log，输出 `failed_xmind_sync`。

### 第四步：写 apply-log

写 `<feature_path>/runs/<run-id>/case-corrections-applied.md`：

```markdown
---
feature: <featureId>
run_id: <run-id>  # format: YYYYMMDD-HHmm-<type>-<seq>
applied_at: <ISO 8601>
applied_total: A
skipped_total: S
status: applied
---

# Case Corrections Applied — <featureId> / <run-id>

## C-001 ui_text_drift  status=applied
- case_ref: cases/archive.md#L120 / cases/cases.xmind 节点 ...
- before:
  ```
  进入【概览】页面
  ```
- after:
  ```
  进入【数据质量概览】页面
  ```
- applied_at: 2026-05-20T15:42:11Z

## C-005 ui_text_drift  status=skipped
- case_ref: cases/archive.md#L210 / cases/cases.xmind 节点 ...
- skipped: source_changed
- detail: doc_claim 在 archive 中未找到精确匹配

## C-009 business_rule  status=skipped
- case_ref: cases/archive.md#L340 / cases/cases.xmind 节点 ...
- skipped: already_applied
- detail: proposed_change 的 after 文本已在 archive 当前内容
```

### 第五步：收尾

1. 把 `case-corrections.md` frontmatter 的 `status` 改为 `applied`。
2. 把 `case-corrections-summary.json` 的 `status` 改为 `applied`。
3. 输出本次的 applied / skipped 计数和 apply-log 路径。

abort 分支：跳过 3-4 步，仅把 frontmatter status 改为 `aborted`，写一份最小 apply-log 记录 abort 原因（"user_abort"）。

edit first 分支：什么都不改，直接结束，提示用户编辑后重跑。

## 冲突 / 并发

- doc_claim 不匹配时记 `skipped: source_changed`，不阻塞其他条目。
- proposed_change 已应用时记 `skipped: already_applied`。
- xmind 同步失败时整轮 archive 回滚。
- 同一 feature 多次 apply 时各 run-id 独立 apply-log，互不覆盖。

## 禁止

- 非 proceed 分支不得修改 archive.md。
- 不得跳过 archive-xmind-sync 步骤。
- 不得修改 status 非 `approved` 的条目。
- 不得修改 `cases/test-point-checklist.md`、`metadata.yaml`、`.kata/repos/**`。
- 不得静默丢失任何 correction：每条 approved 必须出现在 apply-log 中（applied 或 skipped 之一）。
- apply-log 之外不得修改原 `case-corrections.md` 的 correction 段落内容（仅可改 frontmatter status）。
