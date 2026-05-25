# 岚图主流程用例优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 main-flow(轨道 A)与 launched-reqs(轨道 B)两套岚图数据质量用例,通过并发 codex 实例做语义级标准化/重建,产出符合项目用例规范的 md + xmind。

**Architecture:** Claude 编排,codex 执行。每个 codex 实例独占一个 fragment 文件(零写冲突),读源码/DOM/launched-reqs 当真值源逐条语义重写;Claude 合并片段 → archive.md → 重生成 xmind → 自检 → 知识沉淀。轨道 A 数据质量按 8 大规则重组、每小规则 ≥1 例;轨道 B 保留版本组织、全量格式标准化 + 补 SQL。

**Tech Stack:** Bun ≥1.3、kata CLI(`xmind-gen`)、codex-companion(`scripts/codex-companion.mjs`)、codex-cli 0.133.0、Node 脚本(fragment 合并/格式检查)。

**Spec:** `docs/superpowers/specs/2026-05-25-lt-dq-main-flow-case-optimization-design.md`

**关键路径常量(全程引用):**
- 仓库根: `/Users/poco/Projects/kata`(下称 `$ROOT`)
- 轨道 A feature: `$ROOT/workspace/dataAssets/features/2099-01-lt-dq-main-flow`(下称 `$FA`)
- 轨道 B feature: `$ROOT/workspace/dataAssets/features/2099-01-lt-dq-launched-reqs`(下称 `$FB`)
- codex companion: `$ROOT/.claude/plugins/cache/openai-codex-plugin/codex/<ver>/scripts/codex-companion.mjs`(下称 `$CODEX`)
- 源码仓库根: `$ROOT/.kata/repos/customltem`(下称 `$REPOS`)
- 规格包: `$FA/.process/spec-pack.md`(轨道 B 复用)

**codex 派发契约(已核实):**
```
node $CODEX task --write --background --prompt-file <file> --cwd <dir> --model <m> --effort high
node $CODEX status [--job-id <id>]      # 轮询
node $CODEX result --job-id <id>        # 取结果
```
- `--write` = workspace-write 沙箱(允许写文件);省略则 read-only
- `--background` = 后台执行,用 status/result 取回
- `--prompt-file` 相对 `--cwd` 解析

---

## Phase 0 — 前置准备

### Task 0.1: 创建 worktree

**Files:** 无(git 操作)

- [ ] **Step 1: 创建隔离 worktree**

Run:
```bash
cd $ROOT
git worktree add .worktrees/lt-dq-case-opt -b feat/lt-dq-case-opt
```
Expected: `Preparing worktree ... HEAD is now at ...`

- [ ] **Step 2: 确认 worktree 内 feature 目录存在**

Run:
```bash
ls .worktrees/lt-dq-case-opt/workspace/dataAssets/features/ | grep lt-dq
```
Expected: 列出 `2099-01-lt-dq-main-flow` 与 `2099-01-lt-dq-launched-reqs`

> 后续所有 `$FA`/`$FB` 改写均在 worktree 内进行:`$FA = .worktrees/lt-dq-case-opt/workspace/dataAssets/features/2099-01-lt-dq-main-flow`,`$FB` 同理。源码仓库 `$REPOS` 与 codex 插件 `$CODEX` 仍指向主仓库根(共享、只读)。

### Task 0.2: 更新 codex 插件到最新并验证

**Files:** 无

- [ ] **Step 1: 查看当前版本**

Run:
```bash
cat $ROOT/.claude/plugins/cache/openai-codex-plugin/codex/*/plugin.json | grep '"version"'
```
Expected: 当前为 `"version": "1.0.4"`(或更高)

- [ ] **Step 2: 更新插件**

在 Claude Code 会话内执行 `/plugin`,选择 marketplace `openai-codex` → 更新 `codex` 到最新;或命令行:
```bash
claude plugin update codex 2>&1 | tail -5
```
Expected: 提示已更新或已是最新

- [ ] **Step 3: 重新解析 companion 路径并验证可执行**

Run:
```bash
CODEX=$(ls -d $ROOT/.claude/plugins/cache/openai-codex-plugin/codex/*/scripts/codex-companion.mjs | sort -V | tail -1); echo $CODEX
node "$CODEX" --help 2>&1 | grep -A1 "task "
```
Expected: 打印含 `task [--background] [--write] ... [--prompt-file ...]` 的用法行(确认 `--prompt-file` 仍受支持;若新版参数有变,以 `--help` 为准并更新本计划的派发契约)

- [ ] **Step 4: 验证 codex 鉴权就绪**

Run:
```bash
node "$CODEX" setup 2>&1 | tail -10
```
Expected: 报告 codex 二进制可用 + 已登录;若未登录,提示用户 `! codex login` 后再继续

### Task 0.3: 克隆源码仓库(前后端 release_6.3.x_ltqc)

**Files:**
- Create: `$REPOS/dt-insight-studio`(前端)
- Create: `$REPOS/dt-center-assets`(后端)

- [ ] **Step 1: 确认远程地址**

向用户确认两个仓库的 git 远程 URL(`source-repo-map.md` 只给了 `customltem/dt-insight-studio@dataAssets/release_6.3.x_ltqc` 这类逻辑名,缺真实 clone URL)。AskUser 一次性索要两个 URL。

- [ ] **Step 2: 克隆前端指定分支(浅克隆)**

Run:
```bash
mkdir -p $REPOS && cd $REPOS
git clone --branch dataAssets/release_6.3.x_ltqc --single-branch --depth 1 <FRONTEND_URL> dt-insight-studio
```
Expected: clone 成功,`dt-insight-studio` 目录存在

- [ ] **Step 3: 克隆后端指定分支**

Run:
```bash
cd $REPOS
git clone --branch release_6.3.x_ltqc --single-branch --depth 1 <BACKEND_URL> dt-center-assets
```
Expected: clone 成功

- [ ] **Step 4: 验证分支正确**

Run:
```bash
git -C $REPOS/dt-insight-studio branch --show-current; git -C $REPOS/dt-center-assets branch --show-current
```
Expected: 分别输出 `dataAssets/release_6.3.x_ltqc` 与 `release_6.3.x_ltqc`

### Task 0.4: 定位数据质量规则源码起点(供 prompt-file 引用)

**Files:** 无(只调研,产出锚点清单)

- [ ] **Step 1: 后端定位 8 大规则枚举**

Run:
```bash
grep -rniE "完整性|有效性|唯一性|统计性|一致性|时效性|合理性|自定义.*SQL" $REPOS/dt-center-assets --include=*.java -l | head -20
grep -rniE "ruleType|RULE_TYPE|FunctionEnum|内置规则" $REPOS/dt-center-assets --include=*.java -l | head -20
```
Expected: 输出含规则类型枚举/内置规则定义的源码文件路径,记下 2-4 个最相关文件作为锚点

- [ ] **Step 2: 前端定位规则函数列表/表单**

Run:
```bash
grep -rniE "完整性|有效性|空值数|表行数|function-list|ruleFunction" $REPOS/dt-insight-studio/src -l 2>/dev/null | head -20
```
Expected: 输出规则库/规则集表单相关组件路径,记下锚点

- [ ] **Step 3: 把锚点写入备忘**

将 Step1/2 找到的关键文件路径(后端规则枚举、前端规则函数列表)记录,供 Task 2.1 prompt-file 的「源码搜索起点」字段填充。

---

## Phase 1 — 规格包(两轨共享)

### Task 1.1: 编写共享规格包

**Files:**
- Create: `$FA/.process/spec-pack.md`

- [ ] **Step 1: 写规格包**

写入以下内容(codex 每个实例都会被要求先读它):

```markdown
# 用例标准化规格包(codex 必读)

## 你的角色
你是 QA 用例标准化执行者。逐条**语义级**改写用例,禁止脚本机械转换/正则批量替换。

## 真值源优先级
1. 源码(后端 `$REPOS/dt-center-assets`、前端 `$REPOS/dt-insight-studio`):规则行为、字段名、按钮名、toast 文案
2. 已有用例(launched-reqs / main-flow 现有内容):语义复用
3. DOM:`$ROOT/workspace/dataAssets/_shared/env/ltqc-local.yaml` 与 `_shared/knowledge/sites/**`
冲突时以源码为准。

## 格式硬规则
- 章节层级:`## 模块 → ### 菜单/页面 → #### 功能点(可选) → ##### 【Pn】用例`
- 用例标题:必带 `【Pn】` 前缀;禁止 TC-ID/SR-/RA- 等机器标识;自然中文动宾句
- 括号语义:`【】` 仅用于 `【Pn】`;`「」` 用于所有 UI/菜单/选项/字段名
- 每条用例:≥1 前置条件、≥1 步骤,每步预期具体可验;禁止「页面正常打开」类空断言;一例一验证目标
- 可读换行:前置条件 / 操作步骤 / 预期结果 分段;多步骤分行编号
- 前置 SQL:有数据依赖的用例给可执行 SQL,`DROP TABLE IF EXISTS` + `CREATE TABLE` + `INSERT` 三段可重入,放 ```代码块```;岚图默认数据源 SparkThrift2.x(STRING 类型),需要时给 doris3.x 变体
- 已知 bug:任何 SQL/代码注释不得泄漏成 markdown 标题(`#` 开头),必须包进代码块

## 业务约束(数据质量)
- 业务流:规则库配置 → 规则集管理 → 规则任务管理 → 校验结果查询 → 数据质量报告
- 不得跳过规则集直接在规则任务建规则
- 数据源选型:sparkthrift2.x > doris3.x > hive2.x
- 按钮名以源码/DOM 为准(参考 `_shared/rules/case-writing.md` 第 5 节易错对照)

## 输出
- 只写你被分配的那一个 fragment 文件,不碰其他文件
- fragment 内只放人类可读用例内容,无机器标识
- 完成后在 fragment 末尾追加一行注释 `<!-- self-check: 层级✓ 标题✓ 括号✓ SQL✓ 空断言✓ -->`
```

- [ ] **Step 2: 确认引用真值文件存在**

Run:
```bash
ls $ROOT/workspace/dataAssets/_shared/env/ltqc-local.yaml \
   $ROOT/workspace/dataAssets/_shared/rules/case-writing.md \
   $ROOT/.claude/skills/case-draft/references/output-standard.md
```
Expected: 三个文件均存在

- [ ] **Step 3: Commit**

```bash
cd $ROOT && git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md
git -C .worktrees/lt-dq-case-opt commit -m "chore: 🧱 add shared case-standardization spec pack"
```

### Task 1.2: 编写格式检查脚本(自检用)

**Files:**
- Create: `$FA/scripts/check-archive-format.mjs`

- [ ] **Step 1: 写检查脚本**

```javascript
#!/usr/bin/env bun
// 用法: bun check-archive-format.mjs <archive.md>
import { readFileSync } from "node:fs";
const file = process.argv[2];
const md = readFileSync(file, "utf8");
const lines = md.split("\n");
const errors = [];

// 1. frontmatter 字段
const fm = md.split("---")[1] || "";
const required = ["suite_name","root_name","module","prd_version","prd_id","tags","status","create_at","case_count","origin"];
for (const k of required) if (!new RegExp(`^${k}:`, "m").test(fm)) errors.push(`frontmatter 缺字段: ${k}`);
if (/^description:/m.test(fm)) errors.push("frontmatter 含禁用字段 description");

// 2. 泄漏的一级标题(正文中 # 后非空且非 ## 起)
let inCode = false;
lines.forEach((l, i) => {
  if (l.startsWith("```")) inCode = !inCode;
  if (!inCode && /^# [^#]/.test(l) && i > 12) errors.push(`第 ${i+1} 行疑似泄漏一级标题: ${l.slice(0,40)}`);
});

// 3. 用例标题必带【Pn】
lines.forEach((l, i) => {
  if (/^##### /.test(l) && !/^##### 【P[0-3]】/.test(l)) errors.push(`第 ${i+1} 行用例标题缺【Pn】: ${l.slice(0,40)}`);
});

// 4. 机器标识泄漏到标题
lines.forEach((l, i) => {
  if (/^#{2,5} /.test(l) && /(TC-|SR-|RA-)/.test(l)) errors.push(`第 ${i+1} 行标题含机器标识: ${l.slice(0,40)}`);
});

// 5. case_count 一致性
const declared = (fm.match(/case_count:\s*(\d+)/)||[])[1];
const actual = (md.match(/^##### /gm)||[]).length;
if (declared && Number(declared) !== actual) errors.push(`case_count 声明 ${declared} ≠ 实际 ${actual}`);

if (errors.length) { console.error("FAIL:\n" + errors.join("\n")); process.exit(1); }
console.log(`PASS: ${actual} 例,frontmatter/层级/标题/标识 均合规`);
```

- [ ] **Step 2: 对现有 main-flow md 跑一次(应 FAIL,确认检查器有效)**

Run:
```bash
bun $FA/scripts/check-archive-format.mjs "$FA/岚图主流程用例整理.md"
```
Expected: FAIL,列出 description 字段、泄漏一级标题等当前已知问题

- [ ] **Step 3: Commit**

```bash
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-main-flow/scripts/check-archive-format.mjs
git -C .worktrees/lt-dq-case-opt commit -m "test: 🧪 add archive format checker"
```

---

## Phase 2 — 轨道 A 批次一(深度重建,9 实例)

### Task 2.1: 编写批次一 prompt-files

**Files:**
- Create: `$FA/.process/prompts/A1-dq-完整性校验.md` … `A8-dq-合理性校验.md`(8 个)
- Create: `$FA/.process/prompts/A9-数据标准.md`

- [ ] **Step 1: 写数据质量首个 prompt-file(完整示例,其余按此模板)**

写入 `$FA/.process/prompts/A1-dq-完整性校验.md`:

```markdown
先读规格包: workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/spec-pack.md,严格遵守。

# 任务: 重建「数据质量 - 完整性校验」用例片段

## 真值源(必须实际打开阅读,禁止凭记忆)
- 后端规则枚举锚点: <Task 0.4 记录的后端文件路径>
- 前端规则函数列表锚点: <Task 0.4 记录的前端文件路径>
- 已有用例(语义复用源): workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md(搜索"完整性")
- DOM: workspace/dataAssets/_shared/env/ltqc-local.yaml

## 必做
1. 从源码推导「完整性校验」大规则下的**全部小规则**清单(如 字段级-空值数、单表-表行数 等),逐条列出。这是核心,务必完整,以源码为准。
2. 每条小规则 ≥1 条用例,至少覆盖 校验通过 + 校验不通过(明细/报告展示)两个方向。
3. 按业务流(规则库→规则集→规则任务→校验结果→质量报告)串联步骤。
4. 每条用例给可执行 SQL 前置(SparkThrift2.x 方言)。

## 章节结构(严格)
\`\`\`
## 数据质量
### 完整性校验
#### <小规则1名称>
##### 【Pn】<自然中文动宾句>
> 前置条件
...(含 SQL 代码块)
> 操作步骤
1. ...
> 预期结果
1. ...
#### <小规则2名称>
...
\`\`\`

## 输出文件(只写这一个)
workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments/dq-完整性校验.md

末尾追加自检注释行。完成后用一句话报告:推导出几条小规则、共几条用例。
```

- [ ] **Step 2: 复制模板生成 A2–A8(其余 7 个大规则)**

按 A1 模板各写一个,仅替换 大规则名 + 小规则示例 + 输出 fragment 文件名:
- A2 有效性校验 → `fragments/dq-有效性校验.md`
- A3 唯一性校验 → `fragments/dq-唯一性校验.md`
- A4 统计性校验 → `fragments/dq-统计性校验.md`
- A5 自定义SQL → `fragments/dq-自定义SQL.md`
- A6 一致性校验 → `fragments/dq-一致性校验.md`
- A7 时效性校验 → `fragments/dq-时效性校验.md`
- A8 合理性校验 → `fragments/dq-合理性校验.md`

- [ ] **Step 3: 写数据标准 prompt-file(A9)**

写入 `$FA/.process/prompts/A9-数据标准.md`:同模板,任务=「数据标准」整模块:
- `数据标准-落标检查` 子模块深度重建(来源:源码 + launched-reqs「支持 dbc 标准落标检查」「落标检查任务配置环境参数」)
- 数据标准其余子模块格式标准化 + 覆盖体检
- 结构 `## 数据标准 → ### <子模块> → #### <功能点> → ##### 【Pn】用例`
- 输出 `fragments/数据标准.md`

- [ ] **Step 4: 创建 fragments 目录占位并 commit prompts**

Run:
```bash
mkdir -p "$FA/.process/fragments"
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/prompts
git -C .worktrees/lt-dq-case-opt commit -m "chore: 🧱 add track-A batch-1 codex prompts"
```

### Task 2.2: 并发派发批次一 codex

**Files:** 写入 `$FA/.process/fragments/dq-*.md`、`数据标准.md`(由 codex 写)

- [ ] **Step 1: 派发 9 个后台 job**

对 A1–A9 各执行(示例为 A1,其余替换 prompt-file 名):
```bash
node "$CODEX" task --write --background --model gpt-5.3-codex-spark --effort high \
  --cwd "$FA" \
  --prompt-file ".process/prompts/A1-dq-完整性校验.md"
```
记录每个返回的 `job-id`。
Expected: 每条返回一个 job-id,状态 running

> 资源限流:若本机吃不消 9 并发,分两小批(5 + 4)。

- [ ] **Step 2: 轮询直到全部完成**

Run:
```bash
node "$CODEX" status
```
Expected: 9 个 job 最终均 `succeeded`;失败的记下 job-id

- [ ] **Step 3: 取回失败 job 的日志(若有)**

Run:
```bash
node "$CODEX" result --job-id <failed-id> 2>&1 | tail -40
```
针对失败原因修 prompt-file 后重派该单个 job。

- [ ] **Step 4: 确认 9 个 fragment 均生成**

Run:
```bash
ls "$FA/.process/fragments/" | grep -E "dq-|数据标准"
```
Expected: 列出 dq-完整性校验.md … dq-合理性校验.md(8)+ 数据标准.md(1)

### Task 2.3: 抽检批次一 fragment 规格

**Files:** 读 `$FA/.process/fragments/*.md`

- [ ] **Step 1: 对每个 fragment 跑结构快查**

Run:
```bash
for f in "$FA"/.process/fragments/*.md; do
  echo "== $f =="; grep -cE '^##### ' "$f"; grep -cE '^#### ' "$f"; grep -L '【P' "$f"
done
```
Expected: 每个 fragment 都有 `####` 小规则层 + `#####` 用例;无缺 `【P`

- [ ] **Step 2: 人工核对数据质量小规则清单完整性**

Claude 读 8 个 dq fragment,对照 Task 0.4 源码锚点,确认每个大规则的小规则无遗漏(这是核心验收点)。缺失的回派对应 A 实例补充。

- [ ] **Step 3: Commit fragments**

```bash
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments
git -C .worktrees/lt-dq-case-opt commit -m "feat: 🧩 generate track-A batch-1 fragments (数据质量/数据标准)"
```

---

## Phase 3 — 轨道 A 批次二(格式标准化,5 实例)

### Task 3.1: 编写批次二 prompt-files

**Files:**
- Create: `$FA/.process/prompts/B1-资产盘点.md` … `B5-平台管理.md`

- [ ] **Step 1: 写 5 个模块 prompt-file**

按模板各写一个(任务=格式标准化 + 覆盖体检),分别处理:资产盘点、元数据、数据模型、数据安全、平台管理。每个:
- 输入:现有 main-flow 中该模块章节(`$FA/岚图主流程用例整理.md` 对应 `### <模块>` 段)
- 任务:就地改写为规格包格式(层级修正为 `## 模块`、标题/括号/可读性/SQL);对照源码/DOM 列功能点,缺口从 launched-reqs/源码补 1 条
- 输出:`fragments/<模块>.md`

- [ ] **Step 2: Commit**

```bash
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/prompts
git -C .worktrees/lt-dq-case-opt commit -m "chore: 🧱 add track-A batch-2 codex prompts"
```

### Task 3.2: 派发并取回批次二

- [ ] **Step 1: 派发 5 个 job(同 Task 2.2 命令,替换 prompt-file)**

Run(示例):
```bash
node "$CODEX" task --write --background --model gpt-5.3-codex-spark --effort high \
  --cwd "$FA" --prompt-file ".process/prompts/B1-资产盘点.md"
```

- [ ] **Step 2: 轮询 + 取回(同 Task 2.2 Step2-4)**

Run: `node "$CODEX" status`
Expected: 5 job succeeded,`fragments/` 下出现 5 个模块片段

- [ ] **Step 3: 结构快查 + Commit**

```bash
for f in "$FA"/.process/fragments/{资产盘点,元数据,数据模型,数据安全,平台管理}.md; do echo "== $f =="; grep -cE '^##### ' "$f"; done
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-main-flow/.process/fragments
git -C .worktrees/lt-dq-case-opt commit -m "feat: 🧩 generate track-A batch-2 fragments (5 modules)"
```

---

## Phase 4 — 轨道 A 合并 / 渲染 / 自检

### Task 4.1: 编写合并脚本并生成 archive.md

**Files:**
- Create: `$FA/scripts/assemble-archive.mjs`
- Modify: `$FA/岚图主流程用例整理.md`

- [ ] **Step 1: 写合并脚本**

```javascript
#!/usr/bin/env bun
// 按固定模块顺序拼接 fragments → archive.md,生成统一 frontmatter
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const FA = process.argv[2]; // feature dir
const fragDir = join(FA, ".process/fragments");
const ORDER = ["资产盘点","元数据","数据标准","数据模型","数据安全","平台管理",
  "dq-完整性校验","dq-有效性校验","dq-唯一性校验","dq-统计性校验","dq-自定义SQL","dq-一致性校验","dq-时效性校验","dq-合理性校验"];
let body = "";
for (const name of ORDER) {
  const f = join(fragDir, name + ".md");
  let c = readFileSync(f, "utf8").replace(/<!-- self-check:.*?-->/g, "").trim();
  body += c + "\n\n";
}
const caseCount = (body.match(/^##### /gm) || []).length;
const fm = [
  "---",
  'suite_name: "岚图主流程用例集合"',
  'root_name: "数据资产岚图定制版主流程回归用例(#23)"',
  'module: "dq"',
  'prd_version: "v6.3.x"',
  'prd_id: "lt-dq-main-flow"',
  'tags:\n  - "主流程"\n  - "回归"\n  - "岚图"\n  - "定制"',
  'status: "草稿"',
  `create_at: "2026-05-25"`,
  `case_count: ${caseCount}`,
  'origin: "case-optimization"',
  "---",""
].join("\n");
writeFileSync(join(FA, "岚图主流程用例整理.md"), fm + "\n" + body);
console.log(`assembled ${caseCount} cases`);
```

- [ ] **Step 2: 运行合并**

Run:
```bash
bun $FA/scripts/assemble-archive.mjs "$FA"
```
Expected: `assembled <N> cases`(N 显著 > 621,因数据质量按小规则扩充)

- [ ] **Step 3: Commit**

```bash
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-main-flow/scripts/assemble-archive.mjs "workspace/dataAssets/features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md"
git -C .worktrees/lt-dq-case-opt commit -m "feat: 🧩 assemble track-A archive.md from fragments"
```

### Task 4.2: 格式 + 覆盖自检

- [ ] **Step 1: 跑格式检查器(必须 PASS)**

Run:
```bash
bun $FA/scripts/check-archive-format.mjs "$FA/岚图主流程用例整理.md"
```
Expected: `PASS: <N> 例,...合规`;若 FAIL,定位到对应模块 fragment 回派 codex 修复后重跑 Task 4.1。

- [ ] **Step 2: 覆盖矩阵核对(数据质量 8×小规则)**

Run:
```bash
awk '/^## 数据质量/,0' "$FA/岚图主流程用例整理.md" | grep -E '^### |^#### ' | head -120
```
Expected: 8 大规则 `###` 齐全,每个大规则下小规则 `####` 列表完整(对照 Task 2.3 Step2 的源码清单)

- [ ] **Step 3: 模块功能点覆盖体检**

Claude 对照源码/DOM,确认 7 模块每功能点 ≥1 例;缺口回派对应实例补。

### Task 4.3: 重生成 xmind

**Files:**
- Modify: `$FA/scripts/build-main-flow-xmind.mjs`(按需,确保读新 md)
- Modify: `$FA/岚图主流程用例整理.xmind`

- [ ] **Step 1: 运行 xmind 生成**

Run:
```bash
cd $ROOT && bun "$FA/scripts/build-main-flow-xmind.mjs"
```
Expected: 生成 `岚图主流程用例整理.xmind`,无报错;若脚本硬编码旧结构,改为读 archive.md 后重跑。备选:`bun engine/bin/kata xmind-gen --input "$FA/岚图主流程用例整理.md"`

- [ ] **Step 2: 校验 xmind 与 md 用例数一致**

Run:
```bash
node "$FA/scripts/build-main-flow-xmind.mjs" --verify 2>/dev/null || unzip -p "$FA/岚图主流程用例整理.xmind" content.json | grep -o '验证' | wc -l
```
Expected: xmind 节点数与 md `#####` 数量量级一致

- [ ] **Step 3: Commit**

```bash
git -C .worktrees/lt-dq-case-opt add "workspace/dataAssets/features/2099-01-lt-dq-main-flow/岚图主流程用例整理.xmind" workspace/dataAssets/features/2099-01-lt-dq-main-flow/scripts/
git -C .worktrees/lt-dq-case-opt commit -m "feat: 🗂️ regenerate track-A xmind"
```

---

## Phase 5 — 轨道 B(launched-reqs)

### Task 5.1: 编写 7 个版本 prompt-files

**Files:**
- Create: `$FB/.process/prompts/V-v6.4.2.md` … `V-v6.4.10.md`(7 个,版本: 6.4.2/6.4.3/6.4.4/6.4.5/6.4.6/6.4.8/6.4.10)

- [ ] **Step 1: 写版本 prompt-file 模板(以 v6.4.2 为例)**

写入 `$FB/.process/prompts/V-v6.4.2.md`:
```markdown
先读规格包: ../../2099-01-lt-dq-main-flow/.process/spec-pack.md(若相对路径不通,用绝对路径 $FA/.process/spec-pack.md)。

# 任务: 标准化 launched-reqs 的 v6.4.2 版本用例片段

## 输入
workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/岚图已上线需求主流程用例.md 中 `## v6.4.2` 整段(到下一个 `## v` 之前)。

## 必做
1. **保留** `## v6.4.2 → ### 需求名 → ##### 用例` 组织,不重组、不删减用例。
2. 全量按规格包格式标准化:层级/标题【Pn】/括号「」/可读换行/去机器标识。
3. 有数据依赖的用例补可执行 SQL 前置(SparkThrift2.x;按源码核对字段)。
4. 按钮/toast 文案对照源码/DOM 修正。

## 输出文件(只写这一个)
workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/.process/fragments-launched/v6.4.2.md
末尾追加自检注释。报告:标准化了几条用例。
```

- [ ] **Step 2: 复制生成其余 6 个版本 prompt-file**,仅替换版本号与输出文件名。

- [ ] **Step 3: 建目录并 Commit**

```bash
mkdir -p "$FB/.process/fragments-launched"
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/.process/prompts
git -C .worktrees/lt-dq-case-opt commit -m "chore: 🧱 add track-B per-version codex prompts"
```

### Task 5.2: 派发并取回轨道 B

- [ ] **Step 1: 先派 v6.4.2 单个 job,产出后抽检规格**

Run:
```bash
node "$CODEX" task --write --background --model gpt-5.3-codex-spark --effort high \
  --cwd "$FB" --prompt-file ".process/prompts/V-v6.4.2.md"
node "$CODEX" status
```
抽检 `$FB/.process/fragments-launched/v6.4.2.md` 合规后再继续。

- [ ] **Step 2: 并发派其余 6 个版本 job**(同命令,替换 prompt-file)

Expected: 7 个 fragment 全部生成于 `fragments-launched/`

- [ ] **Step 3: Commit**

```bash
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/.process/fragments-launched
git -C .worktrees/lt-dq-case-opt commit -m "feat: 🧩 generate track-B per-version fragments"
```

### Task 5.3: 合并 / 渲染 / 自检轨道 B

**Files:**
- Create: `$FB/scripts/assemble-archive.mjs`(改 ORDER 为版本序)
- Modify: `$FB/岚图已上线需求主流程用例.md`、`.xmind`

- [ ] **Step 1: 写合并脚本(版本序)**

复用 Task 4.1 脚本,`ORDER = ["v6.4.2","v6.4.3","v6.4.4","v6.4.5","v6.4.6","v6.4.8","v6.4.10"]`,frontmatter 用 `suite_name: "岚图已上线需求主流程用例"`、`prd_id: "lt-dq-launched-reqs"`、读 `fragments-launched/`。

- [ ] **Step 2: 合并 + 格式检查(必须 PASS)**

Run:
```bash
bun $FB/scripts/assemble-archive.mjs "$FB"
bun $FA/scripts/check-archive-format.mjs "$FB/岚图已上线需求主流程用例.md"
```
Expected: `assembled 1216 cases`(数量不应少于原 1216);check `PASS`

- [ ] **Step 3: 重生成 xmind**

Run:
```bash
cd $ROOT && bun "$FB/scripts/build-delivery-xmind.mjs"
```
Expected: 生成 `.xmind` 无报错

- [ ] **Step 4: Commit**

```bash
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/features/2099-01-lt-dq-launched-reqs/
git -C .worktrees/lt-dq-case-opt commit -m "feat: 🗂️ assemble and render track-B (launched-reqs)"
```

---

## Phase 6 — 知识沉淀与收尾

### Task 6.1: 沉淀权威小规则清单 + 新踩坑

**Files:**
- Modify/Create: `$ROOT/workspace/dataAssets/_shared/knowledge/modules/data-quality.md` 或新建 `knowledge/modules/dq-rule-taxonomy.md`

- [ ] **Step 1: 触发 knowledge-curate**

调用 `/knowledge-curate`,把 codex 从源码推导出的「8 大规则 → 全部小规则」权威清单、新发现的按钮/toast/前置 SQL 踩坑沉淀入库(注明 source = 源码 release_6.3.x_ltqc)。

- [ ] **Step 2: 确认入库**

Run:
```bash
ls $ROOT/workspace/dataAssets/_shared/knowledge/modules/
```
Expected: 含规则分类法清单文件

- [ ] **Step 3: Commit**

```bash
git -C .worktrees/lt-dq-case-opt add workspace/dataAssets/_shared/knowledge/
git -C .worktrees/lt-dq-case-opt commit -m "docs: 📚 curate dq rule taxonomy and new pitfalls"
```

### Task 6.2: 更新 manifest/metadata + 终检 + 收尾

**Files:**
- Modify: `$FA/manifest.json`、`$FA/metadata.yaml`、`$FB/manifest.json`、`$FB/metadata.yaml`

- [ ] **Step 1: 更新两个 feature 的 case_count / updated_at / archive sha**

把 manifest `case_drafting.archive_path` sha、metadata `updated_at: 2026-05-25` 同步为最新(若有现成 `kata` 命令则用,否则手改)。

- [ ] **Step 2: 终检两轨格式**

Run:
```bash
bun $FA/scripts/check-archive-format.mjs "$FA/岚图主流程用例整理.md"
bun $FA/scripts/check-archive-format.mjs "$FB/岚图已上线需求主流程用例.md"
```
Expected: 两条均 `PASS`

- [ ] **Step 3: 跑相关测试(改后即测)**

Run:
```bash
cd $ROOT && bun run test:ai-core 2>&1 | tail -20
```
Expected: 通过(本任务主要动 workspace 产物,若无相关测试则确认无回归)

- [ ] **Step 4: Commit + 合并回 main**

```bash
git -C .worktrees/lt-dq-case-opt add -A
git -C .worktrees/lt-dq-case-opt commit -m "chore: 🧹 sync manifest/metadata for lt-dq case optimization"
```
按 `finishing-a-development-branch` 决定合并/PR 方式(默认:验证通过后合并回 main 并推送,清理 worktree)。

---

## 计划自检结果

- **Spec 覆盖**:§3 架构→Phase2/3/5;§4 规格包→Task1.1;§5 数据质量重组→Task2.1/2.3;§6 数据标准→Task2.1 A9;§7 非重点模块→Phase3;§8 合并/渲染/自检→Phase4/5.3;§9 前置→Phase0;§10 验收→Task4.2/5.3/6.2;轨道 B→Phase5。无未覆盖项。
- **占位扫描**:`<FRONTEND_URL>`/`<BACKEND_URL>`/`<Task 0.4 锚点>` 为运行期才知的真实值(已在对应 Task 用 AskUser/调研步骤显式获取),非可提前填的占位。
- **类型/命名一致**:`check-archive-format.mjs`、`assemble-archive.mjs`、`fragments/`、`fragments-launched/`、job 派发命令 在各 Phase 引用一致。
