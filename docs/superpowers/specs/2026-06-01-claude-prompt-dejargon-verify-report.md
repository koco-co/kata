# 去黑话重写 · 验证报告（Phase 4）

> 合并回 main 前的最终验收记录。worktree `/Users/poco/Projects/kata/.worktrees/dejargon`，验证时 HEAD = `aa9cd33ec`（report commit 之前）。基线对照见 `2026-06-01-claude-prompt-dejargon-baseline.md`。

## 1. 验证命令与实际结果

| 命令 | 结果 | 与基线对照 |
|---|---|---|
| `bun run check:skills` | exit 0（runtime skill sync / detach / structure 全 passed）| 同基线 exit 0 |
| `bun test` | **1321 pass / 1 skip / 0 fail**，3135 expect()，157 文件，79.19s | 与基线逐项一致（基线 1321/1/0）|
| `bun run test:e2e:fixture` | **3 pass / 0 fail**，5 expect()，2 文件 | case-draft e2e fixture replay 通过 |
| `bun run check`（biome）| exit 0，148 warnings + 7 infos，**No fixes applied** | warnings 为既存基线；改的 2 个 .ts 仅 2 个既存「赋值表达式」warning，无新增 |

biome 说明：148 warnings 是 worktree 内既存代码基线（437 tracked 文件），非本次引入。单独对改动的 `skill-shape.ts`、`skill-structure.ts` 跑 biome 仅 2 个 warning，均为 `skill-structure.ts` 既有正则循环 `while ((m = re.exec(...)))` 的赋值表达式提示——本次只改 `300→500` 常量与注释，未触碰该逻辑，零新增。`bun run check` 退出码 0。

## 2. A 类黑话全树清零

```bash
grep -rnE '沉淀|锚点|心智|抓手|赋能|颗粒度|对齐|收敛|漂移|surface' \
  .claude/skills .claude/rules .claude/prompt CLAUDE.md INSTALL.md --include='*.md' --include='*.yaml'
```
**结果：无输出（exit 1），A 类清零。** 第三方 `.claude/plugins/**`（lanhu）不在范围、不计违规。

替换落地：沉淀→记录/写回、锚点→定位点（locator 保留）、收敛→缩小、漂移→变了、surface→只测页面表层不测业务结果的测试 / 表面通过 / 表层 runner / 弱断言。

## 3. B 类黑话按定调核

```bash
grep -rn '忠实\|闭环' .claude/skills .claude/rules .claude/prompt CLAUDE.md INSTALL.md
```
**结果：无输出（exit 1），零残留。**

- **忠实度**（用户定调 A）：名词/标题统一「步骤与断言的真实性」，动词「真实实现/真实自动化/真实覆盖/真实还原」；关键禁令保留「为什么」（如「只测页面表层证明不了业务结果正确」）。跨 SKILL.md + §1/§3/§6/§9 + quality-reviewer + cli-essentials 全树一致。
- **闭环**：删字——SKILL.md:13「运行归因与修复闭环」→「运行归因与修复」；quality-reviewer 标题「修复闭环」→「修复」。
- **表面通过**：4 处统一（cli-essentials:110 + quality-reviewer:34 + §1:106 + §6:68），同一概念一个词（spec review 曾 flag「弱断言假通过」译法不一致，已统一为「表面通过」）。

## 4. description 对照基线（爆炸半径最大，逐字核）

`git diff main -- .claude/skills/*/SKILL.md` 的 description 行差异：**仅 2 条**，各只差一词。

- **infra-diagnose**：`并沉淀凭据与排查知识` → `并记录凭据与排查知识`。触发词（JDBC / No route to host / 连接超时或被拒 / SSH 登机只读排查并修复）、改走声明（defect-analyze / knowledge-curate）全保留，全长约 100 字符 < 1536。
- **knowledge-curate**：`统一沉淀于 _shared/knowledge/` → `统一记录于 _shared/knowledge/`。触发短语（记一下这个规则 / XX 术语什么意思 / 更新模块知识）、改走声明（case-*/defect-analyze/playwright-automation）全保留，约 127 字符 < 1536。

其余 6 技能 description 与 main 逐字相同（未进 diff）。CLAUDE.md 命令索引 infra-diagnose Summary 列同步「沉淀→记录」。

## 5. SKILL.md 行数上限 300 → 500

`skill-shape.ts` `SKILL_MD_LINE_LIMIT` 与 `skill-structure.ts` `SKILL_MD_CAP` **两处常量都由 300 改为 500**（只改一处是假上调，规则 SK-LEN-SKILL 仍会卡 300）。oversized fixture 扩到 ≥501 行保持 S4 测试有效。lint 测试 81 pass / 0 fail。当前 8 个真实 SKILL.md 最长 74 行，远低于阈值。

## 6. 本次未做项（明确边界）

- **codex 触发链全量迁移与调试**：不在本轮。用户将在 claude 体系改完后单独让 codex 全量迁移调试。本轮无 codex-companion harness。
- **§4 跨 phase / 文件内冗余规则合并**：按用户拍板的「Option A」**不做**。理由：核实全部 12 个 phase 均显式声明隔离阅读（「进入 X 阶段时读本文；…不批量预读 phases/**」），删 phase 内禁令副本改为「见 §6 / 见 SKILL」会使执行该 phase 的 agent 失去 point-of-use 约束 = P0 语义回退。冗余合并属审计标满「吃不准」的高风险低价值尾部，主目标去黑话已全部达成，故仅执行唯一确证安全的清理：删孤儿旧版文件 `references/case-feedback.md`（陈旧 schema、无任何路径引用、与 §12 CaseCorrections@1 冲突）。

## 7. 已验证 / 未验证范围声明

- **已验证**：8 技能 + rules/prompt/CLAUDE.md 全树黑话清零（grep）；结构/frontmatter/行数契约（check:skills）；全量单测 + lint 单测 + case-draft e2e fixture replay；description 逐字对照基线；biome 无新增。
- **未验证（受限于本轮范围）**：真实 LLM 触发链行为（description 改词后的实际路由命中，需 codex/真实会话回放，归后续 codex 阶段）；playwright 在真实浏览器端到端运行（需真实环境与登录态，非本轮去黑话职责）。语义不变以「人工逐条要求/禁止/触发条件对照 + 现有测试」为口径，无 SHA/COUNT 基线测试。
