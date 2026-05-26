# 岚图已上线需求用例整改 — codex prompt-file

本文件给 codex 用，**不是给人读的**。两节：

- 「§A 首次启动 prompt」：第一次跑或重新对齐时，复制 §A 全部内容给 codex（`codex task` 或 `codex-companion --prompt-file`）。
- 「§B 阶段续接 prompt」：完成一个阶段后用 `codex task --resume-last`，复制对应小节即可。

每节都是独立 XML-tagged prompt，按 [GPT-5.4 prompting](../../../.claude/plugins/cache/openai-codex-plugin/codex/1.0.4/skills/gpt-5-4-prompting/SKILL.md) 块约定。

---

## §A 首次启动 prompt

```xml
<task>
你要在 git worktree `lt-dq-launched-reqs-case-cleanup` 中整改 1216 条已上线需求用例，
目标文件 `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md` 及同名 .xmind。

当前 worktree 已有完整 design、plan、audit、cheatsheet。**先读这 4 份再行动**：

1. `docs/superpowers/specs/2026-05-26-lt-dq-launched-reqs-design.md` — 业务边界、SoT 索引
2. `docs/superpowers/plans/2026-05-26-lt-dq-launched-reqs-case-cleanup.md` — 原始实施计划
3. `docs/superpowers/specs/2026-05-26-lt-dq-launched-reqs-format-cheatsheet.md` — **核心执行手册**，13 条规则 + 修复模板 + 4 阶段节奏
4. `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs` — 13 条机器规则的实现

任务终态：
- audit `--strict` 退出码 = 0（当前 3451 条违规 → 0）
- XMind 与 Markdown 逐字段一致（用例数、优先级、前置、步骤、预期）
- 所有用例字段/按钮/接口可追溯到 `.kata/repos/` 源码或 `_shared/knowledge/` 知识库
- v6.4.2~v6.4.6 的 DQ 规则任务类用例已补「规则集 → 规则任务」前置链
- 每个修复阶段都有独立 commit，commit message 标明影响的规则名和违规数变化
</task>

<action_safety>
**可改路径（仅这些）**：
- `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md`
- `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.xmind`
- `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/**`（仅扩规则，不删既有规则）
- `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/tests/**`
- `docs/superpowers/{specs,plans}/2026-05-26-lt-dq-launched-reqs-*.md`（记录进展用）
- `docs/superpowers/plans/.process/**`（如有，作为机器层产物）

**禁动路径**：
- `.agents/**`、`.ai/**`、`.claude/**`（这些是 kata runtime 投影，整改不需要碰）
- `engine/**`、`tools/**`
- `workspace/dataAssets/features/2099-01-lt-dq-main-flow/**`（另一个 feature，不在本次范围）
- 其它任何 feature 目录
- `.kata/**`（这是 symlink 到 main，只读）

若发现需要改这些路径，停下来汇报，不得自行修改。
</action_safety>

<missing_context_gating>
**开始任何文件改动前，先验证 `.kata` symlink 可达**：

```bash
ls workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src | head -3
ls workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json
```

两条都成功才能开始。任意一条失败 → 立即停下汇报，**不得继续猜字段名**。
失败修复方法（一次性 setup，需用户授权）：

```bash
ln -s /Users/poco/Projects/kata/workspace/dataAssets/.kata workspace/dataAssets/.kata
echo "workspace/dataAssets/.kata" >> /Users/poco/Projects/kata/.git/info/exclude
```

任何字段名、按钮名、菜单路径、接口路径写入用例前，必须能在以下来源**真实查到**：
- 前端源码：`workspace/dataAssets/.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src`
- 后端源码：`workspace/dataAssets/.kata/repos/customltem/dt-center-assets`
- DOM 知识库：`workspace/dataAssets/_shared/knowledge/sites/shuzhan63-test-ltqc.k8s.dtstack.cn/dom-dataAssets.md`
- 模块知识库：`workspace/dataAssets/_shared/knowledge/modules/data-quality.md`
- 实时 DOM：playwright + `workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json`

找不到证据时：在前置条件 `/* ... */` 注释或 `> 待确认` blockquote 写明，**禁止猜测**。
</missing_context_gating>

<grounding_rules>
- 任何接口路径（如 `/dassets/v1/scheduleJob/affectCountStatistic`）必须能 grep 到对应后端 controller 路由代码，commit message 引用 repo.line。
- 字段名（如「规则名称」「调度周期」「超时时间」）必须在前端 i18n 文件、组件 label 或 DOM 知识库出现。
- 枚举值（如「立即生成」「手动触发」「校验通过」）必须能 grep 到 enum 或 i18n。
- 不得用模板话术当预期断言（cheatsheet R2 列出了 4 句禁用模板）。
- 不得宣称用例在真实平台执行通过，只能宣称「audit 通过 + 引用证据完整」。
</grounding_rules>

<completeness_contract>
按 cheatsheet「整改执行节奏」4 阶段顺序执行，**不要跳阶段**：

- 阶段 1（机械批量）：R6 → R1 → R3 → R4
- 阶段 2（上下文）：R5 → R2 → R11
- 阶段 3（证据）：R7 → R12 → R13 → R9
- 阶段 4（收口）：人工抽样 + XMind 同步 + audit --strict 0 违规

每个阶段完成后：
1. 跑 audit 看违规数下降
2. commit 提交
3. **停下来报告进度**（见 structured_output_contract），等待用户 ack 后再进下一阶段

完成全部 4 阶段且 audit --strict 退出码 = 0 才算完成。
</completeness_contract>

<verification_loop>
每个 rule 修复跑完后立即 verify：

```bash
bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/audit-launched-reqs-cases.mjs \
    --json-out workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/results/audit-after-R{N}.json
```

校验规则：
- 目标 rule 的违规数必须 = 0（如修完 R1 后 `bracket_button_misuse` 必须 0）
- 其它 rule 的违规数必须 **单调下降或持平**，不得反弹（修一类不能让另一类增加）
- 出现反弹立即 `git checkout` 该次改动，定位脚本错误，修复后再跑

如果改动是机械脚本（如批量替换），优先放 `scripts/` 下作为可复现脚本，commit 时一并提交。
</verification_loop>

<default_follow_through_policy>
- 默认走 cheatsheet 给的修复模板，遇到模板不覆盖的边缘情况选择最保守的写法。
- 路径疑问 → 用 grep 验证后选最接近的，记 commit message。
- 证据冲突（前端源码 vs DOM）→ 优先 live DOM，前端源码作佐证。
- 不要为「完美」反复重写——audit 0 违规 + 5 条抽样手 review 通过即可。
- 不要扩范围（如「顺手优化 sample.md」「补一个新 feature 目录」），任何 scope creep 必须停下问用户。
</default_follow_through_policy>

<structured_output_contract>
每个阶段完成后输出**一段** Markdown 报告（不要长篇大论），格式严格如下：

```
## 阶段 N 完成报告

- **本阶段处理规则**：R1, R3, R4, R6（举例）
- **审计违规数**：3451 → XXX（按 rule 列表展开）
- **本阶段新增 commit**：
  - `abc1234` test: 🧪 ...
  - `def5678` docs: 🧱 ...
- **改动文件统计**：md +XXX -XXX | xmind 二进制 | scripts +XXX
- **未解决遗留**：N 条（具体哪几条，引用 case index）
- **下一阶段开始前需用户确认**：[是 / 否]，原因：...
```

报告之外不要展开自然语言叙事。如果需要详细分析，写到 `docs/superpowers/plans/.process/phase-N-notes.md`，报告里只放路径。
</structured_output_contract>

<progress_updates>
长时间运行的批量修复（如 R1 1634 处替换）每处理完一个版本输出一行：
- `[phase 1 / R1] v6.4.6 done, 318 → 0, audit total 3451 → 3133`
不要在中途汇报哲学思考、心路历程或假设。
</progress_updates>

<tool_persistence_rules>
- 一次 grep / 一次 read 不够时继续多次工具调用，不要凭印象答。
- 对每条用例的字段验证：至少跑 1 次 frontend grep + 1 次 dom-knowledge grep，两源至少一处能查到才算通过。
- audit 报错信息（如 `expected_numbering`）即真实数据，不要质疑 audit 本身。
- audit 脚本如有 false positive 嫌疑：先抽样 10 条对照实际 markdown，确实 fp 才修脚本；优先修数据。
</tool_persistence_rules>

**立刻开始**：先读上面 4 份文档；读完后跑 audit 拿当前基线；按上面顺序进入阶段 1。
```

---

## §B 阶段续接 prompt

完成一个阶段后用 `codex task --resume-last`，只发对应 delta 指令。所有约束（action_safety、grounding_rules 等）从 §A 继承。

### §B.1 进入阶段 1（机械批量）

```xml
<task>
进入阶段 1：机械批量整改。按以下顺序在同一 commit-batch 里完成：

R6 → R1 → R3 → R4

每个 rule 完成后立即跑 audit 验证目标 rule 违规数 = 0、其它 rule 未反弹。
建议放 `scripts/cleanup-launched-reqs-cases.mjs` 增量扩展函数（如 `fixBracketButtonMisuse()`），不要写一次性脚本。

每个 rule 一个 commit。本阶段预计减少 ~2400 条违规（按基线估算）。
完成后按 §A structured_output_contract 报告进度，等用户 ack。
</task>
```

### §B.2 进入阶段 2（上下文）

```xml
<task>
进入阶段 2：需上下文的整改。按以下顺序：

R5（步骤拆行）→ R2（弱预期）→ R11（前置条件注释结构）

R5 需要按页面拆行表格行（一行表格 = 一个交互页面阶段），可能需要拆现有的合并 cell 成 2~3 行。
R2 需要逐条用例重写预期，**必须绑定该步操作的对象（按钮名、字段名、详情回显值）**，禁用 cheatsheet R2 列出的 4 句模板话术。
R11 重写每条用例的 `/* */` 块结构。

按版本分批跑：先 v6.4.8（违规最集中的弱预期场景）→ v6.4.10 → v6.4.6 → v6.4.3 → v6.4.4 → v6.4.5 → v6.4.2。
每个版本一个 commit。
完成后按 §A structured_output_contract 报告。
</task>
```

### §B.3 进入阶段 3（证据驱动）

```xml
<task>
进入阶段 3：证据驱动的整改。按以下顺序：

R7（curl 改 UI 入口）→ R12（建表单字段基线 + audit 扩规则）→ R13（v6.4.2~v6.4.6 补规则集链路）→ R9（DQ 标题三段式）

R12 是本阶段关键：
1. grep 全文 DQ 类用例提取所有字段名（约 50~80 个）
2. 逐个查 `.kata/repos/customltem/dt-insight-studio/apps/dataAssets/src` 的 i18n / label
3. 输出 `workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/tests/fixtures/field-baseline.json`，格式：`{ "字段名": [{ "type": "frontend_i18n", "path": "...", "line": N }, ...] }`
4. 在 audit 加 `field_not_in_baseline` 规则（仅在 DQ 类用例上检查）

R13 按 cheatsheet R13 的 6 步链路重写 v6.4.2~v6.4.6 的 DQ 用例，每条用例先看历史 diff 找回原始业务目的，再按链路重写。

按 rule 分 commit。
完成后按 §A structured_output_contract 报告。
</task>
```

### §B.4 进入阶段 4（收口）

```xml
<task>
进入阶段 4：收口验证。

1. 随机抽 7 个版本各 5 条用例（共 35 条），用 playwright + session-ltqc-local.json 登录目标环境，按用例步骤实际走一遍，记录哪些步骤跑不通、哪些字段实际不存在。
   产物：`docs/superpowers/plans/.process/phase-4-walkthrough.md`
2. 跑 `bun workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/scripts/build-delivery-xmind.mjs` 重新生成 XMind。
3. 跑 audit `--strict`，退出码必须 = 0。
4. 跑 case-qa 自检（参考 `.ai/core/rules/case-qa.md` 一致性维度）。
5. 输出最终交付报告 `docs/superpowers/plans/2026-05-26-lt-dq-launched-reqs-case-cleanup-deliverable.md`，包含：
   - audit 0 违规截图
   - XMind 与 Markdown 一致性自检结果
   - 抽样 walkthrough 通过率
   - 未解决遗留清单（若有）
   - 待用户人工 review 的 high-risk 用例索引（如证据冲突项）

完成后按 §A structured_output_contract 报告。**不要自行 merge 到 main**，等用户决策。
</task>
```

---

## 使用建议

1. **首次启动**：`codex task --prompt-file <此文件的 §A 内容>`
2. **每个阶段完成后**：先看 codex 的进度报告 → 抽 5 条用例对照 audit 报告人工 review → 同意进下阶段 → 复制 §B 对应小节，`codex task --resume-last`
3. **codex 卡住时**：复制 §A 重启对齐，不要无头绪续接（记忆 [[feedback-codex-dispatch]]：codex 长任务用 prompt-file 直发更稳）
4. **不要修改 cheatsheet 来"提示" codex 怎么改某条规则**——cheatsheet 是规则的 SSOT 投影；codex 偏差应该用本 prompt-file 的 grounding_rules 加约束来收敛。
