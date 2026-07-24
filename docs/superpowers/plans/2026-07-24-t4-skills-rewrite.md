# T4 六个 Skill 重写实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 8 个过度工程化的 Skill 重写为 6 个简洁 Skill(case / ui-automation / defect-analyze / infra-diagnose / knowledge / workspace),Claude 端与 Codex 端各自原生、独立维护,业务判断一致。

**Architecture:** 先写 Claude 端(`.claude/skills/`),按官方 prompt 规范(<200 行、讲 why、无黑话、无事故化石、机械约束交 CLI);再按业务等价写 Codex 端(`.agents/skills/`,真实目录非 symlink);用相同业务 fixture 验证两端产出语义等价。

**Tech Stack:** Markdown(YAML frontmatter)、kata CLI(T1/T3 产物)、业务 fixture 测试。

## Global Constraints

- SKILL.md < 200 行;规则只写一次;无黑话;无事故化石(踩坑进 knowledge/)。
- 不固定模型名/subagent 数量/阶段数;不写不存在的工具名。
- 完成标准在每个 skill 只写一次;机械约束交 CLI(lint/validate/verify)。
- 双端独立维护,不 symlink、不共享 _shared prompt、不建第三套合同。
- description 含 what + when(触发机制);子代理 prompt 放 prompts/,纯中文对话。
- 遵循 worktree 工作流,不自动 push。

---

### Task 0: worktree + 清理旧 skill 与共享层

**Files:**
- Delete: `.claude/skills/`(8 个旧 skill)、`.claude/prompt/_shared/`、`.claude/rules/`(4 个并入 CLAUDE.md,comments 并入 CONTRIBUTING)、`.agents/skills/using-kata-codex`、全部 `.agents/skills/*` symlink、`.claude/hooks/`(2 个)、`.claude/settings.json` 的 hooks 注册

- [ ] **Step 1: 创建 worktree**
```bash
cd /Users/poco/Projects/kata
git worktree add -b codex/t4-skills-rewrite .worktrees/t4-skills-rewrite main
cd .worktrees/t4-skills-rewrite && bun install
```
- [ ] **Step 2: 把仍需保留的 rules 内容并入 CLAUDE.md / AGENTS.md(worktree、改后即测、不泄密、不把未执行写成通过);comments 规范并入 CONTRIBUTING.md**
- [ ] **Step 3: 删旧 skill/_shared prompt/rules/hooks/symlink/using-kata-codex**
```bash
git rm -r .claude/skills .claude/prompt .claude/rules .claude/hooks .agents/skills/using-kata-codex
# 逐个删 symlink
find .agents/skills -type l -delete
```
- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "refactor(skills): remove legacy skills, shared prompts, rules, hooks"
```

---

### Task 1: case(Claude 端)——三合一

**Files:**
- Create: `.claude/skills/case/SKILL.md`
- Create: `.claude/skills/case/workflows/draft.md`、`edit.md`、`hotfix.md`
- Create: `.claude/skills/case/prompts/worker.md`
- Create: `.claude/skills/case/examples/cases.yaml`
- Create: `.claude/skills/case/checklists/review.md`

**内容要点**(SKILL.md < 200 行):
- frontmatter:name/case,description 含 what+when(需求源→起草 / 用例文件→编辑 / bug→hotfix 三种入口分流)。
- 路由:按输入类型分流到 workflows/{draft,edit,hotfix}。
- 完成标准(写一次):`需求名.yaml` + `需求名.xmind` 产出,`kata cases lint/validate/verify` 全过;阻塞时只出草稿并说清缺口。
- 产物路径:声明「写 featureDir/cases/」,具体路径由 `kata features resolve` 返回,不自拼。
- 无 Envelope/双 reviewer 协议;worker.md 为纯中文子代理说明;review.md 为交付前自审清单(合并原 spec+quality 双份)。

- [ ] **Step 1: 起草 SKILL.md 与 workflows(参照设计第 6-10 节)**
- [ ] **Step 2: 自检:<200 行、无黑话词表(证据分层/外部事实/权威细则/完成门禁/落盘/兜底/回读/移交/Envelope/工件契约)**
```bash
wc -l .claude/skills/case/SKILL.md
grep -iE "证据分层|外部事实|权威细则|完成门禁|落盘|兜底|回读|移交|Envelope|工件契约" .claude/skills/case/**/*.md && echo "FOUND jargon" || echo "clean"
```
- [ ] **Step 3: Commit**
```bash
git add .claude/skills/case && git commit -m "feat(skills): rewrite case skill (claude)"
```

---

### Task 2: ui-automation(Claude 端)——12 phase → 3 阶段

**Files:**
- Create: `.claude/skills/ui-automation/SKILL.md`
- Create: `.claude/skills/ui-automation/workflows/{prepare,implement,deliver}.md`
- Create: `.claude/skills/ui-automation/references/{playwright-api,conventions}.md`
- Create: `.claude/skills/ui-automation/prompts/worker.md`

**内容要点**:
- 3 阶段:准备(normalize+preflight)→ 实现(plan+probe+generate+修复,失败分类表一节)→ 交付(lint+handoff+验收命令)。
- 完成标准(写一次):full.spec 通过 + run 目录有 Allure + 平台产生核心业务记录;只读脚本须用户明确要求。
- 删:固定模型名、固定 subagent 数量、§12 case-feedback(移入 case)、双 reviewer、可追溯头 lint 依赖、事故化石(probe4.mjs 点名、assistant message 单 content 微管理)。
- 岚图专项条款迁入 knowledge/。

- [ ] **Step 1: 起草 SKILL.md 与三阶段 workflows**
- [ ] **Step 2: 自检行数与黑话**
```bash
wc -l .claude/skills/ui-automation/SKILL.md
grep -iE "probe4|blocked_by_|opus 子代理|sonnet 子代理|BlockedEnvelope" .claude/skills/ui-automation/**/*.md && echo FOUND || echo clean
```
- [ ] **Step 3: Commit**
```bash
git add .claude/skills/ui-automation && git commit -m "feat(skills): rewrite ui-automation skill (claude)"
```

---

### Task 3: defect-analyze / infra-diagnose / knowledge / workspace(Claude 端)

**Files:**
- Create: `.claude/skills/defect-analyze/SKILL.md`(+ 简洁报告模板,降级 850 行 HTML)
- Create: `.claude/skills/infra-diagnose/SKILL.md` + `references/playbook.md`
- Create: `.claude/skills/knowledge/SKILL.md`(含自动闭环说明,细节在 T5)
- Create: `.claude/skills/workspace/SKILL.md`(骨架管理,帮助归 CLI)

- [ ] **Step 1: 各起草 SKILL.md(均 < 200 行,多数 < 60)**
- [ ] **Step 2: 自检黑话与重复**
- [ ] **Step 3: Commit**
```bash
git add .claude/skills && git commit -m "feat(skills): rewrite remaining claude skills"
```

---

### Task 4: 更新 CLAUDE.md 命令索引与路由表

**Files:**
- Modify: `CLAUDE.md`(命令索引 8→6;路由规则按新 skill 名)

- [ ] **Step 1: 更新命令索引表与路由规则(case-draft/edit/hotfix→case;playwright-automation→ui-automation;删 workspace-manage 帮助描述)**
- [ ] **Step 2: 更新根 README 中失实描述(删「Codex 原生目录」谎言,改双端独立维护)**
- [ ] **Step 3: Commit**
```bash
git add CLAUDE.md README.md && git commit -m "docs: update command index for 6 skills"
```

---

### Task 5: Codex 端六个原生 Skill

**Files:**
- Create: `.agents/skills/{case,ui-automation,defect-analyze,infra-diagnose,knowledge,workspace}/SKILL.md`(真实目录,非 symlink)
- Modify: `AGENTS.md`(全仓通用规则,双端一致的业务判断)

**内容要点**:
- 按 GPT-5.6 指南重写:目标 + 完成标准 + 少量约束;歧义时「问 1-3 个精确问题或给 2-3 种解释」;工具描述 1-2 句。
- 与 Claude 端业务判断一致(输入/输出/落点/状态/完成标准),表达与工具调用方式可不同。
- 不写固定模型名/subagent 数量/不存在的工具名。

- [ ] **Step 1: 逐个起草 6 个 SKILL.md(参考 Claude 端业务逻辑,GPT 表达)**
- [ ] **Step 2: 自检无 Claude 专属词(AskUserQuestion/TodoWrite)**
```bash
grep -riE "AskUserQuestion|TodoWrite" .agents/skills && echo FOUND || echo clean
```
- [ ] **Step 3: Commit**
```bash
git add .agents/skills AGENTS.md && git commit -m "feat(skills): add native codex skills"
```

---

### Task 6: 双端业务等价 fixture 测试 + 收尾

**Files:**
- Create: `tests/skills/fixtures/`(同一需求源 fixture)
- Create: `tests/skills/behavior-parity.test.ts`

**Interfaces:**
- Produces: `assertParity(input: Fixture): void` — 同一输入,校验两端 skill 声明的产物路径/正式源/完成标准一致(读 SKILL.md 提取声明,而非逐字比对)。

- [ ] **Step 1: 写 fixture 与 parity 测试(校验两端对同一输入声明相同产物落点与正式源 cases.yaml)**
- [ ] **Step 2: 跑测试**
```bash
bun test tests/skills
```
- [ ] **Step 3: 全量测试 + lint + type-check**
```bash
bun test && bun run check && bun run type-check
```
- [ ] **Step 4: 汇报用户,确认后合并**
```bash
cd /Users/poco/Projects/kata
git merge --no-ff codex/t4-skills-rewrite
git worktree remove .worktrees/t4-skills-rewrite && git branch -d codex/t4-skills-rewrite
```
不 push。

---

## Self-Review 记录

- **Spec coverage**:设计第 6-10 节(6 skill 职责/输入/输出/路径/prompt 规范)、第 11 节(双端独立)、第 19 节(删 _shared prompt/symlink/using-kata-codex/rules/hooks)。覆盖。
- **占位符**:Skill 正文是写作产物,计划给的是结构、约束、自检命令而非逐字 prompt——这符合「计划给工程师所需内容」,且 prompt 正文本身需在执行时按业务打磨;自检命令(grep 黑话、行数)是可执行的验证,不构成占位。
- **类型一致**:6 个 skill 名(case/ui-automation/defect-analyze/infra-diagnose/knowledge/workspace)与设计第 6 节一致;`assertParity` 在 Task 6 定义并被该 task 使用。
- **依赖**:依赖 T1(CLI)、T3(cases.yaml 作为正式源写进 skill);T5 的 knowledge 自动闭环细节在本计划 Task 3 只留接口说明。
