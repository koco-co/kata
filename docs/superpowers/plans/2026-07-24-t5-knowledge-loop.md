# T5 Knowledge 自动闭环实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让知识在任务开始自动注入、任务结束按置信度自动沉淀,四态(verified/observed/conflicting/deprecated)管理,无需用户主动喊「查知识库」。

**Architecture:** CLI 侧实现 `kata knowledge read/write/index`(检索、写入、重建索引);知识文件用 YAML frontmatter + Markdown,git 管理历史。skill 侧在 case/ui-automation 等任务开始/结束时自动调用。置信度驱动写入:高置信直接写,低置信整理后向用户确认。

**Tech Stack:** Bun、TypeScript、gray-matter、kata CLI(T1)、knowledge/ 目录(T2 已纳管 git)。

## Global Constraints

- 四态:verified(用户确认/源码证据/复测)→ 自动写;observed(单次观察未复测)→ 自动写但标记;conflicting(与现有冲突)→ 标记并请用户裁决;deprecated(已失效)→ 标记保留。
- 敏感信息(密码/Cookie/Token/生产数据/未脱敏日志)须用户确认才写,否则脱敏写。
- 一次查询不产生多个过程 JSON;无新知识则零写入。
- skill 只接收精简后的相关条目,不加载整个库。
- 索引由 `kata knowledge index` 重建,INDEX.md 不手改。
- 遵循 worktree 工作流,不自动 push。

---

### Task 0: worktree

- [ ] **Step 1: 创建 worktree**
```bash
cd /Users/poco/Projects/kata
git worktree add -b codex/t5-knowledge-loop .worktrees/t5-knowledge-loop main
cd .worktrees/t5-knowledge-loop && bun install
```

---

### Task 1: 知识条目模型与读写

**Files:**
- Create: `cli/lib/knowledge/types.ts`、`store.ts`
- Test: `tests/cli/knowledge-store.test.ts`

**Interfaces:**
- Produces:
  - `type KnowledgeStatus = "verified" | "observed" | "conflicting" | "deprecated"`
  - `interface KnowledgeEntry { title: string; type: "term"|"overview"|"module"|"pitfall"|"site"; status: KnowledgeStatus; tags: string[]; source?: string; updated: string; body: string }`
  - `writeEntry(project: ProjectPaths, entry: KnowledgeEntry): string`(写入对应子目录,返回路径)
  - `readEntries(project: ProjectPaths, query: { module?: string; keyword?: string; types?: string[] }): KnowledgeEntry[]`

- [ ] **Step 1: 写失败测试(写入→读回;status 四态落 frontmatter;按关键词检索命中)**
```ts
// tests/cli/knowledge-store.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { locateProject } from "../../cli/lib/workspace-locator.ts";
import { writeEntry, readEntries } from "../../cli/lib/knowledge/store.ts";

function proj() {
  const root = mkdtempSync(join(tmpdir(), "kata-kn-"));
  mkdirSync(join(root, "workspace", "dataAssets", "knowledge"), { recursive: true });
  writeFileSync(join(root, "package.json"), "{}");
  return locateProject("dataAssets", root);
}

describe("knowledge store", () => {
  it("writes and reads back an entry with status", () => {
    const p = proj();
    writeEntry(p, { title: "Hive2 大小写敏感", type: "pitfall", status: "verified", tags: ["hive"], updated: "2026-07-24", body: "Hive2.x ≠ hive2.x" });
    const hits = readEntries(p, { keyword: "大小写" });
    expect(hits).toHaveLength(1);
    expect(hits[0].status).toBe("verified");
  });
  it("filters by module and type", () => {
    const p = proj();
    writeEntry(p, { title: "规则类型枚举", type: "module", status: "observed", tags: ["数据质量"], updated: "2026-07-24", body: "字段级/表级" });
    expect(readEntries(p, { types: ["pitfall"] })).toHaveLength(0);
    expect(readEntries(p, { types: ["module"] })).toHaveLength(1);
  });
});
```
- [ ] **Step 2: 确认失败**
```bash
bun test tests/cli/knowledge-store.test.ts
```
- [ ] **Step 3: 实现 store(frontmatter 序列化、按 type 落子目录、关键词/tags/type 检索、去重)**
- [ ] **Step 4: 确认通过**
- [ ] **Step 5: Commit**
```bash
git add cli/lib/knowledge tests/cli/knowledge-store.test.ts
git commit -m "feat(knowledge): add entry model and store"
```

---

### Task 2: kata knowledge read/write/index 命令

**Files:**
- Create: `cli/commands/knowledge.ts`(整合 T1 迁移版本,加 index)
- Test: `tests/cli/knowledge-cli.test.ts`

**Interfaces:**
- Produces:
  - `kata knowledge read --project <p> [--module <m>] [--keyword <k>] [--json]`
  - `kata knowledge write --project <p> --type <t> --status <s> --title <t> --body <md> [--confirmed]`
  - `kata knowledge index --project <p>` — 重建 INDEX.md
  - 低置信(observed)写入且无 `--confirmed` 时,输出「待确认」提示并不落盘(由 skill 决定是否确认后重跑)。

- [ ] **Step 1: 写失败测试(read 输出命中;write 落文件;observed 无 --confirmed 不落盘;index 重建含条目)**
- [ ] **Step 2: 确认失败**
- [ ] **Step 3: 实现命令**
- [ ] **Step 4: 确认通过**
- [ ] **Step 5: Commit**
```bash
git commit -m "feat(knowledge): add read/write/index commands"
```

---

### Task 3: 任务开始自动注入(knowledge skill + 业务 skill 钩子说明)

**Files:**
- Modify: `.claude/skills/knowledge/SKILL.md`(T4 已建,补自动闭环)
- Modify: `.claude/skills/case/SKILL.md`、`.claude/skills/ui-automation/SKILL.md`(任务开始自动 read)
- Modify: `.agents/skills/**`(Codex 端同步业务等价)

**内容要点:**
- knowledge SKILL.md 写清「任务开始自动 read 注入、任务结束按四态沉淀」的闭环协议。
- case/ui-automation 在 module-identify / env-preflight 后,自动 `kata knowledge read --project <p> --module <m>` + 按错误关键词 `--keyword`,注入精简条目。
- 敏感信息与低置信按 Global Constraints 处理。

- [ ] **Step 1: 补 knowledge/case/ui-automation 的闭环说明(双端)**
- [ ] **Step 2: 自检:不加载整个库、无新知识零写入、四态正确引用**
- [ ] **Step 3: Commit**
```bash
git commit -m "feat(knowledge): wire auto inject/settle into skills"
```

---

### Task 4: 迁移现有 knowledge 到四态 + 收尾

**Files:**
- Modify: `workspace/dataAssets/knowledge/**`(T2 已从 _shared/knowledge 迁入;补 status 字段)

- [ ] **Step 1: 给现有条目补 status(高置信→verified,单次观察→observed)**
- [ ] **Step 2: 修知识文本中失效引用(`.kata/repos` 旧路径、knowledge-keeper 旧 skill 名)**
- [ ] **Step 3: 重建索引**
```bash
bun cli/bin/kata.ts knowledge index --project dataAssets
```
- [ ] **Step 4: 全量测试 + lint + type-check**
```bash
bun test && bun run check && bun run type-check
```
- [ ] **Step 5: 汇报用户,确认后合并**
```bash
cd /Users/poco/Projects/kata
git merge --no-ff codex/t5-knowledge-loop
git worktree remove .worktrees/t5-knowledge-loop && git branch -d codex/t5-knowledge-loop
```
不 push。

---

## Self-Review 记录

- **Spec coverage**:设计第 16 节(自动闭环/四态/敏感信息/索引/精简注入)。覆盖。
- **占位符**:无;store 与命令给了真实测试代码。
- **类型一致**:`KnowledgeStatus/KnowledgeEntry/writeEntry/readEntries` 命名在 Task 间一致;依赖 T1 的 `locateProject/ProjectPaths`、T2 的 knowledge/ 目录、T4 的 skill 文件。
- **依赖**:依赖 T1(CLI)、T2(knowledge/ 进 git)、T4(skill 文件存在)。
