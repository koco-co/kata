# T6 测试与文档清理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把测试从 152 个砍到 ~60 个真行为测试(删除钉 prompt 措辞/结构同构/迁移验尸的),重整 CI(删执念 job),清理历史文档,让测试/源码比 < 1:1。

**Architecture:** 按「保留真行为、删措辞与化石」分类处置测试;lint 砍到防真实错误的 ~5 条;CI 合并 lint 步骤、删 gitignore-no-bloat 与 features-index;历史文档删除(git 兜底);更新 README/INSTALL 使与现实一致。

**Tech Stack:** Bun test、biome、GitHub Actions。

## Global Constraints

- 删除的测试属于三类:prompt 措辞断言、结构同构、已完成迁移的防回归快照。
- 保留的测试必须是「给定输入、断言输出/退出码」的真行为测试。
- lint 只留防真实错误的(feature-root-layout、tests-layout、hardcode-path、env/session 安全、weak-assertion)。
- CI 删 gitignore-no-bloat、features-index;lint 类合并为一步。
- 历史由 git 保存,不留冗余文档。
- 遵循 worktree 工作流,不自动 push。

---

### Task 0: worktree + 测试基线

- [ ] **Step 1: 创建 worktree**
```bash
cd /Users/poco/Projects/kata
git worktree add -b codex/t6-tests-docs-cleanup .worktrees/t6-tests-docs-cleanup main
cd .worktrees/t6-tests-docs-cleanup && bun install
```
- [ ] **Step 2: 记录当前测试数与通过数(基线)**
```bash
find . -name "*.test.ts" -not -path "*/node_modules/*" | wc -l
bun test 2>&1 | tail -5
```

---

### Task 1: 删除措辞/同构/化石测试

**Files:**
- Delete: `tests/skills/**`(completion-contract、runtime-workflow、strategy-templates、shared-case-qa 等)
- Delete: `tests/references/**`
- Delete: `tests/e2e/**` 及 fixtures 双端 expected 目录
- Delete: 根目录一次性快照(dead-code-cleanup、security-command-hardening、esm-modules、space-separated-style、config-examples、output-style、large-file-split、settings-wiring)
- Delete: `tests/lint/` 中结构同构类(skill-structure、skill-shape、codex-skill-shape、agent-naming、owner-skill-dup、case-traceability-header、handoff-double-track、source-ref-registry、case-md-sourceref-leak)

**删除纪律:** 每删一个确认它断言的是措辞/同构/化石,而非真行为。

- [ ] **Step 1: 分类列出待删测试并 grep 确认无生产代码依赖其断言**
- [ ] **Step 2: 批量删除**
```bash
git rm -r tests/skills tests/references tests/e2e
git rm tests/dead-code-cleanup.test.ts tests/security-command-hardening.test.ts # ...逐个
```
- [ ] **Step 3: 跑剩余测试确认全绿**
```bash
bun test
```
- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "test: remove prompt-wording, structural-isomorphism, and migration-fossil tests"
```

---

### Task 2: lint 砍到防真实错误的 ~5 条

**Files:**
- Delete: `.claude/scripts/_shared/lint/` 中 17 条仪式性 lint(保留 feature-root-layout、tests-layout、hardcode-path、weak-assertion、v2-quality-gates 中的 env/session 安全子集)
- Modify: lint 聚合入口与 CI 引用

- [ ] **Step 1: 保留 5 条,删除其余及其测试**
- [ ] **Step 2: 更新 lint 聚合与 `kata cases lint` 引用**
- [ ] **Step 3: 跑 lint 确认通过**
```bash
bun run check
```
- [ ] **Step 4: Commit**
```bash
git commit -m "refactor(lint): keep only real-error linters"
```

---

### Task 3: CI 重整

**Files:**
- Modify: `.github/workflows/ci.yml`
- Delete: `.github/workflows/gitignore-no-bloat.yml`、`.github/workflows/features-index.yml`、`.github/workflows/schema-check.yml`(schema 已删大半)
- Modify: `package.json`(`ci` script 精简)

- [ ] **Step 1: ci.yml 精简为 biome + type-check + bun test + 真行为集成**
- [ ] **Step 2: 删执念 job 与对应 package.json script(lint:debris/lint:docs/lint:agents/lint:skills:codex/check:skills 等随 T1 已删命令一并清理)**
- [ ] **Step 3: 验证 ci 命令本地可跑**
```bash
bun run ci
```
- [ ] **Step 4: Commit**
```bash
git commit -m "ci: consolidate pipelines, remove obsessive jobs"
```

---

### Task 4: 历史文档清理 + README/INSTALL 对齐现实

**Files:**
- Delete: `docs/contracts/`、`docs/CODEX-SKILLS.md`、根 `CHANGELOG.md` 虚空引用段、`CODE_OF_CONDUCT.md`
- Modify: `README.md`、`README-EN.md`、`INSTALL.md`(与 6 skill + 薄 CLI + 双端独立一致)
- Delete: 已 tracked 的 `.DS_Store`

- [ ] **Step 1: 删历史/失实文档**
- [ ] **Step 2: 重写 README(真实命令树、6 skill、双端维护、产物路径)**
- [ ] **Step 3: 核对 INSTALL 与 config 现状一致**
- [ ] **Step 4: Commit**
```bash
git commit -m "docs: remove stale docs, align readme/install with reality"
```

---

### Task 5: 收尾验证(测试/源码比 < 1:1)

- [ ] **Step 1: 统计**
```bash
echo "tests:"; find . -name "*.test.ts" -not -path "*/node_modules/*" | wc -l
echo "test LOC:"; find . -name "*.test.ts" -not -path "*/node_modules/*" -exec cat {} + | wc -l
echo "src LOC:"; find cli lib -name "*.ts" -not -name "*.test.ts" -exec cat {} + | wc -l
```
预期:测试/源码比 < 1:1。
- [ ] **Step 2: 全量测试 + lint + type-check + ci**
```bash
bun test && bun run check && bun run type-check && bun run ci
```
- [ ] **Step 3: 汇报用户,确认后合并**
```bash
cd /Users/poco/Projects/kata
git merge --no-ff codex/t6-tests-docs-cleanup
git worktree remove .worktrees/t6-tests-docs-cleanup && git branch -d codex/t6-tests-docs-cleanup
```
不 push。

---

## Self-Review 记录

- **Spec coverage**:设计第 18 节(测试体系)、第 19 节(删除清单的测试/文档层)、第 21 节验收 5(测试/源码比)。覆盖。
- **占位符**:Task 1 的批量删除给的是文件清单与分类纪律——删除对象在调研报告中有精确名单,执行时按名单核对;不构成"不知删什么"的占位。
- **类型一致**:保留的 5 条 lint 名与设计第 18 节一致;删的 CI job 名与 `.github/workflows/` 实际文件名一致(gitignore-no-bloat、features-index、schema-check)。
- **依赖**:依赖 T1(审计命令已删,CI 引用需清理)、T3(cases.yaml 测试)、T4(skill 重写后措辞测试已无对象)、T5。
