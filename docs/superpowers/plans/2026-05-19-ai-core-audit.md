# kata .ai/core audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 kata `.ai/core/**` 做一次只读 audit,产出一份 Markdown 报告 `docs/audits/2026-05-19-ai-core-audit.md`,按 P0/P1/P2 三级列出发现 + 修复建议。

**Architecture:** 串行单 reviewer。从空骨架报告开始,按 A→B→C→D→E 五维度顺序扫描,每维度结束 commit 一次;最后一个 task 汇总摘要、Top 3 杠杆、附录,并自查总量上限。全程只读,不动 `.ai/core` / `engine/` 源文件。

**Tech Stack:** Bash (`grep`/`rg`/`wc`/`find`/`diff`)、`yq`(可选,YAML 字段提取)、Bun(仅用于 `bun engine/bin/kata ai-core projection lock render` 校验)。

**Spec:** `docs/superpowers/specs/2026-05-19-ai-core-audit-design.md`

**全局约束(每个 task 都要遵守):**
- 不修改 `.ai/core/**`、`engine/**`、`AGENTS.md` 等源文件
- 不写 csv、不写分维度子报告、不写中间笔记;只往 `docs/audits/2026-05-19-ai-core-audit.md` 增量追加内容
- 每条发现必须能用一条命令 / 一个路径复现(报告里的「证据」字段)
- 不打 P3 / 不留 "low" / 不留「其他备注」/ 不留 TODO

---

## Task 0: 准备报告骨架

**Files:**
- Create: `docs/audits/2026-05-19-ai-core-audit.md`
- Check: `docs/audits/`(目录是否存在)

- [ ] **Step 1: 确认 `docs/audits/` 目录**

Run:
```bash
ls -la docs/audits/ 2>/dev/null || echo "NOT EXISTS"
```
Expected: 当前未创建,显示 `NOT EXISTS`。

- [ ] **Step 2: 创建 `docs/audits/` 并写入骨架报告**

Create `docs/audits/2026-05-19-ai-core-audit.md`:
```markdown
# kata .ai/core audit — 2026-05-19

> 只读 audit。不修改任何源文件。
> spec: `docs/superpowers/specs/2026-05-19-ai-core-audit-design.md`

## 摘要

_待 Task 6 填写_

## 范围与方法

- **主范围:** `.ai/core/**` + `AGENTS.md`(及 `CLAUDE.md` symlink)+ `README.md` / `README-EN.md` / `INSTALL.md` / `CHANGELOG.md` + `workspace/` 目录骨架
- **cross-check:** `.claude/**`、`.agents/**`(仅 `grep -l`)、`engine/tests/**` grep schema/skill 引用、`package.json` scripts、`.github/workflows/**` 入口
- **判定基准:** 内部不一致 / 决策负担 / 可维护性
- **不在范围:** `engine/src/**`、`plugins/**`、`tools/**`、用户在 `workspace/` 下的产物内容、git 历史

## A. 文本审查(prompts / skills 内容)

_待 Task 1 填写_

## B. 触发链路(routing)

_待 Task 2 填写_

## C. 临时产物输出位置

_待 Task 3 填写_

## D. 语言一致性

_待 Task 4 填写_

## E. 结构精简(.ai/core 内部冗余)

_待 Task 5 填写_

## 附录:扫描覆盖清单

_待 Task 6 填写_
```

- [ ] **Step 3: Commit**

```bash
git add docs/audits/2026-05-19-ai-core-audit.md
git commit -m "docs: scaffold .ai/core audit report"
```

---

## Task 1: A. 文本审查

**Files:**
- Read-only: `.ai/core/skills/*/skill.yaml`(9 个)
- Read-only: `.ai/core/skills/*/references/*.md`(33 个)
- Read-only: `.ai/core/prompts/*.prompt.yaml`(9 个)
- Cross-check: `.claude/skills/*/SKILL.md`(grep `<!-- ai-core:start references -->` 等 marker)
- Modify: `docs/audits/2026-05-19-ai-core-audit.md`(替换 `## A. 文本审查` 章节内容)

- [ ] **Step 1: 测量每个 SKILL projection 与 prompt 的体量**

Run:
```bash
echo "=== .claude/skills/*/SKILL.md 行数 ==="
wc -l .claude/skills/*/SKILL.md | sort -rn
echo
echo "=== .ai/core/prompts/*.prompt.yaml 行数 ==="
wc -l .ai/core/prompts/*.prompt.yaml | sort -rn
echo
echo "=== .ai/core/skills/*/references/*.md 行数(top 20) ==="
wc -l .ai/core/skills/*/references/*.md | sort -rn | head -25
```
Expected: 看到具体行数分布。把 >500 行的 prompt、>300 行的 reference 记下来。

- [ ] **Step 2: 检测同一规则在 skill.yaml / prompt.yaml / references 中重复表述**

Run(每个 skill 跑一次,以 `case-draft` 为示例):
```bash
for s in case-draft case-edit case-hotfix bug-file conflict-analyze diff-scan knowledge-curate playwright-automation workspace-manage; do
  echo "=== $s ==="
  echo "[skill.yaml]"
  grep -nE '(MUST|ALWAYS|严禁|必须|不得)' .ai/core/skills/$s/skill.yaml 2>/dev/null | head -5
  echo "[prompt.yaml]"
  grep -nE '(MUST|ALWAYS|严禁|必须|不得)' .ai/core/prompts/$s.prompt.yaml 2>/dev/null | head -5
  echo "[references]"
  grep -rnE '(MUST|ALWAYS|严禁|必须|不得)' .ai/core/skills/$s/references/ 2>/dev/null | head -10
done
```
Expected: 列出每个 skill 三处规则密度。重复出现 2 次以上的规则记 P1(决策负担)。

- [ ] **Step 3: 检查 reference 文件是否被 SKILL.md projection 实际引用**

Run:
```bash
for ref in $(find .ai/core/skills -path '*/references/*.md'); do
  skill=$(echo "$ref" | awk -F/ '{print $4}')
  refname=$(basename "$ref" .md)
  if ! grep -q "references/$refname" .claude/skills/$skill/SKILL.md 2>/dev/null; then
    echo "ORPHAN: $ref(未被 .claude/skills/$skill/SKILL.md 引用)"
  fi
done
```
Expected: 列出所有孤儿 reference。每个孤儿记 P1(决策负担:文件存在但不会被 agent 读到)。

- [ ] **Step 4: 检查「ALWAYS / MUST / 严禁」密度过高的段落**

Run:
```bash
for f in .claude/skills/*/SKILL.md .ai/core/skills/*/references/*.md; do
  total=$(wc -l < "$f")
  rules=$(grep -cE '(MUST|ALWAYS|严禁|必须|不得|never|NEVER)' "$f")
  if [ "$total" -gt 0 ] && [ "$rules" -gt 5 ]; then
    ratio=$(echo "scale=2; $rules*100/$total" | bc)
    echo "$ratio%  $rules/$total  $f"
  fi
done | sort -rn | head -10
```
Expected: 看到密度排名。规则占比 > 10% 的文件记 P2(可维护性:语气重)。

- [ ] **Step 5: 把发现写入 A 章节**

用 Edit 工具替换 `docs/audits/2026-05-19-ai-core-audit.md` 中 `## A. 文本审查\n\n_待 Task 1 填写_` 整段为实际内容,格式:

```markdown
## A. 文本审查(prompts / skills 内容)

### A1 [P?] <一句话标题>
- **位置:** `<path>:<行号>`(可多个)
- **证据:** `wc -l ...` 输出 / grep 输出片段 / 路径对照
- **影响:** ...
- **建议:** ...

### A2 [P?] ...

(无发现也要写一句"本维度未发现 P0/P1/P2 级问题"——保留章节)
```

- [ ] **Step 6: Commit**

```bash
git add docs/audits/2026-05-19-ai-core-audit.md
git commit -m "docs: audit findings — A. prompts/skills 文本"
```

---

## Task 2: B. 触发链路(routing)

**Files:**
- Read-only: `AGENTS.md`(根 + symlink `CLAUDE.md`)
- Read-only: `.ai/core/commands/*.command.yaml`(9 个)
- Read-only: `.ai/core/skills/*/skill.yaml`(9 个,看入口分派 / fallback)
- Read-only: `.ai/core/workflows/*.workflow.yaml`(9 个,看 step 链)
- Read-only: `.ai/core/agents/*.agent.yaml`(10 个 worker)
- Cross-check: `.claude/commands/*.md`(渲染产物)
- Modify: `docs/audits/2026-05-19-ai-core-audit.md`(替换 `## B. 触发链路` 章节)

- [ ] **Step 1: AGENTS.md 命令索引 vs `.ai/core/commands/` 一一对照**

Run:
```bash
echo "=== AGENTS.md 列出的 slash command ==="
grep -E '^\| /[a-z-]+' AGENTS.md | awk '{print $2}'
echo
echo "=== .ai/core/commands/*.command.yaml 文件 ==="
ls .ai/core/commands/ | sed 's/\.command\.yaml$//'
echo
echo "=== .ai/core/commands/ slug 字段 ==="
grep -h '^slash:' .ai/core/commands/*.command.yaml 2>/dev/null
```
Expected: 比对三组,任一处缺失即 P0(路由不一致)。

- [ ] **Step 2: 量化「用户 prompt → 输出」跳转步数(每个 skill)**

对每个 skill 数:用户输入(1)→ slash command yaml(2)→ skill.yaml(3)→ workflow yaml(4)→ 各 step references(5..)→ worker agent.yaml(N)→ output 落盘(N+1)。

Run(示例 case-draft):
```bash
for s in case-draft case-edit case-hotfix bug-file conflict-analyze diff-scan knowledge-curate playwright-automation workspace-manage; do
  echo "=== $s ==="
  refs=$(grep -c 'references/' .claude/skills/$s/SKILL.md 2>/dev/null)
  steps=$(grep -c '^  - id:' .ai/core/workflows/$s.workflow.yaml 2>/dev/null || echo "?")
  echo "  workflow steps: $steps"
  echo "  references 引用次数: $refs"
done
```
Expected: 输出每个 skill 的「步数 + reference 引用」。步数 > 10 或 references > 8 记 P1(决策负担)。

- [ ] **Step 3: skill 内部分派 fallback 闭环检查**

Run:
```bash
echo "=== skill.yaml 中提到的 fallback / error / blocked 路径 ==="
grep -rn 'fallback\|error_fallback\|BlockedEnvelope\|blocked' .ai/core/skills/*/skill.yaml
echo
echo "=== references 中的 fallback / 异常路径文档 ==="
find .ai/core/skills -path '*/references/*' -name '*.md' \
  -exec grep -l -iE '(fallback|error|blocked|降级|回退)' {} \;
```
Expected: 每个 fallback 必须能在某个 reference 或 prompt 找到对应处理流程,否则记 P0(链路断点)。

- [ ] **Step 4: 同义入口声明检查(如 Lanhu URL 直接落 case-draft)**

Run:
```bash
echo "=== AGENTS.md 关于隐式路由的声明 ==="
grep -nE '(Lanhu|Axure|silently|直接|隐式|没有命令)' AGENTS.md
echo
echo "=== skill.yaml 中的非显式触发声明 ==="
grep -rnE '(must_trigger_when|静默|自动派发)' .ai/core/skills/*/skill.yaml
```
Expected: AGENTS.md 中所有「无 slash command 直接派发」的路径必须在某个 skill.yaml `must_trigger_when` 显式列出,否则 P0。

- [ ] **Step 5: projection lock 一致性(源端 ↔ 渲染端是否同步)**

Run:
```bash
bun engine/bin/kata ai-core projection lock check 2>&1 || \
  bun engine/bin/kata ai-core projection render --dry-run 2>&1 | head -20
```
Expected: 若 lock 漂移,记 P0(源/投影分歧本身就是路由风险)。**只跑 check / dry-run,不执行 render。**

- [ ] **Step 6: 把发现写入 B 章节**

Edit 替换 `## B. 触发链路\n\n_待 Task 2 填写_` 整段。

- [ ] **Step 7: Commit**

```bash
git add docs/audits/2026-05-19-ai-core-audit.md
git commit -m "docs: audit findings — B. 触发链路"
```

---

## Task 3: C. 临时产物输出位置

**Files:**
- Read-only: `AGENTS.md`(Workspace Boundary、Feature Directory Naming 章节)
- Read-only: `workspace/**` 目录骨架(不读文件内容)
- Read-only: `.ai/core/skills/*/skill.yaml` 中 `outputs:` 字段
- Read-only: `.ai/core/workflows/*.workflow.yaml` 中落盘路径
- Read-only: `.ai/core/runtimes/run-retention.yaml`(临时产物保留策略)
- Modify: `docs/audits/2026-05-19-ai-core-audit.md`(替换 `## C. 临时产物输出位置`)

- [ ] **Step 1: 列出 workspace/ 真实目录结构**

Run:
```bash
find workspace -maxdepth 4 -type d | sort
echo
echo "=== features 命名样本(取前 5 个) ==="
find workspace -path '*/features/*' -type d -maxdepth 4 | head -5
```
Expected: 看到 `workspace/{project}/features/...`、`_shared/` 等。若 features 名违反 AGENTS.md `YYYY-MM[-{customer}]-{module}-{slug}` 全英文规约(出现拼音、中文),记 P0。

- [ ] **Step 2: 对照 AGENTS.md Workspace Boundary 声明**

Run:
```bash
echo "=== AGENTS.md 声明的产物落盘位置 ==="
grep -nE '(workspace|features|archive|evidence|reports|tmp)' AGENTS.md | head -30
echo
echo "=== skill.yaml 中 outputs 字段 ==="
grep -A3 '^outputs:' .ai/core/skills/*/skill.yaml
```
Expected: 把每个 skill 声明的 outputs 与 AGENTS.md 声明的 workspace 子目录对照,凡声明落 workspace 之外(如 docs/、根目录、`.kata/repos/`)的记 P0。

- [ ] **Step 3: `.kata/repos/` read-only 假设验证**

Run:
```bash
grep -rnE '\.kata/repos/' .ai/core/ 2>/dev/null
```
Expected: 应该只有 `read` / `evidence` / `inputs` 类用法。若发现 `write` / `push` / `commit` / `mutate` 用法 → P0(违反 AGENTS.md「不得 push / commit / mutate 源仓库」)。

- [ ] **Step 4: `.worktrees/` 命名规约执行情况**

Run:
```bash
git worktree list
echo
ls -la .worktrees 2>/dev/null || echo "no .worktrees in repo root"
echo
ls -la .claude/worktrees 2>/dev/null
```
Expected: 注意区分:`.worktrees/<slug>`(AGENTS.md 规约,人工)vs `.claude/worktrees/<random>`(Claude Code harness 自动)。若 AGENTS.md 未声明后者存在,记 P1(规约不完整,会产生混乱)。

- [ ] **Step 5: 中间产物落盘位置声明检查(`.auth/` / screenshots / 解析 JSON)**

Run:
```bash
echo "=== 隐式中间产物位置 ==="
grep -rnE '(\.auth/|screenshots?/|/tmp/|cache/|intermediate)' .ai/core/ 2>/dev/null | head -30
```
Expected: 凡未在 AGENTS.md 或 skill.yaml `outputs:` 显式声明的中间产物路径,记 P1(决策负担:开发不知该清谁不该清)。

- [ ] **Step 6: 把发现写入 C 章节,Commit**

Edit 替换 + commit:
```bash
git add docs/audits/2026-05-19-ai-core-audit.md
git commit -m "docs: audit findings — C. 临时产物输出位置"
```

---

## Task 4: D. 语言一致性

**Files:**
- Read-only: `.ai/core/**/*.md`、`.ai/core/**/*.yaml`、`AGENTS.md`、`README.md`、`README-EN.md`
- Modify: `docs/audits/2026-05-19-ai-core-audit.md`(替换 `## D. 语言一致性`)

**只看可量化点,不打分美学。**

- [ ] **Step 1: 同一术语两种写法检测(预定义术语对)**

Run:
```bash
declare -a pairs=(
  "case|用例"
  "worktree|工作树"
  "workflow|工作流"
  "skill|技能"
  "agent|智能体"
  "feature|功能"
  "command|命令"
  "schema|模式"
  "evidence|证据"
  "fallback|回退"
)
for pair in "${pairs[@]}"; do
  en="${pair%%|*}"
  zh="${pair##*|}"
  en_count=$(grep -rwI "$en" .ai/core AGENTS.md 2>/dev/null | wc -l)
  zh_count=$(grep -rwI "$zh" .ai/core AGENTS.md 2>/dev/null | wc -l)
  if [ "$en_count" -gt 0 ] && [ "$zh_count" -gt 0 ]; then
    echo "  $en($en_count) ↔ $zh($zh_count)"
  fi
done
```
Expected: 列出两种写法都出现的术语对。两边都 >5 次 → P1(决策负担)。一边 >0 但另一边 <3 → P2(可清理为单一写法)。

- [ ] **Step 2: 文件名 vs 内容语言不一致**

Run:
```bash
echo "=== 全英文文件名但内容含中文 ==="
for f in $(find .ai/core -name '*.md' -o -name '*.yaml' | grep -v references); do
  fname=$(basename "$f")
  if echo "$fname" | grep -qE '^[a-z0-9.-]+$' 2>/dev/null; then
    cn=$(grep -cE '[一-龥]' "$f" 2>/dev/null || perl -ne 'print if /\p{Han}/' "$f" | wc -l)
    if [ "$cn" -gt 0 ]; then
      echo "  $f  ($cn 行含中文)"
    fi
  fi
done | head -20
```
Expected: 文件名全英文、内容大量中文是当前默认风格,不记问题;只关注**反向**——文件名带中文/拼音但需是 ASCII 的(如 workspace features 目录拼音 slug)。

- [ ] **Step 3: skill description 三处口径一致性**

Run:
```bash
for s in case-draft case-edit case-hotfix bug-file conflict-analyze diff-scan knowledge-curate playwright-automation workspace-manage; do
  echo "=== $s ==="
  echo "[skill.yaml summary]"
  grep -A1 '^  summary:' .ai/core/skills/$s/skill.yaml 2>/dev/null | head -2
  echo "[command.yaml]"
  grep -A1 '^summary:' .ai/core/commands/$s.command.yaml 2>/dev/null | head -2
  echo "[AGENTS.md 命令索引]"
  grep -E "^\| /$s " AGENTS.md
done
```
Expected: 三处描述出现实质矛盾(不只是措辞差异,是含义不同)→ P0。仅措辞差异 → P2。

- [ ] **Step 4: 错误消息 / CLI 输出语言基线**

Run:
```bash
echo "=== CLI / runtime 输出文案(中英文混用检测) ==="
grep -rnE '(error|failed|warning|TODO)' .ai/core/runtimes/ .ai/core/runners/ 2>/dev/null | head -20
grep -rnE '(失败|错误|警告)' .ai/core/runtimes/ .ai/core/runners/ 2>/dev/null | head -20
```
Expected: 若同一文件混用中英文输出,记 P2。

- [ ] **Step 5: 把发现写入 D 章节,Commit**

```bash
git add docs/audits/2026-05-19-ai-core-audit.md
git commit -m "docs: audit findings — D. 语言一致性"
```

---

## Task 5: E. 结构精简(.ai/core 内部冗余)

**Files:**
- Read-only: 全部 `.ai/core/**`
- Modify: `docs/audits/2026-05-19-ai-core-audit.md`(替换 `## E. 结构精简`)

- [ ] **Step 1: skill.yaml vs prompt.yaml 内容重叠检测**

Run:
```bash
for s in case-draft case-edit case-hotfix bug-file conflict-analyze diff-scan knowledge-curate playwright-automation workspace-manage; do
  echo "=== $s ==="
  skill_lines=$(wc -l < .ai/core/skills/$s/skill.yaml 2>/dev/null)
  prompt_lines=$(wc -l < .ai/core/prompts/$s.prompt.yaml 2>/dev/null || echo 0)
  echo "  skill.yaml: $skill_lines 行"
  echo "  prompt.yaml: $prompt_lines 行"
  if [ "$prompt_lines" != "0" ]; then
    diff <(grep -oE '[A-Za-z]{6,}' .ai/core/skills/$s/skill.yaml 2>/dev/null | sort -u) \
         <(grep -oE '[A-Za-z]{6,}' .ai/core/prompts/$s.prompt.yaml 2>/dev/null | sort -u) \
         | grep -c '^<' | xargs -I{} echo "  unique terms only in skill.yaml: {}"
  fi
done
```
Expected: 若 skill.yaml 与 prompt.yaml 词汇高度重合(>80%),记 P1(决策负担)。

- [ ] **Step 2: schemas/ 重复 / 派生 schema 缺 base**

Run:
```bash
echo "=== schemas 数量 ==="
ls .ai/core/schemas/*.schema.json | wc -l
echo
echo "=== schemas required 字段重复检测 ==="
for s in .ai/core/schemas/*.schema.json; do
  required=$(jq -r '.required // [] | join(",")' "$s" 2>/dev/null)
  echo "$(basename $s): $required"
done | sort -k2 -t: | uniq -f1 -D | head -30
```
Expected: 多个 schema 有完全相同的 required 集 → P2(可抽 base)。

- [ ] **Step 3: contracts/ vs schemas/ 边界**

Run:
```bash
echo "=== contracts 目录 ==="
ls .ai/core/contracts/
echo
echo "=== 每个 contract 内文件 ==="
for c in .ai/core/contracts/*/; do
  echo "$c:"
  ls "$c"
done
```
Expected: 若某 contract 目录里只有一个 schema.json(且 schemas/ 也有同名),边界含糊 → P2。

- [ ] **Step 4: references/ 长度分布与孤儿统计**

Run:
```bash
echo "=== references 长度 top 10 ==="
wc -l .ai/core/skills/*/references/*.md | sort -rn | head -10
echo
echo "=== 孤儿数量(Task 1 已计算,这里复用)==="
orphans=0
for ref in $(find .ai/core/skills -path '*/references/*.md'); do
  skill=$(echo "$ref" | awk -F/ '{print $4}')
  refname=$(basename "$ref" .md)
  if ! grep -q "references/$refname" .claude/skills/$skill/SKILL.md 2>/dev/null; then
    orphans=$((orphans+1))
  fi
done
echo "孤儿 reference 总数: $orphans / 33"
```
Expected: 孤儿数若 >0 已在 Task 1 记 P1;此处统计写入 E 维度作可维护性总览。

- [ ] **Step 5: agents/ boilerplate 抽取空间**

Run:
```bash
echo "=== agents/*.agent.yaml 头部字段对比 ==="
for a in .ai/core/agents/*.agent.yaml; do
  echo "--- $(basename $a) ---"
  head -20 "$a"
done | head -100
```
Expected: 若 10 个 agent yaml 头部 15 行以上几乎相同,可抽公共片段 → P2。

- [ ] **Step 6: 把发现写入 E 章节,Commit**

```bash
git add docs/audits/2026-05-19-ai-core-audit.md
git commit -m "docs: audit findings — E. 结构精简"
```

---

## Task 6: 汇总(摘要 + Top 3 + 附录 + 自查)

**Files:**
- Modify: `docs/audits/2026-05-19-ai-core-audit.md`(填 `## 摘要`、`## 附录:扫描覆盖清单`)

- [ ] **Step 1: 统计 P0 / P1 / P2 计数**

Run:
```bash
grep -cE '^\### [A-E][0-9]+ \[P0\]' docs/audits/2026-05-19-ai-core-audit.md
grep -cE '^\### [A-E][0-9]+ \[P1\]' docs/audits/2026-05-19-ai-core-audit.md
grep -cE '^\### [A-E][0-9]+ \[P2\]' docs/audits/2026-05-19-ai-core-audit.md
echo
total=$(grep -cE '^\### [A-E][0-9]+ \[P[012]\]' docs/audits/2026-05-19-ai-core-audit.md)
echo "总计: $total"
```
Expected: 总计 ≤ 60;若超出,回头砍 P2 → 砍信号弱的 P1。

- [ ] **Step 2: 选 Top 3 修复杠杆**

判定标准(从已记录发现中选):
1. **影响最广** — 路由 / 命名 / 落盘类 P0
2. **修复成本最低** — 单文件一次性修就解决
3. **辐射多维度** — 修了能同时改善 ≥2 个维度

把 3 条写入 `## 摘要` 章节,每条带锚点到正文(`[A1](#a1-标题)` 形式)。

- [ ] **Step 3: 填写摘要章节**

Edit 替换 `## 摘要\n\n_待 Task 6 填写_` 整段为:

```markdown
## 摘要

- **总览:** P0 = N0,P1 = N1,P2 = N2(合计 N)
- **Top 3 修复杠杆:**
  1. [A?/B?/C?/D?/E?] <标题>(单条改动同时改善 X / Y 维度)
  2. ...
  3. ...
- **建议执行顺序:** 先全部 P0,再 Top 3,余下按维度批量处理。
```

- [ ] **Step 4: 填写附录:扫描覆盖清单**

Run:
```bash
echo "已扫文件统计:"
echo "  .ai/core/skills/*/skill.yaml: $(ls .ai/core/skills/*/skill.yaml | wc -l)"
echo "  .ai/core/skills/*/references/*.md: $(find .ai/core/skills -path '*/references/*.md' | wc -l)"
echo "  .ai/core/prompts/*.prompt.yaml: $(ls .ai/core/prompts/*.prompt.yaml | wc -l)"
echo "  .ai/core/commands/*.command.yaml: $(ls .ai/core/commands/*.command.yaml | wc -l)"
echo "  .ai/core/agents/*.agent.yaml: $(ls .ai/core/agents/*.agent.yaml | wc -l)"
echo "  .ai/core/workflows/*.workflow.yaml: $(ls .ai/core/workflows/*.workflow.yaml | wc -l)"
echo "  .ai/core/schemas/*.schema.json: $(ls .ai/core/schemas/*.schema.json | wc -l)"
echo "  workspace/ 顶层目录: $(ls workspace/ | wc -l)"
```

Edit 替换 `## 附录:扫描覆盖清单\n\n_待 Task 6 填写_` 整段为:

```markdown
## 附录:扫描覆盖清单

### 已扫文件数
- `.ai/core/skills/*/skill.yaml`:9
- `.ai/core/skills/*/references/*.md`:33
- `.ai/core/prompts/*.prompt.yaml`:9
- `.ai/core/commands/*.command.yaml`:9
- `.ai/core/agents/*.agent.yaml`:10
- `.ai/core/workflows/*.workflow.yaml`:9
- `.ai/core/schemas/*.schema.json`:30
- `workspace/` 顶层项目目录:2

### cross-check 用到的命令清单
- `wc -l`、`grep -nE`、`rg --files-with-matches`、`find`、`bun engine/bin/kata ai-core projection lock check`

### 跳过项
- `engine/src/**`(明确不在范围)
- `plugins/**`、`tools/**`(明确不在范围)
- 用户在 `workspace/{project}/` 中的产物内容(只看目录骨架)
- git 历史 / blame(明确不在范围)
```

- [ ] **Step 5: 报告自查(无 TODO / 无 P3 / 无未填位)**

Run:
```bash
echo "=== 自查未填位 ==="
grep -nE '(_待|TODO|TBD|P3|其他备注|low)' docs/audits/2026-05-19-ai-core-audit.md && \
  echo "❌ 自查失败,有未填位 / 违禁词" || echo "✅ 自查通过"
echo
echo "=== 自查总量上限 ==="
total=$(grep -cE '^\### [A-E][0-9]+ \[P[012]\]' docs/audits/2026-05-19-ai-core-audit.md)
[ "$total" -le 60 ] && echo "✅ 总量 $total ≤ 60" || echo "❌ 超出 60,需砍"
```
Expected: 全 ✅。如有 ❌,回去修;不修不能进 Step 6。

- [ ] **Step 6: Commit**

```bash
git add docs/audits/2026-05-19-ai-core-audit.md
git commit -m "docs: audit summary, top 3 levers, 附录"
```

---

## Task 7: Merge to main

**Files:**
- No new files. 仅 git 操作。

- [ ] **Step 1: 用户确认报告(中断点)**

把报告路径 `docs/audits/2026-05-19-ai-core-audit.md` 报给用户。等用户读完确认「OK 合并」再继续。

**若用户要改:** 不要在本任务里改报告内容;让用户具体说改哪条,新建一个 fix commit 后再回 Step 2。

- [ ] **Step 2: 跑 ci(纯文档,只为兜底)**

Run:
```bash
bun run check 2>&1 | tail -5
```
Expected: PASS。docs-only 改动一般不会 fail,但万一 lint 抓到 markdown 问题就修。

- [ ] **Step 3: Merge 回 main**

Run:
```bash
git fetch origin main
git checkout main 2>/dev/null || git switch main
git merge --no-ff claude/pensive-mclaren-494664 -m "merge: .ai/core read-only audit report"
git push origin main
```

- [ ] **Step 4: 清理 worktree**

Run:
```bash
git worktree list
```

**注意:** 当前 worktree 是 Claude Code harness 自动管理的(`.claude/worktrees/pensive-mclaren-494664`),不是用户 AGENTS.md 规约的 `.worktrees/<slug>`。harness 通常会在 session 结束后回收;**不主动删除**,避免破坏 harness 状态。

如果是 superpowers:using-git-worktrees 建的 `.worktrees/<slug>`,才执行:
```bash
git worktree remove .worktrees/<slug>
git branch -d <branch>
```

---

## Self-Review(plan 完成后,执行前)

### 1. Spec coverage

| Spec 章节 / 要求 | 对应 task |
|---|---|
| 范围:`.ai/core/**` + AGENTS.md + workspace/ 布局 | 全部 task,Task 0 在报告中固化 |
| cross-check:`.claude/.agents`/`engine/tests`/scripts | Task 1 Step 3, Task 2 Step 5 |
| 判定基准:内部不一致 / 决策负担 / 可维护性 | 每个 task 的 grep 检测项 |
| 五维度 A-E | Task 1-5 各对应一维 |
| 严重度 P0/P1/P2 | Task 1-5 的写入 step,Task 6 Step 5 自查 |
| 报告骨架(固定章节) | Task 0 写入骨架 |
| 落盘位置 `docs/audits/2026-05-19-ai-core-audit.md` | Task 0 创建 |
| 总量上限 60 | Task 6 Step 1, Step 5 自查 |
| 验收:可一行 grep 复现 | 每个 task 的写入 step 强制「证据」字段 |
| 验收:Top 3 杠杆独立支撑决策 | Task 6 Step 2-3 |
| 风险:cross-check token 膨胀 | Task 1/2 使用 `grep -l` 而非读全文 |
| 风险:projection bug 误计入源 | Task 1 Step 3 显式比对源 ↔ 投影 |
| Non-Goals:不动源文件 / 不读 engine src | 全局约束,task 内只读 grep |

无遗漏。

### 2. Placeholder scan

- 报告骨架里的 `_待 Task N 填写_` 是显式占位符,Task 1-6 各自负责替换,不算 plan 占位
- 全 plan 无 "TBD"/"TODO"/"实现 later"/"类似 Task N"
- Top 3 杠杆模板里的「A?/B?/...」是执行时替换的占位,plan 本身不需要填,因为内容由执行结果决定 — 这属于「执行时决定的内容」,不是 plan 缺失

### 3. Type consistency

- 维度标签 A-E 全程一致(Task 1-5 章节标题 + Task 6 计数 grep + spec)
- 发现编号格式 `A1 / A2 / B1 ...` 统一(Task 1-5 写入模板 + Task 6 计数 regex)
- 严重度标签 `[P0] [P1] [P2]` 统一(无 `[P-0]` / `[p0]` / `[CRITICAL]` 变体)
- commit 类型统一 `docs:`(本仓库 conventional commits 约定)

通过。
