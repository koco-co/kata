# 提示词残留润色 + 流程脚本化 · 实现计划

> 制定于 2026-06-14，依据当日 `git fetch origin main` 后的最新 main。
> 本计划接续 2026-06-02 的《提示词清通化重构》，不重做已完成的工作。

## 一、背景：这次不是从零

提示词的翻译腔清理已经做过，而且不止一轮，全部合并进 main：

- `92ed99192` → `bb90e0c9a`：整套清通化重构合入（defect-analyze、playwright-automation、case-edit、case-hotfix、case-draft、infra-diagnose、knowledge-curate、rules 与入口、共享 case-qa 逐个改过）。
- 之后又叠了几轮：`f6f322f3f` 母语可读性重写、`d4f5ac2d3` 去 GPT 腔并合并重复、`6790551c8` 深度润色并修过时引用、`904126c52` 契约三段式排版、`7f429baee` 去重 fewshots 与路由规则。

成果之一是 `docs/prompt-style-guide.md`——一份完整的中文提示词风格指南（语言层 L1–L9、结构层 S1–S7、排版层 P1–P5、保真红线 R1–R11、术语对照表、文件分类策略）。

**所以现在的真实状态是：大头已清完，标准已固化成风格指南，剩下的是残留。** 这份计划只做两件旧计划没做完或没做的事。

## 二、目标与范围

两条独立工作线：

- **工作线 A — 残留润色**：用现成的风格指南当唯一标准，扫出并修掉这次残留的翻译腔、结构和重复问题。范围小、风险低。
- **工作线 B — 流程脚本化**：把提示词里大段重述「固定流程 / 固定产物格式 / 固定字段清单」的地方，改成调用脚本生成或交给脚本校验，让提示词不再靠自然语言反复叮嘱。这是旧计划完全没碰的新方向，也是本次最有价值的部分。

**不在范围：**

- 不重写已经干净的文件（风格指南、`rules/repo-readonly.md`、`rules/priority.md` 等）。
- 不改任何行为、阈值、触发条件、路由目标（保真红线 R1）。
- 不动 `workspace/{project}/.kata/repos/**` 源仓库。
- 不碰 `.venv/`、`node_modules/`、测试 fixture 下的 md。

## 三、唯一标准与红线

- **文风标准**：一切改写对照 `docs/prompt-style-guide.md`，不另立标准。
- **保真红线（R1–R11，最高优先）**：行为零丢失、标识符原样、frontmatter 与 `description` 触发词一字不动、格式契约表不许散文化、反例字符串零改写、被测关键字不动、代码块注释默认不动、行数上限不许破、同源重复块要同步。详见风格指南「保真红线」一节。

## 四、取证结论：残留要先甄别，别误伤

这次实测，很多看似「黑话」的命中其实不该动，必须先甄别再改：

| 命中词 | 出现位置 | 结论 |
| --- | --- | --- |
| `落标` | sql-merge-validate 的 `description`、`argument-hint`、`std-check-merge.md` 等 | **业务术语，不动**。它是数据质量域的固定说法，还是 description 触发词（R3）。若新读者看不懂，应去 `_shared/knowledge/` 补一条术语解释，而不是改提示词。 |
| `兜底` | 多在 `cli-essentials.md` 等的**代码注释**里 | **代码注释默认不动（R7）**。散文里的「兜底文案」「兜底路径」属常用口语，可保留或按语境微调，不强改。 |
| `口径` | `sql-merge-validate/references/merge-rules.md`：「标准化口径必须与后端 MergeKey 构造逻辑一致」 | **真要改**。改成「标准化方式」或「标准化规则」。 |
| `收敛` | `§7-self-run.md`：「经 `KATA_ALLURE_RESULTS_DIR` 收敛到…」 | 轻度黑话，改成「统一归到」。标识符 `KATA_ALLURE_RESULTS_DIR` 保留。 |
| `对齐` | `§5-plan-reconcile.md`：「不得强行对齐到文档而盖掉 UI 的事实」 | 轻度黑话，改成「不得为了迁就文档而盖掉 UI 的事实」。 |

**这张表就是工作线 A 的红线注脚**：执行时凡遇业务术语和代码注释，一律先停下判断，宁可不改也不能把域术语改没了。

## 五、工作线 A：残留润色

### A1 全仓重扫一遍（先扫后改）

用风格指南的术语对照表 + 第四节残留词，对范围内 66 个 md（`.claude/skills/**`、`.claude/rules/**`、`.claude/prompt/_shared/**`）加根级入口文档（`CLAUDE.md`、`README.md`、`README-EN.md`、`INSTALL.md`、`CONTRIBUTING.md`）做一次 grep 扫描，把每个命中归三类：**真黑话（改）/ 业务术语（不动）/ 代码注释或反例字符串（不动）**。产出一份临时命中清单（worktree 内，不提交）。

### A2 逐文件改真黑话

只改第 A1 步判定为「真黑话」的命中，每处对照风格指南给改法。已确认要改的至少包括第四节那三处（`口径`、`收敛`、`对齐`）。改写遵守「标准改写八步」（见第七节）。

### A3 复查结构与重复

对历史评估里质量较弱、且本次扫描仍有问题的文件，做一遍结构复查（标题层级是否一致、超长段落是否该拆、同文件内是否仍有近义重复）。**注意：这些文件大多已被前几轮润色过，所以每条结构问题都要在当前文件里复核确认仍然存在，再动手——不要照搬历史评估的行号，行号早已漂移。**

### A4 顺带修正：风格指南行数上限对不上实际 lint

`docs/prompt-style-guide.md` 的 R9 写「`SKILL.md ≤300`」，但实际 lint（`skill-shape.ts`）的上限是 **500**，`phases/references` 是 **260**（`skill-structure.ts`）。把 R9 的数字改成与代码一致，避免后续改写者被错误上限误导。

## 六、工作线 B：流程脚本化

核心判断标准——**能用脚本稳定产出或校验的，就不该靠提示词反复叮嘱**。提示词只说「做什么、什么时候做」，把「具体长什么样」交给脚本。

项目已有一套 CLI（`.claude/scripts/_shared/cli/`，入口 `kata`），里面已经有 `archive-gen`、`xmind-gen`、`handoff`、`cases-lint`、`cases-validate`、`source-ref` 等生成器和校验器。脚本化优先复用它，而不是另起炉灶。

### B1 先盘点，再动手（这步必须先做）

通读范围内提示词，列出所有「用大段自然语言重述固定流程 / 固定产物格式 / 固定字段清单 / 固定校验步骤」的地方，每条标注：在哪个文件、叮嘱的是什么、是否已有对应 CLI。产出一份脚本化候选清单交付前先给用户过目，**不要盘点完直接开改**——脚本化会动到代码和契约，风险高于纯文字润色。

初步候选（执行时以 B1 实际盘点为准）：

| 候选 | 现状 | 方向 |
| --- | --- | --- |
| 产物格式（archive / xmind）在多个 skill 里重述 | 已有 `archive-gen.ts` / `xmind-gen.ts` 生成器 | 提示词瘦身，只说「用 `kata archive-gen` / `kata xmind-gen` 产出」，格式细节指回生成器，不再逐字粘贴 |
| 用例自检清单、必备约束（case-qa、agent 模板） | 已有 `cases-lint.ts` / `cases-validate.ts` 校验器 | 能被 lint 机械校验的检查项，从提示词搬进 lint 规则；提示词只留人工判断项 |
| 交付 handoff 产物 | 已有 `handoff.ts` | 确认提示词是否还在重复 handoff 字段；若有，指回脚本 |
| KATA 工作通知模板（`project-workflow-rules.md`） | 纯文字固定模板 | **高风险，见 B3**。先评估能否单一来源化，未必能脚本化 |
| type/emoji 映射表 | 在 `project-workflow-rules.md`、`CLAUDE.md`、`CONTRIBUTING.md` 重复三处 | 收成单一来源（一处定义，其余指回）；可评估加一条 commit-type 校验 lint |
| infra-diagnose 诊断流程 | 散文写的条件分支 | 评估改成脚本驱动的 runbook；但依赖实时 SSH，未必能全脚本化，至少结构化 |

### B2 实施顺序：先低风险

先做「已有生成器、只需提示词瘦身指回」的候选（纯文字改动，风险等同工作线 A）。再做「需要新增 CLI 子命令或 lint 规则」的候选（动代码，要写测试）。新增脚本一律走 TDD：先写测试，再写实现。

### B3 高风险候选的特别约束

- **KATA 工作通知模板、type/emoji 映射表、命令索引、环境变量名**属于格式契约（R4）。其中**通知模板和 worktree 流程文案被 `runtime-detach.ts` 以子串方式校验**（`check:skills` 会断言这些字面文字存在）。脚本化或单一来源化之前，**必须先抽出 `runtime-detach.ts` 依赖的子串清单当不变量**，确保改完这些字面串仍然存在；否则 `check:skills` 会红。
- 涉及被契约测试断言的字段（`agent-*` 模板的枚举/JSON 字段、`case-qa.md` 顶部被测 HTML 注释），同样先抽清单后改。

## 七、执行流程

### 标准改写八步（每个文件复用）

沿用 2026-06-02 计划验证过的流程：①抽契约清单（worktree 内临时文件，不提交）→ ②标注可改散文区与不可改契约区 → ③对照风格指南改写 → ④拿契约清单逐条回查 → ⑤派一个新的子代理只给它「原文契约清单 + 改写后文件」做对抗复查，找被改丢的项 → ⑥跑验证闸门 → ⑦确认 `description` 触发词未动、正文与触发词同词 → ⑧同源重复块同步改。

### Worktree 与提交

- 主工作树若有改动先快照提交，再 `git worktree add --detach .worktrees/prompt-residual main`；按需 symlink `.kata`。
- 按工作线和文件分批 commit。文字润色用 `refactor: ✨ ...`，新增脚本用 `feat: 🧩 ...`，改文档用 `docs: 📝 ...`，配测试用 `test: 🧪 ...`。标题行英文、≤72 字符。
- 验证通过后记下 worktree HEAD SHA，回主工作树 `git merge --no-ff <sha>`，再跑一次闸门，没问题 `git push origin main`，最后 `git worktree remove`。

## 八、验证闸门

每个任务结束前、合并前各跑一次。真实命令：

```bash
cd <worktree>
bun run check:skills        # skill 契约：frontmatter 白名单 / 行数上限 / 装饰标记 / 同步 + runtime-detach 子串
bun run check               # Biome lint（每任务必跑，别把格式违规攒到最后）
bun test --timeout 30000    # 受影响范围优先，拿不准跑全量；超时已配 30000
```

新增或改动脚本时，额外跑 `bun run type-check`（现在是硬绿闸门，应保持 0 错）。最终合并前跑一次完整 `bun run ci`（= lint + lint:debris + lint:paths + check:skills + 三个 runtime audit + type-check + test + test:plugins + test:tools）做总闸门。

**反向验证**：改完对每个动过的词做反向 grep，确认目标黑话词已清零、且业务术语（如 `落标`）和代码注释里的词原样还在。

## 九、护栏与风险清单

- **别误伤业务术语**：`落标` 等域术语和代码注释里的词不动（见第四节）。
- **`description` 触发词一字不动**（R3/R8），动它有路由风险。
- **行数上限**：`SKILL.md ≤500`、`phases/references ≤260`；贴顶文件改写后 `wc -l` 确认未超。
- **runtime-detach 子串契约**：改 `CLAUDE.md` / `rules/**` 的 worktree 流程文案、KATA 通知模板前，先抽 `runtime-detach.ts` 依赖的子串当不变量（见 B3）。
- **同源重复块同步**：type/emoji 表、Git 流程等多副本，改一处要同步所有副本。
- **格式契约不散文化**（R4）、**反例字符串零改写**（R5）、**被测关键字不动**（R6）。
- **脚本化先盘点后改、走 TDD**：动代码风险高于动文字，候选清单先给用户确认。

## 十、交付物与诚实声明

- 改动的提示词文件清单 + 新增/改动的脚本与测试清单。
- 脚本化候选盘点清单（B1 产出）。
- 风格指南 R9 行数修正。
- 交付时如实写清：已验证范围（闸门命令 + 退出码 + pass/fail/skip 数）与未验证范围（如依赖实时环境、无法在本地跑通的部分）。不得把局部通过说成全量通过。

