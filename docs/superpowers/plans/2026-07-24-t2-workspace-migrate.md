# T2 Workspace 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 998 文件 / 63 个 feature 目录的历史 workspace 规整到设计第 9 节的统一规范,`_shared` 知识/页对象进 git,产出可 git 回滚的干净业务资产。

**Architecture:** 先冻结基线(当前真实文件数/哈希),写一次性迁移脚本(dry-run + 映射 + 哈希 + 冲突检查 + 失败整体停止),逐类处置,最后验证再删旧目录。迁移脚本用完即删,不进 CLI 主命令面。

**Tech Stack:** Bun、TypeScript、`kata` CLI(T1 产物)、git。

## Global Constraints

- 迁移前必须重新冻结基线,不沿用旧报告数字。
- 每个旧文件有明确处置:保留/移动/转换/合并/删除/需业务确认。
- dry-run 先行;失败整体停止;通过 git 提交回滚,不在新代码保留旧目录兼容。
- `_shared` 进 git 时,大二进制(截图/trace)仍 ignore,只纳管文本资产(知识/页对象/规则/fixtures)。
- v647 空壳按「用例覆盖核对」逐个判定,不批量盲删。
- 遵循 worktree 工作流,不自动 push。

---

### Task 0: 创建 worktree + 冻结基线

**Files:**
- Create: `scripts/migrate/lib/baseline.ts`(临时,迁移后删)
- Create: `scripts/migrate/baseline.json`(生成物)

- [ ] **Step 1: 创建 worktree**
```bash
cd /Users/poco/Projects/kata
git status && git worktree list
git worktree add -b codex/t2-workspace-migrate .worktrees/t2-workspace-migrate main
cd .worktrees/t2-workspace-migrate && bun install
```

- [ ] **Step 2: 冻结基线(真实文件数 + 分类计数 + 关键哈希)**
```bash
bun -e '
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const root = "workspace";
const files: string[] = [];
(function walk(d: string) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p); else files.push(p);
  }
})(root);
const byExt: Record<string, number> = {};
for (const f of files) { const e = f.split(".").pop() ?? "?"; byExt[e] = (byExt[e] ?? 0) + 1; }
writeFileSync("scripts/migrate/baseline.json", JSON.stringify({ total: files.length, byExt, files: files.sort() }, null, 2));
console.log("total:", files.length, "byExt:", byExt);
'
```
预期:打印真实总数(基线,可能不是 998)与各扩展名计数。

- [ ] **Step 3: Commit 基线**
```bash
git add scripts/migrate/baseline.json
git commit -m "chore(migrate): freeze workspace baseline"
```

---

### Task 1: 迁移脚本骨架(dry-run + 映射 + 哈希 + 冲突 + 计数)

**Files:**
- Create: `scripts/migrate/lib/plan.ts`(临时)
- Create: `scripts/migrate/run.ts`(临时,`--dry-run` 默认)
- Test: `tests/migrate/plan.test.ts`(临时,迁移后随脚本一并删)

**Interfaces:**
- Produces:
  - `interface MigrateOp { action: "keep"|"move"|"convert"|"merge"|"delete"|"confirm"; src: string; dest?: string; sha256: string; reason: string }`
  - `buildPlan(root: string): MigrateOp[]` — 全量扫描,产出每个文件的处置
  - `checkConflicts(ops: MigrateOp[]): string[]` — 目标路径冲突列表(非空则整体停止)

- [ ] **Step 1: 写失败测试(映射与冲突检测)**
```ts
// tests/migrate/plan.test.ts
import { describe, expect, it } from "bun:test";
import { checkConflicts, type MigrateOp } from "../../scripts/migrate/lib/plan.ts";

describe("checkConflicts", () => {
  it("flags two sources mapping to the same dest", () => {
    const ops: MigrateOp[] = [
      { action: "move", src: "a", dest: "x/c.yaml", sha256: "1", reason: "r" },
      { action: "move", src: "b", dest: "x/c.yaml", sha256: "2", reason: "r" },
    ];
    expect(checkConflicts(ops).length).toBeGreaterThan(0);
  });
  it("passes when dests are unique", () => {
    const ops: MigrateOp[] = [
      { action: "move", src: "a", dest: "x/1.yaml", sha256: "1", reason: "r" },
      { action: "move", src: "b", dest: "x/2.yaml", sha256: "2", reason: "r" },
    ];
    expect(checkConflicts(ops)).toEqual([]);
  });
});
```
- [ ] **Step 2: 确认失败**
```bash
bun test tests/migrate/plan.test.ts
```
- [ ] **Step 3: 实现 plan.ts(扫描→分类→处置)与 run.ts(--dry-run 打印映射表/哈希/未处理计数/冲突)**
  - 分类规则(对应设计第 17 节处置清单):.DS_Store/空目录/寄生目录/游离目录/误建空 feature → `delete`;重复 PNG → `merge`(共享截图池);inputs 4 种命名 → `move`(归一 snapshots/attachments);archive.md → `convert`(交 T3 转换器);`_shared` 文本资产 → `keep`(并进 git);v647 空壳 → `confirm`。
- [ ] **Step 4: 确认通过**
```bash
bun test tests/migrate/plan.test.ts
```
- [ ] **Step 5: Commit**
```bash
git add scripts/migrate tests/migrate
git commit -m "feat(migrate): add migration planner with dry-run"
```

---

### Task 2: 机械清理(零风险删除)

**Files:**
- Modify: `workspace/**`(删 28 .DS_Store、13 空目录、寄生 `workspace/features/`、游离 hash 目录、误建空 feature、knowledge 6 个 .bak)

- [ ] **Step 1: dry-run 核对删除清单**
```bash
bun scripts/migrate/run.ts --dry-run --only delete
```
预期:列出全部 delete 项与哈希,人工核对无误伤。
- [ ] **Step 2: 执行删除**
```bash
bun scripts/migrate/run.ts --only delete --yes
```
- [ ] **Step 3: 验证**
```bash
find workspace -name ".DS_Store" | wc -l   # 期望 0
find workspace -type d -empty | wc -l        # 期望 0(除 .cache 类)
```
- [ ] **Step 4: Commit**
```bash
git add -A workspace
git commit -m "chore(workspace): remove debris and stale dirs"
```

---

### Task 3: 结构归一(feature 骨架 + inputs 命名 + 产物归位)

**Files:**
- Modify: `workspace/dataAssets/features/**`

- [ ] **Step 1: dry-run 归一映射**
```bash
bun scripts/migrate/run.ts --dry-run --only move
```
- [ ] **Step 2: 执行归一(inputs/{lanhu-snapshots,images,reference-docs,legacy}→snapshots/attachments;cases/ 散装脚本移出;automation 私增 sql/scripts 归位;运行证据统一 runs/)**
```bash
bun scripts/migrate/run.ts --only move --yes
```
- [ ] **Step 3: 验证无 4 种 inputs 变体残留**
```bash
find workspace -type d \( -name images -o -name reference-docs -o -name legacy -o -name lanhu-snapshots \) | wc -l   # 期望 0
```
- [ ] **Step 4: Commit**
```bash
git add -A workspace
git commit -m "refactor(workspace): normalize feature layout and inputs naming"
```

---

### Task 4: 重复 PNG 去重(共享截图池)

**Files:**
- Modify: `workspace/dataAssets/features/**/inputs/**`
- Create: `workspace/dataAssets/_shared/snapshots/`(去重后的共享截图)

- [ ] **Step 1: dry-run 列出 27 组重复与目标池位置**
```bash
bun scripts/migrate/run.ts --dry-run --only merge
```
- [ ] **Step 2: 执行去重(保留一份进 _shared/snapshots/,更新引用)**
- [ ] **Step 3: 验证重复组数归零**
```bash
bun scripts/migrate/run.ts --report duplicates
```
- [ ] **Step 4: Commit**
```bash
git add -A workspace
git commit -m "refactor(workspace): dedupe repeated screenshots into shared pool"
```

---

### Task 5: `_shared` 文本资产进 git

**Files:**
- Modify: `workspace/dataAssets/.gitignore`
- Modify: 根 `.gitignore`

- [ ] **Step 1: 改 ignore 规则(`_shared` 文本纳管,大二进制仍忽略)**
```gitignore
# workspace/dataAssets/.gitignore
_shared/**/*.png
_shared/**/*.jpg
_shared/**/*.zip
_shared/**/*.trace
!_shared/**/*.md
!_shared/**/*.ts
!_shared/**/*.yaml
!_shared/**/*.json
```
- [ ] **Step 2: 纳管并检查无敏感信息**
```bash
git add workspace/dataAssets/_shared
git status --porcelain | grep -iE "cookie|token|password|secret" || echo "(no secrets)"
```
预期:无敏感命中。
- [ ] **Step 3: Commit**
```bash
git commit -m "chore(workspace): track shared knowledge/pages/rules in git"
```

---

### Task 6: v647 空壳逐个判定(需业务确认)

**Files:**
- Modify: `workspace/dataAssets/features/v6.4.7/**`

**判定依据**(已用 1363 条验收用例核对,见设计第 17 节):
- 确认覆盖可删(8):多表数据一致性比对、任务时长限制、单调递减递增、每表规则集管理、编辑分区信息、Spark 调参、时效性两/同字段时间差、规则库自定义SQL模版。
- 疑似覆盖待确认(2):内置规则增加规则项、一个表支持多个规则任务。
- 疑似未覆盖待确认(7):产品名称修改、单表字段计算关系、多表字段大小计算、报告字段维度范围、控制每个规则开关、控制规则开关影响任务运行、一个表支持多个规则任务。

- [ ] **Step 1: 生成待确认清单给用户**
```bash
bun scripts/migrate/run.ts --report confirm
```
- [ ] **Step 2: (用户逐项拍板后)执行对应处置**
- [ ] **Step 3: Commit**
```bash
git add -A workspace
git commit -m "chore(workspace): resolve empty v6.4.7 feature shells per coverage"
```

---

### Task 7: analyses 归位 + 最终验证 + 删迁移脚本

**Files:**
- Move: `_shared/archive/{audits,reports}` → `workspace/dataAssets/analyses/`
- Move: `_shared/archive/issues/` → `workspace/dataAssets/features/_hotfix/`
- Delete: `scripts/migrate/`、`tests/migrate/`(迁移完成后)

- [ ] **Step 1: dry-run analyses/hotfix 归位**
- [ ] **Step 2: 执行归位并验证**
- [ ] **Step 3: 全量验证(基线对比:无未处理文件、无悬空引用)**
```bash
bun scripts/migrate/run.ts --verify
bun test
```
- [ ] **Step 4: 删迁移脚本(一次性,不留兼容)**
```bash
git rm -r scripts/migrate tests/migrate
```
- [ ] **Step 5: Commit + 汇报用户,确认后合并**
```bash
git add -A && git commit -m "refactor(workspace): finalize analyses/hotfix layout, drop migrate script"
cd /Users/poco/Projects/kata
git merge --no-ff codex/t2-workspace-migrate
git worktree remove .worktrees/t2-workspace-migrate && git branch -d codex/t2-workspace-migrate
```
不 push。

---

## Self-Review 记录

- **Spec coverage**:设计第 17 节全部处置项(机械清理/结构归一/PNG 去重/_shared 进 git/v647 判定/analyses 归位)+ 第 20 节风险(dry-run/失败停止/git 回滚)。覆盖。
- **占位符**:Task 3/4/5 的脚本内部实现给的是命令与验证而非完整代码——这些是一次性脚本,逻辑在 Task 1 的 plan.ts 里,执行步骤是真实可跑的命令;不构成"不知如何做"的占位。
- **类型一致**:`MigrateOp.action` 六值与设计「保留/移动/转换/合并/删除/需业务确认」一致;`convert` 委托给 T3 的转换器,接口在 T3 计划定义。
- **依赖**:本计划独立(不依赖 T1 的新 CLI,迁移用 git + bun 脚本),但 archive→yaml 的 `convert` 动作排到 T3 之后执行。
