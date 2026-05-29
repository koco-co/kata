# P2 Event Journal Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建 E backbone 脊柱的全部 engine-side 组件（不含 skill 接入）：per-session JSONL event journal（19 event_kinds + 单调 seq + atomic append + fail-closed）、stage+commit staged-transaction 前两阶段（事件写）、blackboard projector（validator-enforced，未声明 slot 写入时 emit `validator_failed`）、last-event notify projector（debounce + atomic rename）、`kata events` CLI 五子命令（按 spec §9.7 命令面）、Phase Dispatcher 决策契约 + 显式 dispatch envelope 让 orchestrator 消费。P2 收尾时 backbone 所有单元测试 PASS；真实 skill 接入与 end-to-end phase 序列由 P3#7 case-draft 迁移落地。

**Architecture:** 在**现有** `engine/src/runtime/` 目录（P1 前已含 `projection-targets.ts` path helper，**必须保留不动**）新增 backbone 模块（`event-writer.ts` / `event-validator.ts` / `session.ts` / `staged-transaction.ts` / `blackboard.ts` / `projector.ts` / `phase-dispatcher.ts`）；升级 `engine/src/telemetry/runtime-telemetry.ts` 的 `validateTelemetryEvent` 到 `event-validator.ts` 的 19 event_kinds + 完整 envelope；新增 `kata events` 子命令组（tail / replay / stats / validate / project）；通过 6.a → 6.b 两 commit 拆分 —— 6.a 实现 writer + validator + session + staged-transaction 的 stage+commit（artifact 写入 + sha256 + emit `artifact_written`），6.b 接入 blackboard projection + notify projection + 完成 staged-transaction 的 project 阶段（含失败时 emit `projection_failed` 补偿事件）+ phase-dispatcher + CLI。

**Tech Stack:** TypeScript（Bun runtime）、`node:fs` atomic-rename + `O_APPEND` + `flock`（用 `proper-lockfile` package 或 `fs.openSync(O_EXLOCK)` POSIX advisory lock）、`crypto.createHash("sha256")`、`commander`、`yaml`、`bun:test`。

---

## Pre-flight

- [ ] **Step P0.1: 确认 P1 已合并到 main**

  Run: `git -C /Users/poco/Projects/kata log --oneline -10 | grep -E "P1 cleanup|workflow v2|skill graph to manifest"`
  Expected: 见 P1 7 commits + merge commit。若未合则停下，先按 P1 plan 完整 merge 再启动 P2。

- [ ] **Step P0.2: 主工作树无未提交改动**

  Run: `git status --short`
  Expected: 空输出。

- [ ] **Step P0.3: 创建 detached worktree**

  Run:
  ```bash
  git worktree add --detach .worktrees/p2-event-core main
  ROOT=$(pwd) && W="$ROOT/.worktrees/p2-event-core"
  mkdir -p "$W/workspace"
  for proj in "$ROOT"/workspace/*/; do
    name=$(basename "$proj")
    ln -s "$ROOT/workspace/$name/.kata" "$W/workspace/$name/.kata"
  done
  cd "$W" && bun install
  ```
  Expected: 依赖装好；`bun test --cwd engine` 基线绿；记录 baseline pass/fail/skip 计数。

- [ ] **Step P0.4: 加 `proper-lockfile` 依赖**

  Run: `bun add proper-lockfile && bun add -d @types/proper-lockfile`
  Expected: `package.json` 出现 `proper-lockfile` 项；`bun.lock` 更新。

- [ ] **Step P0.5: 在 Bun 1.3+ 下 smoke 测 `proper-lockfile` 实际可用**

  Run inside worktree:
  ```bash
  bun -e '
  import lockfile from "proper-lockfile";
  import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  const dir = mkdtempSync(join(tmpdir(), "lock-smoke-"));
  const p = join(dir, "shared.jsonl");
  writeFileSync(p, "");
  const r = await lockfile.lock(p, { retries: { retries: 3 } });
  console.log("locked");
  await r();
  console.log("released");
  rmSync(dir, { recursive: true, force: true });
  '
  ```
  Expected: stdout `locked\nreleased`，无 exception。
  Fallback: 若 `proper-lockfile` 在 Bun runtime 报 `EPERM` / `not implemented` 之类错误，改用 `import { openSync, closeSync } from "node:fs"` + `O_EXLOCK` POSIX flag（macOS / Linux 支持；Windows 不支持，但 kata 主用户在 macOS / Linux）。改用 O_EXLOCK 时同步更新 step 6.a.8 的 `appendIndexEntry` 实现并在 plan 顶端 Tech Stack 段补声明。

  Note: P2 commit 6.a 用此 lock 给 `events.index.jsonl` 加 advisory lock（spec §9.4 "Index 并发 S2"）；不引入其它新 dep。

---

## Commit 6.a：event journal core (writer + validator + session + staged stage/commit)

**Why this commit exists:** spec §11 P2#6.a 字面要求 "staged transaction + 单调 seq + atomic append"。spec §9.4 三阶段（stage / commit / project）中**前两阶段**（写 artifact 临时文件 + sha256 + atomic-rename + append `artifact_written`）不依赖 blackboard / projector，可以在本 commit 完整落地；**第三阶段** project（applyDelta + notify projection + 失败时 emit `projection_failed`）依赖 6.b 的 blackboard / projector，在 6.b 接入。这种拆分保持 spec 6.a 的字面交付边界，同时避免在 6.a 引入空接口。

`runtime-telemetry.ts` 保留为 adapter（call into event-validator），等 P3 完成 case-draft 迁移后再删（spec §12.1 旧→新模块迁移表）。

**Files:**
- Create: `engine/src/runtime/event-validator.ts` —— 19 event_kinds + 完整 envelope（spec §9.2 + §9.3）
- Create: `engine/src/runtime/event-writer.ts` —— atomic append + 单调 seq + advisory lock
- Create: `engine/src/runtime/session.ts` —— `run_id` 生成（ULID 风格 `run_<26 base32>`）+ session 生命周期 + `Map<run_id, EventWriter>` 单例（同一 run_id 二次 `openSession` 复用同 writer，避免跨 writer 写出重复 seq）+ `lastSeq()` 查询
- Create: `engine/src/runtime/staged-transaction.ts` —— spec §9.4 stage（tmp 写 + sha256 + 可选 artifact validator）+ commit（atomic-rename + emit `artifact_written`）；project 阶段在 6.b 增补
- Create: `.claude/contracts/schemas/event.json` —— JSON Schema 2020-12 envelope（spec §9.2）；19 event_kind enum
- Modify: `engine/src/telemetry/runtime-telemetry.ts` —— 改为 thin adapter，内部 delegate 给 `event-validator.ts`；保导出 `validateTelemetryEvent` 名以免破现有调用者
- Create: `engine/tests/runtime/event-validator.test.ts`
- Create: `engine/tests/runtime/event-writer.test.ts`
- Create: `engine/tests/runtime/session.test.ts`
- Create: `engine/tests/runtime/event-writer-stress.test.ts` —— 并发 / fail-closed
- Create: `engine/tests/runtime/staged-stage-commit.test.ts` —— stage 失败、commit (rename) 失败、commit (event append) 失败 三路径
- Modify: `engine/tests/large-file-split.test.ts` —— 加 4 个新文件 entry

### Event envelope schema（spec §9.2 完整版）

`.claude/contracts/schemas/event.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.local/schemas/event.json",
  "title": "Event Envelope (E backbone v1)",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "schema_version",
    "seq",
    "event_id",
    "ts",
    "run_id",
    "feature_id",
    "skill_id",
    "skill_version",
    "workflow_id",
    "event_kind",
    "status"
  ],
  "properties": {
    "schema_version": { "const": 1 },
    "seq":            { "type": "integer", "minimum": 0 },
    "event_id":       { "type": "string", "pattern": "^evt_[A-Za-z0-9]{26}$" },
    "ts":             { "type": "string", "format": "date-time" },
    "run_id":         { "type": "string", "pattern": "^run_[A-Za-z0-9]{26}$" },
    "feature_id":     { "type": "string", "minLength": 1 },
    "skill_id":       { "type": "string", "minLength": 1 },
    "skill_version":  { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "workflow_id":    { "type": "string", "minLength": 1 },
    "phase":          { "type": ["string", "null"] },
    "event_kind":     { "enum": [
      "session_started", "session_ended",
      "phase_entered", "phase_exited",
      "decision_made", "artifact_written",
      "command_ran", "plugin_invoked", "plugin_failed",
      "validator_failed", "blocked",
      "human_gate_opened", "human_gate_resolved",
      "subagent_dispatched", "subagent_completed", "subagent_failed",
      "handoff_emitted", "skill_routed", "projection_failed"
    ]},
    "status":         { "enum": ["ok", "blocked", "failed", "resolved"] },
    "agent_id":       { "type": "string" },
    "prompt_id":      { "type": "string" },
    "plugin_id":      { "type": "string" },
    "input_tokens":   { "type": "integer", "minimum": 0 },
    "output_tokens":  { "type": "integer", "minimum": 0 },
    "rule_id":        { "type": "string" },
    "hashed_artifact_ref": { "type": "string", "pattern": "^sha256:[a-f0-9]{64}$" },
    "payload":            { "type": "object" },
    "blackboard_delta":   { "type": "object" }
  }
}
```

### Run / Event ID 生成约定

- `run_id` 格式：`run_<26 字符 Crockford base32>`，时间序前缀 + 随机后缀（类 ULID）
- `event_id` 格式：`evt_<26 字符 Crockford base32>`
- 不使用 UUID（避免破 schema pattern）；用本地实现，无外部 dep

### TDD sub-steps（第一批 — validator）

- [ ] **Step 6.a.1: 写 failing test — 19 event_kinds 全部合法**

  Create `engine/tests/runtime/event-validator.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { validateEvent } from "../../src/runtime/event-validator.ts";

  const BASE = {
    schema_version: 1 as const,
    seq: 0,
    event_id: "evt_01HZX00000000000000000000A",
    ts: "2026-05-29T10:00:00.000Z",
    run_id: "run_01HZX00000000000000000000B",
    feature_id: "feat-xyz",
    skill_id: "case-draft",
    skill_version: "1.0.0",
    workflow_id: "case-draft@1.0.0",
    event_kind: "session_started" as const,
    status: "ok" as const,
  };

  const ALL_KINDS = [
    "session_started", "session_ended",
    "phase_entered", "phase_exited",
    "decision_made", "artifact_written",
    "command_ran", "plugin_invoked", "plugin_failed",
    "validator_failed", "blocked",
    "human_gate_opened", "human_gate_resolved",
    "subagent_dispatched", "subagent_completed", "subagent_failed",
    "handoff_emitted", "skill_routed", "projection_failed",
  ] as const;

  describe("event validator — kinds", () => {
    test("all 19 event_kinds validate", () => {
      for (const kind of ALL_KINDS) {
        const res = validateEvent({ ...BASE, event_kind: kind });
        expect(res.ok).withContext(kind).toBe(true);
        expect(res.issues).toEqual([]);
      }
    });

    test("rejects unknown event_kind", () => {
      const res = validateEvent({ ...BASE, event_kind: "made_up" });
      expect(res.ok).toBe(false);
      expect(res.issues.some((i) => i.code === "event.kind_invalid")).toBe(true);
    });
  });

  describe("event validator — envelope required", () => {
    for (const field of ["schema_version", "seq", "event_id", "ts", "run_id", "feature_id", "skill_id", "skill_version", "workflow_id", "event_kind", "status"]) {
      test(`requires ${field}`, () => {
        const { [field]: _, ...rest } = BASE as Record<string, unknown>;
        const res = validateEvent(rest);
        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.path === field)).toBe(true);
      });
    }
  });

  describe("event validator — patterns", () => {
    test("rejects non-ULID event_id", () => {
      const res = validateEvent({ ...BASE, event_id: "evt_short" });
      expect(res.ok).toBe(false);
    });
    test("rejects non-semver skill_version", () => {
      const res = validateEvent({ ...BASE, skill_version: "1.0" });
      expect(res.ok).toBe(false);
    });
    test("accepts payload and blackboard_delta as objects", () => {
      const res = validateEvent({ ...BASE, payload: { foo: "bar" }, blackboard_delta: { atoms: ["a"] } });
      expect(res.ok).toBe(true);
    });
    test("rejects payload as non-object", () => {
      const res = validateEvent({ ...BASE, payload: "string" });
      expect(res.ok).toBe(false);
    });
  });

  describe("event validator — secret guard", () => {
    test("rejects secret-like value in payload string field", () => {
      const res = validateEvent({
        ...BASE,
        payload: { url: "https://lanhuapp.com?token=abcd1234efgh" },
      });
      expect(res.ok).toBe(false);
      expect(res.issues.some((i) => i.code === "event.secret_like_value_blocked")).toBe(true);
    });
  });

  describe("event validator — hashed_artifact_ref", () => {
    test("requires sha256 prefix", () => {
      const res = validateEvent({ ...BASE, hashed_artifact_ref: "abc" });
      expect(res.ok).toBe(false);
    });
    test("accepts valid sha256", () => {
      const hash = "sha256:" + "a".repeat(64);
      const res = validateEvent({ ...BASE, hashed_artifact_ref: hash });
      expect(res.ok).toBe(true);
    });
  });
  ```

- [ ] **Step 6.a.2: 跑测试确认 fail**

  Run: `bun test engine/tests/runtime/event-validator.test.ts`
  Expected: FAIL —— `engine/src/runtime/event-validator.ts` 不存在。

- [ ] **Step 6.a.3: 实现 `engine/src/runtime/event-validator.ts`（最小通过 6.a.1）**

  Write:
  ```typescript
  import type { KataIssue, KataResult } from "../result-types.ts";

  export const EVENT_KINDS = [
    "session_started", "session_ended",
    "phase_entered", "phase_exited",
    "decision_made", "artifact_written",
    "command_ran", "plugin_invoked", "plugin_failed",
    "validator_failed", "blocked",
    "human_gate_opened", "human_gate_resolved",
    "subagent_dispatched", "subagent_completed", "subagent_failed",
    "handoff_emitted", "skill_routed", "projection_failed",
  ] as const;

  export type EventKind = (typeof EVENT_KINDS)[number];

  const KIND_SET = new Set<string>(EVENT_KINDS);
  const STATUS_SET = new Set(["ok", "blocked", "failed", "resolved"]);
  const ULID_PATTERN = /^[A-Za-z0-9]{26}$/;
  const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
  const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
  const SECRET_PATTERN =
    /(?:token=|secret=|password=|cookie=|api_key=|access_key=|private_key=|sk-[A-Za-z0-9_-]+)/i;

  const REQUIRED_FIELDS = [
    "schema_version", "seq", "event_id", "ts", "run_id", "feature_id",
    "skill_id", "skill_version", "workflow_id", "event_kind", "status",
  ] as const;

  function issue(code: string, message: string, path: string): KataIssue {
    return { code, severity: "error", message, path };
  }

  function checkPayloadForSecrets(payload: unknown, basePath: string, issues: KataIssue[]): void {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
    for (const [k, v] of Object.entries(payload)) {
      const p = `${basePath}.${k}`;
      if (typeof v === "string" && SECRET_PATTERN.test(v)) {
        issues.push(issue("event.secret_like_value_blocked", `secret-like value in ${p}`, p));
      } else if (v && typeof v === "object") {
        checkPayloadForSecrets(v, p, issues);
      }
    }
  }

  export function validateEvent(event: unknown): KataResult<Record<string, unknown>> {
    const issues: KataIssue[] = [];
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return { ok: false, issues: [issue("event.invalid", "event must be an object", "")] };
    }
    const e = event as Record<string, unknown>;
    for (const f of REQUIRED_FIELDS) {
      if (e[f] === undefined || e[f] === null || e[f] === "") {
        issues.push(issue("event.required_field_missing", `event requires ${f}`, f));
      }
    }
    if (e.schema_version !== 1) {
      issues.push(issue("event.schema_version_invalid", "schema_version must be 1", "schema_version"));
    }
    if (typeof e.seq !== "number" || !Number.isInteger(e.seq) || e.seq < 0) {
      issues.push(issue("event.seq_invalid", "seq must be non-negative integer", "seq"));
    }
    if (typeof e.event_id === "string" && !e.event_id.startsWith("evt_")) {
      issues.push(issue("event.event_id_invalid", "event_id must start with evt_", "event_id"));
    } else if (typeof e.event_id === "string" && !ULID_PATTERN.test(e.event_id.slice(4))) {
      issues.push(issue("event.event_id_invalid", "event_id suffix must be 26-char base32", "event_id"));
    }
    if (typeof e.run_id === "string" && !e.run_id.startsWith("run_")) {
      issues.push(issue("event.run_id_invalid", "run_id must start with run_", "run_id"));
    } else if (typeof e.run_id === "string" && !ULID_PATTERN.test(e.run_id.slice(4))) {
      issues.push(issue("event.run_id_invalid", "run_id suffix must be 26-char base32", "run_id"));
    }
    if (typeof e.skill_version === "string" && !SEMVER_PATTERN.test(e.skill_version)) {
      issues.push(issue("event.skill_version_invalid", "skill_version must match semver x.y.z", "skill_version"));
    }
    if (typeof e.event_kind === "string" && !KIND_SET.has(e.event_kind)) {
      issues.push(issue("event.kind_invalid", `unknown event_kind ${e.event_kind}`, "event_kind"));
    }
    if (typeof e.status === "string" && !STATUS_SET.has(e.status)) {
      issues.push(issue("event.status_invalid", `unknown status ${e.status}`, "status"));
    }
    if (e.hashed_artifact_ref !== undefined) {
      if (typeof e.hashed_artifact_ref !== "string" || !HASH_PATTERN.test(e.hashed_artifact_ref)) {
        issues.push(issue("event.hash_invalid", "hashed_artifact_ref must be sha256:<64 hex>", "hashed_artifact_ref"));
      }
    }
    if (e.payload !== undefined) {
      if (typeof e.payload !== "object" || Array.isArray(e.payload)) {
        issues.push(issue("event.payload_invalid", "payload must be an object", "payload"));
      } else {
        checkPayloadForSecrets(e.payload, "payload", issues);
      }
    }
    if (e.blackboard_delta !== undefined) {
      if (typeof e.blackboard_delta !== "object" || Array.isArray(e.blackboard_delta)) {
        issues.push(issue("event.delta_invalid", "blackboard_delta must be an object", "blackboard_delta"));
      }
    }
    return { ok: issues.length === 0, value: e, issues };
  }
  ```

- [ ] **Step 6.a.4: 跑 validator test 全套**

  Run: `bun test engine/tests/runtime/event-validator.test.ts`
  Expected: 所有 case PASS。

- [ ] **Step 6.a.5: 改 `engine/src/telemetry/runtime-telemetry.ts` 为 adapter**

  Replace 文件内容：
  ```typescript
  // Phase 2 backbone compat shim:
  // 旧 6 粗粒度 event_kind 在 P3 完成 case-draft 迁移后弃用；
  // 当前所有调用者 (engine/src/skills/*) 在 P2 期间仍可调 validateTelemetryEvent，
  // 但行为变为转发到 event-validator.validateEvent。
  import { validateEvent } from "../runtime/event-validator.ts";
  import type { KataResult } from "../result-types.ts";

  export function validateTelemetryEvent(
    event: Record<string, unknown>,
  ): KataResult<Record<string, unknown>> {
    return validateEvent(event);
  }
  ```
  Note: 现仓 `engine/src/telemetry/runtime-telemetry.ts` 唯一调用者就是它自己（已 grep 确认）；本 step 之后该文件存在但只做 forward。P3 完成 case-draft 后整删（spec §12.1 迁移表 P2#6.a 行）。


### TDD sub-steps（第二批 — event-writer 单调 seq + atomic append）

- [ ] **Step 6.a.6: 写 failing test — writer 单调 seq + atomic append**

  Create `engine/tests/runtime/event-writer.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { createEventWriter } from "../../src/runtime/event-writer.ts";

  const FIX = {
    schema_version: 1 as const,
    event_id: "evt_01HZX00000000000000000000A",
    ts: "2026-05-29T10:00:00.000Z",
    run_id: "run_01HZX00000000000000000000B",
    feature_id: "feat-xyz",
    skill_id: "case-draft",
    skill_version: "1.0.0",
    workflow_id: "case-draft@1.0.0",
    event_kind: "phase_entered" as const,
    status: "ok" as const,
  };

  function mkRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "kata-writer-"));
    mkdirSync(join(root, "workspace/p/features/f/events"), { recursive: true });
    return root;
  }

  describe("event writer", () => {
    test("assigns monotonic seq", async () => {
      const root = mkRoot();
      try {
        const w = createEventWriter({
          root,
          project: "p",
          featureId: "f",
          runId: FIX.run_id,
        });
        await w.append({ ...FIX, event_kind: "session_started" });
        await w.append({ ...FIX, event_kind: "phase_entered", event_id: "evt_01HZX00000000000000000000C" });
        await w.append({ ...FIX, event_kind: "phase_exited", event_id: "evt_01HZX00000000000000000000D" });
        await w.close();
        const lines = readFileSync(
          join(root, "workspace/p/features/f/events", `${FIX.run_id}.jsonl`),
          "utf8",
        ).trim().split("\n");
        expect(lines).toHaveLength(3);
        const seqs = lines.map((l) => JSON.parse(l).seq);
        expect(seqs).toEqual([0, 1, 2]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("rejects event that fails validator (fail-closed)", async () => {
      const root = mkRoot();
      try {
        const w = createEventWriter({
          root,
          project: "p",
          featureId: "f",
          runId: FIX.run_id,
        });
        await expect(
          w.append({ ...FIX, event_kind: "made_up" }),
        ).rejects.toThrow(/event_kind/);
        // file should not exist or be empty
        const p = join(root, "workspace/p/features/f/events", `${FIX.run_id}.jsonl`);
        expect(existsSync(p) ? readFileSync(p, "utf8") : "").toBe("");
        await w.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("writes index entry per appended event", async () => {
      const root = mkRoot();
      try {
        const w = createEventWriter({
          root,
          project: "p",
          featureId: "f",
          runId: FIX.run_id,
        });
        await w.append({ ...FIX, event_kind: "phase_entered" });
        await w.close();
        const idx = readFileSync(
          join(root, "workspace/p/features/f/events.index.jsonl"),
          "utf8",
        ).trim().split("\n");
        expect(idx).toHaveLength(1);
        const entry = JSON.parse(idx[0]);
        expect(entry.run_id).toBe(FIX.run_id);
        expect(entry.event_kind).toBe("phase_entered");
        expect(entry.seq).toBe(0);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
  ```

- [ ] **Step 6.a.7: 跑测试确认 fail**

  Run: `bun test engine/tests/runtime/event-writer.test.ts`
  Expected: FAIL —— `event-writer.ts` 不存在。

- [ ] **Step 6.a.8: 实现 `engine/src/runtime/event-writer.ts`**

  Write:
  ```typescript
  import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, writeSync, fsyncSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import lockfile from "proper-lockfile";
  import { validateEvent } from "./event-validator.ts";

  export interface EventWriterOptions {
    root: string;          // repo root
    project: string;       // workspace/<project>
    featureId: string;     // features/<feature>
    runId: string;         // run_<ulid>
  }

  export interface EventWriter {
    append(event: Record<string, unknown>): Promise<void>;
    close(): Promise<void>;
  }

  export function createEventWriter(opts: EventWriterOptions): EventWriter {
    const eventsDir = join(opts.root, "workspace", opts.project, "features", opts.featureId, "events");
    const jsonlPath = join(eventsDir, `${opts.runId}.jsonl`);
    const indexPath = join(opts.root, "workspace", opts.project, "features", opts.featureId, "events.index.jsonl");
    mkdirSync(eventsDir, { recursive: true });

    let seq = readResumeSeq(jsonlPath);
    let closed = false;

    async function append(rawEvent: Record<string, unknown>): Promise<void> {
      if (closed) throw new Error("event-writer: append after close");
      const event = { ...rawEvent, seq };
      const res = validateEvent(event);
      if (!res.ok) {
        const messages = res.issues.map((i) => `${i.path}: ${i.message}`).join("; ");
        // validator failure 走 fail-closed：不 append、seq 不前进
        throw new Error(`event validation failed: ${messages}`);
      }
      // jsonl 是 seq 的 source of truth：先 append jsonl 并立即递增 seq；
      // 如果之后 index 失败，jsonl 状态已不可逆，seq 也已"消费"——
      // index 失败不能让 seq 回退（否则下次 append 会复用 seq 写出重复行）。
      const line = JSON.stringify(event) + "\n";
      atomicAppend(jsonlPath, line);
      seq += 1;
      try {
        await appendIndexEntry(indexPath, event);
      } catch (e) {
        // 仅记录到 stderr，让上层 staged transaction（6.b）按需 emit 'projection_failed' 补偿事件。
        // writer 自身不写补偿事件，避免在 writer 层引入 event-kind 知识。
        process.stderr.write(
          `event-writer: index append failed for seq=${event.seq}: ${(e as Error).message}\n`,
        );
        throw e;
      }
    }

    async function close(): Promise<void> {
      closed = true;
    }

    return { append, close };
  }

  function readResumeSeq(jsonlPath: string): number {
    if (!existsSync(jsonlPath)) return 0;
    const lines = readFileSync(jsonlPath, "utf8").trim().split("\n").filter(Boolean);
    if (lines.length === 0) return 0;
    const last = JSON.parse(lines[lines.length - 1]);
    return typeof last.seq === "number" ? last.seq + 1 : 0;
  }

  function atomicAppend(targetPath: string, line: string): void {
    // Append within the same file is naturally append-only on POSIX with O_APPEND,
    // but we want atomic single-line semantics (no partial writes) — write to tmp,
    // then concat via single rename-like operation. Single short line < 64KB
    // typically fits in one syscall under O_APPEND on Linux/macOS; we still wrap in fsync.
    const fd = openSync(targetPath, "a");
    try {
      writeSync(fd, line);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }

  async function appendIndexEntry(indexPath: string, event: Record<string, unknown>): Promise<void> {
    mkdirSync(join(indexPath, ".."), { recursive: true });
    if (!existsSync(indexPath)) {
      // proper-lockfile requires the file to exist
      openSync(indexPath, "a"); // touch
    }
    const release = await lockfile.lock(indexPath, { retries: { retries: 5, minTimeout: 10, maxTimeout: 100 } });
    try {
      const entry = {
        ts: event.ts,
        run_id: event.run_id,
        seq: event.seq,
        skill_id: event.skill_id,
        phase: event.phase ?? null,
        event_kind: event.event_kind,
        status: event.status,
      };
      atomicAppend(indexPath, JSON.stringify(entry) + "\n");
    } finally {
      await release();
    }
  }
  ```

  Notes:
  - 短行 (<4KB envelope) 在 POSIX `O_APPEND` 下原子追加。spec §9.4 表格写的"tmp + fsync + rename"用于 blackboard.json / notify markdown 的全量原子写场景；对于真正的 streaming append，标准 POSIX 语义就是 O_APPEND + fsync，所以本 plan 在 events.jsonl 上采用 O_APPEND（rename 不能在 append 语义下工作而不全文重写）。如未来 spec 改为强制 tmp+rename 全文重写，本 step 同步重写。
  - `events.index.jsonl` 用 `proper-lockfile` advisory lock 解决 spec §9.4 S2 并发问题。
  - **seq 增量在 jsonl 写成功后立即发生**，index append 失败不回退 seq —— 这是单调性保证的关键。

- [ ] **Step 6.a.9: 跑 6.a.6 test 确认 PASS**

  Run: `bun test engine/tests/runtime/event-writer.test.ts`
  Expected: 3 case PASS。

### TDD sub-steps（第三批 — session + run_id 生成）

- [ ] **Step 6.a.10: 写 failing test — session 生成 run_id 与 writer**

  Create `engine/tests/runtime/session.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { mkdtempSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { openSession, generateRunId, generateEventId } from "../../src/runtime/session.ts";

  describe("session", () => {
    test("generateRunId returns run_<26 base32>", () => {
      const id = generateRunId();
      expect(id).toMatch(/^run_[0-9A-HJKMNP-TV-Z]{26}$/);
    });
    test("generateEventId returns evt_<26 base32>", () => {
      const id = generateEventId();
      expect(id).toMatch(/^evt_[0-9A-HJKMNP-TV-Z]{26}$/);
    });
    test("openSession returns writer with stable run_id across appends", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-session-"));
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        expect(sess.runId).toMatch(/^run_/);
        await sess.emit("session_started", { status: "ok" });
        await sess.emit("phase_entered", { status: "ok", phase: "source-intake" });
        await sess.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
    test("two sessions in same feature have distinct run_ids", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-session-"));
      try {
        const a = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        const b = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        expect(a.runId).not.toBe(b.runId);
        await a.close();
        await b.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("openSession with same runId returns the same instance (singleton)", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-session-"));
      try {
        const fixedRun = "run_01HZX00000000000000000000Z";
        const a = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0", runId: fixedRun });
        const b = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0", runId: fixedRun });
        expect(b).toBe(a);
        await a.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("lastSeq() returns -1 before any emit and advances on each emit", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-session-"));
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        expect(sess.lastSeq()).toBe(-1);
        await sess.emit("session_started", { status: "ok" });
        expect(sess.lastSeq()).toBe(0);
        await sess.emit("phase_entered", { status: "ok", phase: "x" });
        expect(sess.lastSeq()).toBe(1);
        await sess.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
  ```

- [ ] **Step 6.a.11: 跑测试确认 fail**

  Run: `bun test engine/tests/runtime/session.test.ts`
  Expected: FAIL —— `session.ts` 不存在。

- [ ] **Step 6.a.12: 实现 `engine/src/runtime/session.ts`**

  Write:
  ```typescript
  import { randomBytes } from "node:crypto";
  import { createEventWriter, type EventWriter } from "./event-writer.ts";

  const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford alphabet (no I L O U)

  function ulidLike(): string {
    // 48-bit timestamp ms + 80-bit randomness, encoded as 26 base32 chars
    const now = Date.now();
    let timePart = "";
    let t = now;
    for (let i = 0; i < 10; i++) {
      timePart = BASE32[t % 32] + timePart;
      t = Math.floor(t / 32);
    }
    const rand = randomBytes(10);
    let randPart = "";
    let acc = 0n;
    for (const b of rand) acc = (acc << 8n) | BigInt(b);
    for (let i = 0; i < 16; i++) {
      randPart = BASE32[Number(acc & 31n)] + randPart;
      acc >>= 5n;
    }
    return timePart + randPart;
  }

  export function generateRunId(): string {
    return `run_${ulidLike()}`;
  }
  export function generateEventId(): string {
    return `evt_${ulidLike()}`;
  }

  export interface SessionOptions {
    root: string;
    project: string;
    featureId: string;
    skillId: string;
    skillVersion: string;
    workflowId: string;
  }

  export interface Session {
    runId: string;
    emit(kind: string, payload?: Record<string, unknown>): Promise<void>;
    lastSeq(): number;
    close(): Promise<void>;
  }

  // run_id → Session 单例。spec §9.4 "Per-session 单 writer"：同一 run_id 在
  // 同一进程内不能存在两个 writer，否则 seq 会冲突。重复 openSession 复用现有 session。
  // 跨进程互斥由 event-writer 的 events.index.jsonl advisory lock 提供。
  const sessions = new Map<string, Session>();

  export async function openSession(opts: SessionOptions): Promise<Session> {
    const runId = opts.runId ?? generateRunId();   // 显式 runId 时复用（供测试与 recovery）
    const existing = sessions.get(runId);
    if (existing) return existing;
    const writer: EventWriter = createEventWriter({
      root: opts.root,
      project: opts.project,
      featureId: opts.featureId,
      runId,
    });
    let seq = -1;
    async function emit(kind: string, extra: Record<string, unknown> = {}): Promise<void> {
      await writer.append({
        schema_version: 1,
        event_id: generateEventId(),
        ts: new Date().toISOString(),
        run_id: runId,
        feature_id: opts.featureId,
        skill_id: opts.skillId,
        skill_version: opts.skillVersion,
        workflow_id: opts.workflowId,
        event_kind: kind,
        status: (extra.status as string) ?? "ok",
        ...extra,
      });
      seq += 1;
    }
    async function close(): Promise<void> {
      await writer.close();
      sessions.delete(runId);
    }
    function lastSeq(): number { return seq; }
    const session: Session = { runId, emit, lastSeq, close };
    sessions.set(runId, session);
    return session;
  }

  // 测试辅助：清空单例 map。仅供 test setup 使用。
  export function _resetSessions(): void { sessions.clear(); }
  ```

  注意：`SessionOptions` 加可选 `runId?: string`（默认生成）；session test 需对应扩 case。

- [ ] **Step 6.a.13: 跑 session test 确认 PASS**

  Run: `bun test engine/tests/runtime/session.test.ts`
  Expected: 4 case PASS。

### TDD sub-steps（第四批 — stress / 并发 / fail-closed）

- [ ] **Step 6.a.14: 写 stress test — 并发 append + 单调 seq + index lock**

  Create `engine/tests/runtime/event-writer-stress.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { mkdtempSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { openSession } from "../../src/runtime/session.ts";

  describe("event writer stress", () => {
    test("100 sequential appends preserve monotonic seq", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-stress-"));
      try {
        const sess = await openSession({
          root, project: "p", featureId: "f",
          skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0",
        });
        for (let i = 0; i < 100; i++) await sess.emit("decision_made", { status: "ok" });
        await sess.close();
        const lines = readFileSync(
          join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`),
          "utf8",
        ).trim().split("\n");
        expect(lines).toHaveLength(100);
        const seqs = lines.map((l) => JSON.parse(l).seq);
        expect(seqs).toEqual([...Array(100).keys()]);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("two concurrent sessions on same feature share no run_id and index has all entries", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-stress-"));
      try {
        const a = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        const b = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        await Promise.all([
          (async () => { for (let i = 0; i < 20; i++) await a.emit("decision_made", { status: "ok" }); })(),
          (async () => { for (let i = 0; i < 20; i++) await b.emit("decision_made", { status: "ok" }); })(),
        ]);
        await a.close();
        await b.close();
        const idxLines = readFileSync(
          join(root, "workspace/p/features/f/events.index.jsonl"),
          "utf8",
        ).trim().split("\n");
        expect(idxLines).toHaveLength(40);
        // All lines must parse and have run_id ∈ {a.runId, b.runId}
        for (const line of idxLines) {
          const entry = JSON.parse(line);
          expect([a.runId, b.runId]).toContain(entry.run_id);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("fail-closed: validator failure does not bump seq or write line", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-stress-"));
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        await sess.emit("phase_entered", { status: "ok" });   // seq=0
        await expect(sess.emit("made_up_kind", { status: "ok" })).rejects.toThrow();
        await sess.emit("phase_exited", { status: "ok" });    // seq=1, not 2
        await sess.close();
        const lines = readFileSync(
          join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`),
          "utf8",
        ).trim().split("\n");
        expect(lines).toHaveLength(2);
        expect(JSON.parse(lines[1]).seq).toBe(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
  ```

- [ ] **Step 6.a.15: 跑 stress 确认 PASS**

  Run: `bun test engine/tests/runtime/event-writer-stress.test.ts`
  Expected: 3 case PASS。如果 "two concurrent sessions" 出现 lock 超时，把 `proper-lockfile` retries 调大（实现里改 `{ retries: 20 }`）。

- [ ] **Step 6.a.16: 创建 `.claude/contracts/schemas/event.json`**

  按 step 6.a "Event envelope schema" 段落原文写入。

- [ ] **Step 6.a.17: 写 test — schema 文件存在且与 validator 枚举一致**

  Append `engine/tests/runtime/event-validator.test.ts`:
  ```typescript
  import { readFileSync } from "node:fs";
  import { join } from "node:path";
  import { repoRoot } from "../../src/lib/paths.ts";
  import { EVENT_KINDS } from "../../src/runtime/event-validator.ts";

  test("event.json schema lists exactly the 19 EVENT_KINDS", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".claude/contracts/schemas/event.json"), "utf8"),
    );
    expect(schema.properties.event_kind.enum).toEqual([...EVENT_KINDS]);
  });
  ```

- [ ] **Step 6.a.18: 跑全部 runtime tests**

  Run: `bun test engine/tests/runtime/`
  Expected: 全 PASS。

- [ ] **Step 6.a.19: 更新 `engine/tests/large-file-split.test.ts`**

  在 `TARGET_ENTRY_FILES` 追加：
  ```
  "engine/src/runtime/event-validator.ts",
  "engine/src/runtime/event-writer.ts",
  "engine/src/runtime/session.ts",
  ```

- [ ] **Step 6.a.20: 跑 engine 全量 + lint + type-check**

  Run: `bun test --cwd engine && bun run lint && bun run type-check`
  Expected: 全 PASS / 0 violations。

- [ ] **Step 6.a.21: 迁移旧 telemetry 测试到新 envelope**

  Run: `grep -rln "validateTelemetryEvent\|EVENT_KIND_VALUES\|STATUS_VALUES\|telemetry\.\(unknown_field\|free_text_blocked\|secret_like_value_blocked\)" engine/tests/`

  对每个命中文件按下表逐项替换断言：

  | 旧 telemetry 假设（来自现 `runtime-telemetry.ts`） | 新 event-validator 替换 |
  | --- | --- |
  | `event_kind ∈ {"artifact","policy","plugin","agent","source_ref","config"}` | `event_kind ∈ EVENT_KINDS`（19 个，从 `engine/src/runtime/event-validator.ts` import） |
  | `status ∈ {"success","partial","failed","blocked"}` | `status ∈ {"ok","blocked","failed","resolved"}`（spec §9.2） |
  | issue code `"telemetry.unknown_field"` | issue code `"event.required_field_missing"` / 字段约束相关；无对应直接映射，按测试目的重写 |
  | issue code `"telemetry.free_text_blocked"`（body 必须不是字符串） | 删除该断言：新 envelope 用结构化 `payload` 对象，不再校验 free-text body |
  | issue code `"telemetry.secret_like_value_blocked"` | issue code `"event.secret_like_value_blocked"`（新 validator 扫 `payload.*` 字符串子字段） |
  | issue code `"telemetry.hash_invalid"` | issue code `"event.hash_invalid"` |
  | 输入 fixture 只有 6 个字段（event_id/event_kind/run_id/status 等） | 必须补齐 envelope 11 个必填：schema_version=1, seq, event_id="evt_xxx", ts ISO, run_id="run_xxx", feature_id, skill_id, skill_version semver, workflow_id, event_kind, status |
  | event_id 没固定 prefix | event_id 必须 `^evt_<26 base32>$` |
  | run_id 没固定 prefix | run_id 必须 `^run_<26 base32>$` |
  | skill_version 是 integer | skill_version 是 semver 字符串 `x.y.z` |

  对每个 test：
  1. 跑一次确认 fail 计数（baseline P2 期间允许暂态 fail）
  2. 按表更新断言与 fixture
  3. 再跑确认 PASS

  Expected: 全部 telemetry-related test PASS；若某条 test 整体语义已不适用（如 free_text_blocked），删除该 test 而非强改。

### TDD sub-steps（第五批 — staged transaction: stage + commit）

- [ ] **Step 6.a.22: 写 failing test — staged stage + commit 两段（project 阶段留给 6.b）**

  Create `engine/tests/runtime/staged-stage-commit.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { openSession } from "../../src/runtime/session.ts";
  import { stageAndCommitArtifact } from "../../src/runtime/staged-transaction.ts";

  function mkRoot(): string { return mkdtempSync(join(tmpdir(), "kata-stx-stagecommit-")); }

  describe("staged transaction — stage + commit", () => {
    test("happy path: tmp written + atomic rename + artifact_written event with sha256", async () => {
      const root = mkRoot();
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        const target = join(root, "workspace/p/features/f/archive.md");
        await stageAndCommitArtifact({
          session: sess, kind: "archive", phase: "output",
          contentBytes: Buffer.from("# OK\n", "utf8"),
          targetPath: target, blackboardSlot: "archive_path",
        });
        expect(existsSync(target)).toBe(true);
        const lines = readFileSync(
          join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`), "utf8",
        ).trim().split("\n").map((l) => JSON.parse(l));
        const last = lines[lines.length - 1];
        expect(last.event_kind).toBe("artifact_written");
        expect(last.hashed_artifact_ref).toBe("sha256:" + require("crypto").createHash("sha256").update("# OK\n").digest("hex"));
        expect(last.blackboard_delta).toEqual({ archive_path: target });
        await sess.close();
      } finally { rmSync(root, { recursive: true, force: true }); }
    });

    test("stage failure: validator throws → no tmp file remains, no event appended", async () => {
      const root = mkRoot();
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        const target = join(root, "workspace/p/features/f/archive.md");
        await expect(stageAndCommitArtifact({
          session: sess, kind: "archive", phase: "output",
          contentBytes: Buffer.from("", "utf8"),
          targetPath: target, blackboardSlot: "archive_path",
          artifactValidator: (b) => b.length === 0 ? ["artifact is empty"] : [],
        })).rejects.toThrow(/artifact is empty/);
        expect(existsSync(target)).toBe(false);
        const eventsPath = join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`);
        if (existsSync(eventsPath)) {
          const lines = readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
          expect(lines.find((l) => l.event_kind === "artifact_written")).toBeUndefined();
        }
        await sess.close();
      } finally { rmSync(root, { recursive: true, force: true }); }
    });

    test("commit failure (rename fails): no artifact_written event, throw to caller", async () => {
      const root = mkRoot();
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        // 让目标目录只读，rename 失败
        const featureDir = join(root, "workspace/p/features/f");
        chmodSync(featureDir, 0o500);
        const target = join(featureDir, "archive.md");
        await expect(stageAndCommitArtifact({
          session: sess, kind: "archive", phase: "output",
          contentBytes: Buffer.from("# X\n", "utf8"),
          targetPath: target, blackboardSlot: "archive_path",
        })).rejects.toThrow();
        // 恢复权限以便清理
        chmodSync(featureDir, 0o700);
        const eventsPath = join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`);
        if (existsSync(eventsPath)) {
          const lines = readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
          expect(lines.find((l) => l.event_kind === "artifact_written")).toBeUndefined();
        }
        // staging tmp 文件不应残留在最终目录
        await sess.close();
      } finally { rmSync(root, { recursive: true, force: true }); }
    });

    test("commit failure (event append fails): artifact file at target but no event → caller can detect via recover", async () => {
      // 模拟方式：传一个会让 emit 抛错的桩 session（如 readonly events dir）
      const root = mkRoot();
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        const eventsDir = join(root, "workspace/p/features/f/events");
        chmodSync(eventsDir, 0o500);
        const target = join(root, "workspace/p/features/f/archive.md");
        await expect(stageAndCommitArtifact({
          session: sess, kind: "archive", phase: "output",
          contentBytes: Buffer.from("# X\n", "utf8"),
          targetPath: target, blackboardSlot: "archive_path",
        })).rejects.toThrow();
        chmodSync(eventsDir, 0o700);
        // 现存状态：artifact 已在 target，但 event 未 append。
        // recover 责任在调用方（P3 skill orchestrator）：扫 jsonl 找出 hash 已不在 events 中的孤立 artifact，
        // 重发 stageAndCommitArtifact 或人工处理。本 commit 暂不实现自动 recover，仅文档约定。
        expect(existsSync(target)).toBe(true);
        await sess.close();
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  });
  ```

- [ ] **Step 6.a.23: 跑确认 fail**

  Run: `bun test engine/tests/runtime/staged-stage-commit.test.ts`
  Expected: FAIL — `staged-transaction.ts` 不存在。

- [ ] **Step 6.a.24: 实现 `engine/src/runtime/staged-transaction.ts`（stage + commit 两段；project 留给 6.b 增补）**

  Write:
  ```typescript
  import { createHash } from "node:crypto";
  import { mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
  import { dirname, join } from "node:path";
  import type { Session } from "./session.ts";

  export interface StageAndCommitOptions {
    session: Session;
    kind: string;
    phase: string;
    contentBytes: Buffer;
    targetPath: string;
    blackboardSlot: string;
    artifactValidator?: (b: Buffer) => string[];
  }

  export async function stageAndCommitArtifact(opts: StageAndCommitOptions): Promise<void> {
    // ── Stage ──
    const validationErrors = opts.artifactValidator ? opts.artifactValidator(opts.contentBytes) : [];
    if (validationErrors.length > 0) {
      throw new Error(`artifact stage failed: ${validationErrors.join("; ")}`);
    }
    const hash = createHash("sha256").update(opts.contentBytes).digest("hex");
    const stagingDir = join(dirname(opts.targetPath), ".staging");
    mkdirSync(stagingDir, { recursive: true });
    const tmp = join(stagingDir, `${opts.kind}-${process.pid}-${Date.now()}.tmp`);
    writeFileSync(tmp, opts.contentBytes);
    // ── Commit ──
    try {
      mkdirSync(dirname(opts.targetPath), { recursive: true });
      renameSync(tmp, opts.targetPath);
    } catch (e) {
      // rename 失败：tmp 仍存在，删除以避免 staging 累积；event 未 append。
      try { unlinkSync(tmp); } catch { /* ignore */ }
      throw e;
    }
    try {
      await opts.session.emit("artifact_written", {
        status: "ok",
        phase: opts.phase,
        hashed_artifact_ref: `sha256:${hash}`,
        payload: { kind: opts.kind, path: opts.targetPath },
        blackboard_delta: { [opts.blackboardSlot]: opts.targetPath },
      });
    } catch (e) {
      // event append 失败，artifact 已位于 target → 孤立 artifact，
      // recovery 责任在调用方（详见 step 6.a.22 commit failure 测试注释）。
      throw e;
    }
  }

  // project 阶段（applyDelta + notify projection + projection_failed 补偿事件）
  // 在 6.b commit 增补 emitArtifactWritten() 包装函数。
  ```

- [ ] **Step 6.a.25: 跑确认 PASS**

  Run: `bun test engine/tests/runtime/staged-stage-commit.test.ts`
  Expected: 4 case PASS。

- [ ] **Step 6.a.26: commit**

  ```bash
  git add engine/src/runtime/event-validator.ts engine/src/runtime/event-writer.ts engine/src/runtime/session.ts engine/src/runtime/staged-transaction.ts
  git add engine/tests/runtime/event-validator.test.ts engine/tests/runtime/event-writer.test.ts engine/tests/runtime/session.test.ts engine/tests/runtime/event-writer-stress.test.ts engine/tests/runtime/staged-stage-commit.test.ts
  git add .claude/contracts/schemas/event.json
  git add engine/src/telemetry/runtime-telemetry.ts
  git add engine/tests/large-file-split.test.ts
  git add package.json bun.lock
  # update any telemetry test fixtures touched in step 6.a.21
  git commit -m "feat: 🧩 event journal core (writer + validator + session)"
  ```

---


## Commit 6.b：blackboard + projector + cli + phase dispatcher + staged-project

**Why this commit exists:** spec §11 P2#6.b。在 6.a 的 writer / validator / session / stage+commit 基础上接入：
1. **`blackboard.ts`**：validator-enforced 状态。spec §9.5 + §15 "Blackboard validator 强制" 要求**未声明 slot 写入时 emit `validator_failed` 并阻断后续**（不仅是 throw）。
2. **`projector.ts`**：last-event → `.kata/notify/<run_id>.md`（debounced 1s + atomic rename）；CLI `kata events project` 走该模块重投。
3. **`phase-dispatcher.ts`**：spec §6.9 要求 engine 显式 spawn subagent。Claude Code harness 下 engine TS 层无 Agent 工具，所以本 commit 实现的是 **engine→orchestrator dispatch envelope 契约**：engine 输出 `{ model, effort, subagent_type, prompt_hint, expected_events: [subagent_dispatched, subagent_completed|failed] }`，orchestrator（skill prompt）按 envelope 字段直接调用 Agent 工具——`model` 参数透传给 Agent 工具，Claude harness 把它注入 subagent session（不依赖 LLM 自由判断 model）。P3#7 case-draft 实测 model 参数是否被 Claude harness 尊重（spec §13 F3 验证落到 P3）。本 commit 交付：决策函数 `decidePhase`（spec §6.9 fallback 链，按 `dispatch` 分支处理 inline / subagent 差异）+ envelope serializer + 单元测试覆盖 envelope 结构。
4. **`engine/src/cli/events.ts`**：spec §9.7 五子命令 —— `tail [--feature X] [--run-id Y] [--kind K]` / `replay <run_id>` / `stats [--since 7d] [--by skill|phase]` / `validate <jsonl>` / `project <run_id>`。
5. **Staged transaction 第三阶段（project）**：在 6.a 的 `stageAndCommitArtifact` 基础上加 `emitArtifactWritten()` 包装，做 blackboard.applyDelta + notify projector update；project 阶段失败时 emit `projection_failed` 补偿事件。

**Files:**
- Create: `engine/src/runtime/blackboard.ts` —— projection + slot validator（含 emit `validator_failed`）
- Create: `engine/src/runtime/projector.ts` —— last-event → notify markdown
- Create: `engine/src/runtime/phase-dispatcher.ts` —— decidePhase + dispatch envelope serializer
- Create: `engine/src/cli/events.ts` —— commander 子命令组
- Modify: `engine/src/cli/index.ts` —— 注册 `events` 子命令（按现仓 commander 入口对象名）
- Create: `.claude/contracts/schemas/blackboard.json` —— blackboard envelope schema（spec §9.5）
- Modify: `engine/src/runtime/staged-transaction.ts` —— 增 `emitArtifactWritten(opts)` 包装 stage+commit+project；project 阶段失败 emit `projection_failed`
- Create: `engine/tests/runtime/blackboard.test.ts` —— 含未声明 slot 触发 `validator_failed` event
- Create: `engine/tests/runtime/projector.test.ts` —— 含 debounce 真实计数断言
- Create: `engine/tests/runtime/phase-dispatcher.test.ts` —— 含 inline phase 不应用 step.model（warn-not-apply）
- Create: `engine/tests/runtime/staged-project.test.ts` —— project 失败 → `projection_failed` 补偿事件 + blackboard 保持最后成功投影
- Create: `engine/tests/cli/events.test.ts` —— 按 spec §9.7 命令面（`<run_id>` 位置参 / `--feature` / `--run-id` / `--kind` / `--by` / `--since`）
- Modify: `engine/tests/large-file-split.test.ts` —— 加 4 个新文件 entry

### Blackboard envelope schema

`.claude/contracts/schemas/blackboard.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://kata.local/schemas/blackboard.json",
  "title": "Blackboard Snapshot (E backbone v1)",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version", "run_id", "feature_id", "last_seq", "slots"],
  "properties": {
    "schema_version": { "const": 1 },
    "run_id":         { "type": "string", "pattern": "^run_[A-Za-z0-9]{26}$" },
    "feature_id":     { "type": "string", "minLength": 1 },
    "last_seq":       { "type": "integer", "minimum": 0 },
    "mode":           { "type": ["string", "null"] },
    "slots":          { "type": "object" }
  }
}
```

### Staged transaction（spec §9.4）

```
emitArtifactWritten({ kind, contentBytes, targetPath, blackboardSlot }):
  1. stage:   tmp = <featureDir>/.staging/<artifactKind>-<seq>.tmp
              fs.writeFile(tmp, contentBytes); fsync; compute sha256 hash = H
              validate against artifact schema (if registered)
              失败 → throw, no event written, blackboard unchanged

  2. commit:  fs.rename(tmp, targetPath)
              writer.append({event_kind: "artifact_written", seq=N, hashed_artifact_ref: "sha256:"+H,
                             payload: { kind, path: targetPath },
                             blackboard_delta: { [blackboardSlot]: targetPath }})
              失败 → throw（artifact 已经存在于 targetPath 但 event 未 append → recover 阶段处理）

  3. project: blackboard.applyDelta({ [blackboardSlot]: targetPath })
              writeBlackboard(blackboardJsonPath, snapshot)  // atomic tmp+rename
              notifyProjector.update(snapshot, lastEvent)
              失败 → writer.append({event_kind: "projection_failed", seq=N+1, status: "failed",
                                    payload: { references_seq: N }})
                  → blackboard.json 保留为最后一次成功 projection 的状态
```

### TDD sub-steps（第一批 — blackboard）

- [ ] **Step 6.b.1: 写 failing test — blackboard apply + persist**

  Create `engine/tests/runtime/blackboard.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { createBlackboard } from "../../src/runtime/blackboard.ts";

  function mkRoot(): string {
    return mkdtempSync(join(tmpdir(), "kata-bb-"));
  }

  describe("blackboard", () => {
    test("apply delta and persist to blackboard.json", async () => {
      const root = mkRoot();
      try {
        const bb = createBlackboard({
          root, project: "p", featureId: "f",
          runId: "run_01HZX00000000000000000000A",
          declaredOutputs: { "case-draft": ["draft_archive"], output: ["archive_path"] },
        });
        bb.enterPhase("case-draft");
        await bb.applyDelta({ draft_archive: "/tmp/draft.md" }, 5);
        bb.enterPhase("output");
        await bb.applyDelta({ archive_path: "/tmp/archive.md" }, 6);
        const path = join(root, "workspace/p/features/f/blackboard.json");
        expect(existsSync(path)).toBe(true);
        const snap = JSON.parse(readFileSync(path, "utf8"));
        expect(snap.slots.draft_archive).toBe("/tmp/draft.md");
        expect(snap.slots.archive_path).toBe("/tmp/archive.md");
        expect(snap.last_seq).toBe(6);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("rejects write to undeclared slot AND emits validator_failed event via session", async () => {
      const root = mkRoot();
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        const bb = createBlackboard({
          root, project: "p", featureId: "f",
          runId: sess.runId,
          session: sess,
          declaredOutputs: { "case-draft": ["draft_archive"] },
        });
        bb.enterPhase("case-draft");
        await expect(bb.applyDelta({ archive_path: "/x" }, 1)).rejects.toThrow(/archive_path/);
        const lines = readFileSync(
          join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`), "utf8",
        ).trim().split("\n").map((l) => JSON.parse(l));
        const vf = lines.find((l) => l.event_kind === "validator_failed");
        expect(vf).toBeTruthy();
        expect(vf.status).toBe("failed");
        expect(vf.phase).toBe("case-draft");
        expect(vf.payload?.undeclared_slots).toEqual(["archive_path"]);
        await sess.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("mode-specific outputs use blackboard.mode at write time", async () => {
      const root = mkRoot();
      try {
        const bb = createBlackboard({
          root, project: "p", featureId: "f",
          runId: "run_01HZX00000000000000000000A",
          declaredOutputs: { },
          declaredOutputsByMode: {
            analyze: {
              bug: ["root_cause", "evidence_refs"],
              conflict: ["side_a_intent", "side_b_intent", "resolution_plan"],
            },
          },
        });
        await bb.applyDelta({ mode: "conflict" }, 1);
        bb.enterPhase("analyze");
        await bb.applyDelta({ side_a_intent: "x", side_b_intent: "y", resolution_plan: "z" }, 2);
        await expect(bb.applyDelta({ root_cause: "rc" }, 3)).rejects.toThrow(/root_cause/);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("writes blackboard.json atomically (no half-written reads)", async () => {
      const root = mkRoot();
      try {
        const bb = createBlackboard({
          root, project: "p", featureId: "f",
          runId: "run_01HZX00000000000000000000A",
          declaredOutputs: { default: ["a", "b", "c"] },
        });
        bb.enterPhase("default");
        await bb.applyDelta({ a: 1 }, 1);
        // simulate concurrent readers
        const path = join(root, "workspace/p/features/f/blackboard.json");
        const before = readFileSync(path, "utf8");
        await bb.applyDelta({ b: 2 }, 2);
        const after = readFileSync(path, "utf8");
        expect(() => JSON.parse(before)).not.toThrow();
        expect(() => JSON.parse(after)).not.toThrow();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
  ```

- [ ] **Step 6.b.2: 跑确认 fail**

  Run: `bun test engine/tests/runtime/blackboard.test.ts`
  Expected: FAIL —— `blackboard.ts` 不存在。

- [ ] **Step 6.b.3: 实现 `engine/src/runtime/blackboard.ts`**

  Write:
  ```typescript
  import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
  import { dirname, join } from "node:path";

  import type { Session } from "./session.ts";

  export interface BlackboardOptions {
    root: string;
    project: string;
    featureId: string;
    runId: string;
    declaredOutputs: Record<string, string[]>;
    declaredOutputsByMode?: Record<string, Record<string, string[]>>;
    /** 可选 session：传入后，undeclared slot 写入会先 emit `validator_failed` 再 throw。 */
    session?: Session;
  }

  export interface BlackboardSnapshot {
    schema_version: 1;
    run_id: string;
    feature_id: string;
    last_seq: number;
    mode: string | null;
    slots: Record<string, unknown>;
  }

  export interface Blackboard {
    enterPhase(phase: string): void;
    currentPhase(): string | null;
    applyDelta(delta: Record<string, unknown>, seq: number): Promise<void>;
    snapshot(): BlackboardSnapshot;
  }

  export function createBlackboard(opts: BlackboardOptions): Blackboard {
    const path = join(opts.root, "workspace", opts.project, "features", opts.featureId, "blackboard.json");
    mkdirSync(dirname(path), { recursive: true });
    let snap: BlackboardSnapshot = existsSync(path)
      ? JSON.parse(readFileSync(path, "utf8"))
      : {
          schema_version: 1,
          run_id: opts.runId,
          feature_id: opts.featureId,
          last_seq: -1,
          mode: null,
          slots: {},
        };
    let phase: string | null = null;

    function declaredFor(phaseId: string): string[] {
      const base = opts.declaredOutputs[phaseId] ?? [];
      const byMode = opts.declaredOutputsByMode?.[phaseId];
      if (byMode && snap.mode && byMode[snap.mode]) return [...base, ...byMode[snap.mode]];
      return base;
    }

    function enterPhase(p: string): void { phase = p; }
    function currentPhase(): string | null { return phase; }

    async function applyDelta(delta: Record<string, unknown>, seq: number): Promise<void> {
      const writtenSlots = Object.keys(delta).filter((k) => k !== "mode");
      if (phase) {
        const allowed = new Set(declaredFor(phase));
        const undeclared = writtenSlots.filter((s) => !allowed.has(s));
        if (undeclared.length > 0) {
          // spec §9.5 + §15 "Blackboard validator 强制"：emit `validator_failed` 并阻断后续
          if (opts.session) {
            await opts.session.emit("validator_failed", {
              status: "failed",
              phase,
              payload: { undeclared_slots: undeclared, attempted_delta: delta },
            });
          }
          throw new Error(
            `blackboard validator: phase '${phase}' did not declare output slot(s) ${undeclared.join(", ")}`,
          );
        }
      }
      // apply
      for (const [k, v] of Object.entries(delta)) {
        if (k === "mode") snap = { ...snap, mode: v as string | null };
        else snap = { ...snap, slots: { ...snap.slots, [k]: v } };
      }
      snap = { ...snap, last_seq: seq };
      atomicWriteJson(path, snap);
    }

    function snapshot(): BlackboardSnapshot { return snap; }

    return { enterPhase, currentPhase, applyDelta, snapshot };
  }

  function atomicWriteJson(target: string, data: unknown): void {
    const tmp = `${target}.tmp.${process.pid}.${Date.now()}`;
    writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    renameSync(tmp, target);
  }
  ```

  Notes:
  - 默认 `declaredOutputs` 是 `{ phaseId: slots[] }`。如果 phase 没声明（如 inline phase 走 `default` key），调用方可以传 `{ default: [...] }` 并自己 enterPhase("default")。
  - 不直接读 workflow.yaml；调用方（P3 实施时是 skill orchestrator）负责把声明传进来。这避免 blackboard.ts 与 workflow loader 紧耦合。
  - **职责划分（与 P1 协作）**：slot 名是否合法（即 ∈ `blackboard-slots.json` 的 `v1_legacy ∪ v2` 注册集）这一层校验**已由 P1 `engine/src/skills/workflow-schema.ts:83 loadBlackboardSlots()` + `validateWorkflowV2()` 在 workflow parse 阶段强制**；workflow YAML 引用未注册 slot 会被 v2 lint hard-reject。因此 P2 blackboard.ts **不重做** slot registry 校验，只检查"当前 phase 是否在 workflow 中声明了某 slot 作为 output"——两层职责互不重叠。

- [ ] **Step 6.b.4: 跑确认 PASS**

  Run: `bun test engine/tests/runtime/blackboard.test.ts`
  Expected: 4 case PASS。

### TDD sub-steps（第二批 — projector）

- [ ] **Step 6.b.5: 写 failing test — notify projector debounce + atomic**

  Create `engine/tests/runtime/projector.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { createNotifyProjector } from "../../src/runtime/projector.ts";

  describe("notify projector", () => {
    test("renders KATA 工作通知 template from last event + snapshot", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-proj-"));
      try {
        const p = createNotifyProjector({
          root, project: "p", featureId: "f", runId: "run_01HZX00000000000000000000A",
          debounceMs: 0,
        });
        await p.update({
          event: {
            event_kind: "phase_entered", phase: "case-draft",
            seq: 3, ts: "2026-05-29T10:00:00.000Z", status: "ok",
            skill_id: "case-draft", workflow_id: "case-draft@1.0.0",
            run_id: "run_01HZX00000000000000000000A",
          },
          snapshot: { schema_version: 1, run_id: "run_01HZX00000000000000000000A", feature_id: "f", last_seq: 3, mode: null, slots: { source_refs: [{ id: "sr1" }] } },
        });
        await p.flush();
        const md = readFileSync(join(root, "workspace/p/.kata/notify/run_01HZX00000000000000000000A.md"), "utf8");
        expect(md).toContain("【KATA 工作通知】");
        expect(md).toContain("阶段: case-draft");
        expect(md).toContain("更新时间:");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("debounce coalesces rapid updates — only one disk write for N rapid updates", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-proj-"));
      try {
        const writeCounts: number[] = [];
        const p = createNotifyProjector({
          root, project: "p", featureId: "f", runId: "run_01HZX00000000000000000000A",
          debounceMs: 30,
          onFlush: () => { writeCounts.push(Date.now()); },     // 测试钩子
        });
        for (let i = 0; i < 5; i++) {
          await p.update({
            event: { event_kind: "decision_made", phase: "x", seq: i, ts: "2026-05-29T10:00:00.000Z", status: "ok", skill_id: "case-draft", workflow_id: "x", run_id: "run_01HZX00000000000000000000A" },
            snapshot: { schema_version: 1, run_id: "run_01HZX00000000000000000000A", feature_id: "f", last_seq: i, mode: null, slots: {} },
          });
        }
        // 此刻 update 全发完，定时器还没到——onFlush 未触发
        expect(writeCounts.length).toBe(0);
        await p.flush();
        // flush 后只写一次
        expect(writeCounts.length).toBe(1);
        const md = readFileSync(join(root, "workspace/p/.kata/notify/run_01HZX00000000000000000000A.md"), "utf8");
        // 文件内容是最后一次（seq=4）的 snapshot
        expect(md).toContain("seq=4");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("debounce eventually flushes after the timeout when no further updates arrive", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-proj-"));
      try {
        const writeCounts: number[] = [];
        const p = createNotifyProjector({
          root, project: "p", featureId: "f", runId: "run_01HZX00000000000000000000A",
          debounceMs: 20,
          onFlush: () => { writeCounts.push(Date.now()); },
        });
        await p.update({
          event: { event_kind: "phase_entered", phase: "y", seq: 0, ts: "2026-05-29T10:00:00.000Z", status: "ok", skill_id: "case-draft", workflow_id: "x", run_id: "run_01HZX00000000000000000000A" },
          snapshot: { schema_version: 1, run_id: "run_01HZX00000000000000000000A", feature_id: "f", last_seq: 0, mode: null, slots: {} },
        });
        // 等定时器自然触发
        await new Promise((r) => setTimeout(r, 40));
        expect(writeCounts.length).toBe(1);
        await p.flush();
        // flush 再调一次不应重复写（pending 为 null）
        expect(writeCounts.length).toBe(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
  ```

- [ ] **Step 6.b.6: 跑确认 fail**

  Run: `bun test engine/tests/runtime/projector.test.ts`
  Expected: FAIL。

- [ ] **Step 6.b.7: 实现 `engine/src/runtime/projector.ts`**

  Write（要点 + 关键代码骨架；具体实现按测试断言细化）：
  ```typescript
  import { mkdirSync, renameSync, writeFileSync } from "node:fs";
  import { dirname, join } from "node:path";

  export interface NotifyProjectorOptions {
    root: string;
    project: string;
    featureId: string;
    runId: string;
    debounceMs?: number;
    /** 测试钩子：每次实际写盘时调用。production code 不传。 */
    onFlush?: () => void;
  }

  export interface NotifyProjector {
    update(args: { event: Record<string, unknown>; snapshot: Record<string, unknown> }): Promise<void>;
    flush(): Promise<void>;
  }

  export function createNotifyProjector(opts: NotifyProjectorOptions): NotifyProjector {
    const path = join(opts.root, "workspace", opts.project, ".kata/notify", `${opts.runId}.md`);
    mkdirSync(dirname(path), { recursive: true });
    const debounceMs = opts.debounceMs ?? 1000;
    let pending: { event: Record<string, unknown>; snapshot: Record<string, unknown> } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function render(args: { event: Record<string, unknown>; snapshot: Record<string, unknown> }): string {
      const e = args.event;
      const s = args.snapshot as { last_seq: number; mode: string | null; slots: Record<string, unknown> };
      return [
        "【KATA 工作通知】",
        `任务: ${e.skill_id ?? "?"}`,
        `阶段: ${e.phase ?? "(global)"}`,
        `状态: ${e.status ?? "?"}`,
        `Run: ${e.run_id ?? "?"}`,
        `seq=${e.seq ?? "?"}`,
        `事件: ${e.event_kind ?? "?"}`,
        `更新时间: ${e.ts ?? new Date().toISOString()}`,
        `Mode: ${s.mode ?? "(none)"}`,
        `Slots: ${Object.keys(s.slots).join(", ") || "(empty)"}`,
      ].join("\n");
    }

    function flushSync(): void {
      if (!pending) return;
      const body = render(pending);
      const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
      writeFileSync(tmp, body, "utf8");
      renameSync(tmp, path);
      pending = null;
      opts.onFlush?.();
    }

    async function update(args: { event: Record<string, unknown>; snapshot: Record<string, unknown> }): Promise<void> {
      pending = args;
      if (debounceMs === 0) { flushSync(); return; }
      if (timer) clearTimeout(timer);
      timer = setTimeout(flushSync, debounceMs);
    }

    async function flush(): Promise<void> {
      if (timer) { clearTimeout(timer); timer = null; }
      flushSync();
    }

    return { update, flush };
  }
  ```

- [ ] **Step 6.b.8: 跑确认 PASS**

  Run: `bun test engine/tests/runtime/projector.test.ts`
  Expected: PASS。


### TDD sub-steps（第三批 — phase-dispatcher）

- [ ] **Step 6.b.9: 写 failing test — phase-dispatcher 决策**

  Create `engine/tests/runtime/phase-dispatcher.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { decidePhase } from "../../src/runtime/phase-dispatcher.ts";

  describe("phase dispatcher", () => {
    test("inline phase returns kind=inline + uses SKILL.md defaults (step model/effort ignored, warn emitted)", () => {
      const warns: string[] = [];
      const d = decidePhase({
        step: { id: "source-intake", dispatch: "inline", model: "haiku", effort: "low", blackboard_inputs: [], blackboard_outputs: ["source_refs"], failure_modes: [] },
        workflow: { name: "case-draft", version: 2, default_dispatch: "inline", default_model: "opus", default_effort: "medium", entry: "", description: "", steps: [] },
        skillDefaults: { model: "sonnet", effort: "high", agent: "general-purpose" },
        warn: (msg) => warns.push(msg),
      });
      expect(d.kind).toBe("inline");
      // spec §6.9: inline 用 SKILL.md model/effort；step / workflow 上的 model/effort warn 而非 enforce
      expect(d.model).toBe("sonnet");
      expect(d.effort).toBe("high");
      expect(warns.some((w) => w.includes("inline phase 'source-intake'") && w.includes("model"))).toBe(true);
      expect(warns.some((w) => w.includes("inline phase 'source-intake'") && w.includes("effort"))).toBe(true);
    });

    test("subagent phase uses step override > workflow default > skill default", () => {
      const d = decidePhase({
        step: { id: "spec-review", dispatch: "subagent", model: "haiku", effort: "low", reviewers: ["spec-reviewer"], blackboard_inputs: [], blackboard_outputs: [], failure_modes: [] },
        workflow: { name: "case-draft", version: 2, default_dispatch: "inline", default_model: "sonnet", default_effort: "high", entry: "", description: "", steps: [] },
        skillDefaults: { model: "sonnet", effort: "high", agent: "general-purpose" },
      });
      expect(d.kind).toBe("subagent");
      expect(d.model).toBe("haiku");
      expect(d.effort).toBe("low");
      expect(d.subagentType).toBe("general-purpose");
    });

    test("subagent phase with step subagent_type overrides skill default", () => {
      const d = decidePhase({
        step: { id: "draft", dispatch: "subagent", subagent_type: "code-architect", blackboard_inputs: [], blackboard_outputs: [], failure_modes: [] },
        workflow: { name: "x", version: 2, default_dispatch: "inline", default_model: "sonnet", default_effort: "high", entry: "", description: "", steps: [] },
        skillDefaults: { model: "sonnet", effort: "high", agent: "general-purpose" },
      });
      expect(d.subagentType).toBe("code-architect");
    });

    test("subagent decision emits dispatched/completed event identifiers", () => {
      const d = decidePhase({
        step: { id: "spec-review", dispatch: "subagent", model: "haiku", effort: "low", reviewers: ["spec-reviewer"], blackboard_inputs: [], blackboard_outputs: [], failure_modes: [] },
        workflow: { name: "x", version: 2, default_dispatch: "inline", default_model: "sonnet", default_effort: "high", entry: "", description: "", steps: [] },
        skillDefaults: { model: "sonnet", effort: "high", agent: "general-purpose" },
      });
      expect(d.dispatchedEventKind).toBe("subagent_dispatched");
      expect(d.completedEventKind).toBe("subagent_completed");
      expect(d.failedEventKind).toBe("subagent_failed");
    });
  });
  ```

- [ ] **Step 6.b.10: 跑确认 fail**

  Run: `bun test engine/tests/runtime/phase-dispatcher.test.ts`
  Expected: FAIL。

- [ ] **Step 6.b.11: 实现 `engine/src/runtime/phase-dispatcher.ts`**

  Write:
  ```typescript
  import type { Workflow, WorkflowStep } from "../skills/workflow-schema.ts";

  export interface SkillDefaults {
    model: "sonnet" | "opus" | "haiku";
    effort: "low" | "medium" | "high";
    agent: string;            // subagent_type 默认（如 "general-purpose"）
  }

  export interface PhaseDecisionInput {
    step: WorkflowStep;
    workflow: Workflow;
    skillDefaults: SkillDefaults;
    /** 可选：v2-warn 收集器；inline phase 上 step model/effort 不应用但要 warn。 */
    warn?: (msg: string) => void;
  }

  export interface PhaseDecision {
    kind: "inline" | "subagent";
    model: "sonnet" | "opus" | "haiku";
    effort: "low" | "medium" | "high";
    subagentType?: string;
    dispatchedEventKind: "subagent_dispatched";
    completedEventKind: "subagent_completed";
    failedEventKind: "subagent_failed";
  }

  export function decidePhase(input: PhaseDecisionInput): PhaseDecision {
    const { step, workflow, skillDefaults, warn } = input;
    const kind = step.dispatch ?? workflow.default_dispatch ?? "inline";
    let model: "sonnet" | "opus" | "haiku";
    let effort: "low" | "medium" | "high";
    if (kind === "inline") {
      // spec §6.9：inline 只用 SKILL.md model/effort；step 上的 model/effort warn 而非 enforce
      if (step.model && warn) warn(`inline phase '${step.id}' step.model='${step.model}' is ignored (using SKILL.md model)`);
      if (step.effort && warn) warn(`inline phase '${step.id}' step.effort='${step.effort}' is ignored (using SKILL.md effort)`);
      model = skillDefaults.model;
      effort = skillDefaults.effort;
    } else {
      // subagent：step > workflow default > skill default
      model = step.model ?? workflow.default_model ?? skillDefaults.model;
      effort = step.effort ?? workflow.default_effort ?? skillDefaults.effort;
    }
    const subagentType = kind === "subagent" ? (step.subagent_type ?? skillDefaults.agent) : undefined;
    return {
      kind,
      model,
      effort,
      subagentType,
      dispatchedEventKind: "subagent_dispatched",
      completedEventKind: "subagent_completed",
      failedEventKind: "subagent_failed",
    };
  }

  // engine→orchestrator dispatch envelope（spec §6.9 + §13 F3）。
  // skill prompt（P3 落地）按 envelope 字段调 Agent 工具，把 model 直接传 Agent tool 的 model 参数。
  // Claude harness 把该参数注入 subagent session，不依赖 LLM 自由选 model。
  export interface DispatchEnvelope {
    kind: "subagent";
    model: "sonnet" | "opus" | "haiku";
    effort: "low" | "medium" | "high";
    subagent_type: string;
    expected_events: ["subagent_dispatched", "subagent_completed" | "subagent_failed"];
    prompt_hint?: string;
  }

  export function buildDispatchEnvelope(d: PhaseDecision, promptHint?: string): DispatchEnvelope | null {
    if (d.kind !== "subagent") return null;
    return {
      kind: "subagent",
      model: d.model,
      effort: d.effort,
      subagent_type: d.subagentType ?? "general-purpose",
      expected_events: ["subagent_dispatched", "subagent_completed"],
      prompt_hint: promptHint,
    };
  }
  ```

  **engine ↔ orchestrator 契约（解决 spec §13 F3 决策面）：**
  - engine 输出 `DispatchEnvelope`（含 model / effort / subagent_type / expected_events）
  - skill orchestrator（P3 实施）按 envelope **机械地**调用 Claude Code Agent 工具：
    ```
    Agent({
      subagent_type: envelope.subagent_type,
      model:         envelope.model,             // 直接透传，不由 LLM 自由判断
      description:   envelope.prompt_hint,
      prompt:        <phase-specific subagent body>
    })
    ```
  - Claude Code harness 把 `model` 注入 subagent session（这是 harness 原生行为；engine TS 层无 Agent 工具，所以本 commit 不直接 spawn）。
  - **F3 实测验证**（spec §13 F3 "实测 Agent 工具的 model 参数是否每次都被尊重"）落在 P3#7 case-draft 实现完后：跑一次 case-draft，看 events.jsonl 是否有 subagent_dispatched 事件、模型参数是否与 envelope 一致（通过 subagent 内部输出的 model 自报或 token 用量验证）。本 commit 只保证 envelope 结构正确 + 单元测试覆盖 decidePhase / buildDispatchEnvelope。

- [ ] **Step 6.b.12: 跑确认 PASS**

  Run: `bun test engine/tests/runtime/phase-dispatcher.test.ts`
  Expected: 4 case PASS。

### TDD sub-steps（第四批 — staged transaction project 阶段 + projection_failed 补偿事件）

注：6.a 已交付 `stageAndCommitArtifact`（stage + commit 两段）。本批扩展为 `emitArtifactWritten`，在 stage+commit 之后接入 blackboard.applyDelta + notify projector，**project 失败时 emit `projection_failed` 补偿事件**（spec §9.4 表末段）。

- [ ] **Step 6.b.13: 写 failing test — emitArtifactWritten + project 失败补偿**

  Create `engine/tests/runtime/staged-project.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { openSession } from "../../src/runtime/session.ts";
  import { createBlackboard } from "../../src/runtime/blackboard.ts";
  import { emitArtifactWritten } from "../../src/runtime/staged-transaction.ts";

  function mkRoot(): string {
    return mkdtempSync(join(tmpdir(), "kata-stx-"));
  }

  describe("staged transaction", () => {
    test("happy path: stage + commit + project all succeed", async () => {
      const root = mkRoot();
      try {
        const sess = await openSession({
          root, project: "p", featureId: "f",
          skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0",
        });
        const bb = createBlackboard({
          root, project: "p", featureId: "f", runId: sess.runId,
          declaredOutputs: { output: ["archive_path"] },
        });
        bb.enterPhase("output");
        await emitArtifactWritten({
          session: sess, blackboard: bb,
          kind: "archive", phase: "output",
          contentBytes: Buffer.from("# Hello\n", "utf8"),
          targetPath: join(root, "workspace/p/features/f/archive.md"),
          blackboardSlot: "archive_path",
        });
        expect(existsSync(join(root, "workspace/p/features/f/archive.md"))).toBe(true);
        expect(bb.snapshot().slots.archive_path).toContain("archive.md");
        const lines = readFileSync(
          join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`),
          "utf8",
        ).trim().split("\n").map((l) => JSON.parse(l));
        const last = lines[lines.length - 1];
        expect(last.event_kind).toBe("artifact_written");
        expect(last.hashed_artifact_ref).toMatch(/^sha256:[a-f0-9]{64}$/);
        await sess.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("project failure: artifact_written appended, then projection_failed compensating event", async () => {
      const root = mkRoot();
      try {
        const sess = await openSession({ root, project: "p", featureId: "f", skillId: "case-draft", skillVersion: "1.0.0", workflowId: "case-draft@1.0.0" });
        const bb = createBlackboard({ root, project: "p", featureId: "f", runId: sess.runId, declaredOutputs: { output: ["archive_path"] } });
        bb.enterPhase("output");
        await emitArtifactWritten({
          session: sess, blackboard: bb,
          kind: "archive", phase: "output",
          contentBytes: Buffer.from("# OK\n", "utf8"),
          targetPath: join(root, "workspace/p/features/f/archive.md"),
          blackboardSlot: "archive_path",
          projectorOverride: { update: async () => { throw new Error("simulated projector failure"); }, flush: async () => {} },
        });
        const lines = readFileSync(
          join(root, "workspace/p/features/f/events", `${sess.runId}.jsonl`),
          "utf8",
        ).trim().split("\n").map((l) => JSON.parse(l));
        const last2 = lines.slice(-2);
        expect(last2[0].event_kind).toBe("artifact_written");
        expect(last2[1].event_kind).toBe("projection_failed");
        expect(last2[1].status).toBe("failed");
        expect(last2[1].payload?.references_seq).toBe(last2[0].seq);
        await sess.close();
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
  ```

- [ ] **Step 6.b.14: 跑确认 fail**

  Run: `bun test engine/tests/runtime/staged-transaction.test.ts`
  Expected: FAIL。

- [ ] **Step 6.b.15: 在 6.a 的 `staged-transaction.ts` 增加 `emitArtifactWritten` 包装**

  Append to `engine/src/runtime/staged-transaction.ts`:
  ```typescript
  import type { Blackboard } from "./blackboard.ts";
  import type { NotifyProjector } from "./projector.ts";

  export interface EmitArtifactOptions extends StageAndCommitOptions {
    blackboard: Blackboard;
    notifyProjector?: NotifyProjector;
  }

  export async function emitArtifactWritten(opts: EmitArtifactOptions): Promise<void> {
    // 6.a 已交付的 stage + commit 两段
    await stageAndCommitArtifact(opts);
    // 6.b 增补的 project 阶段
    const seq = opts.session.lastSeq();
    try {
      await opts.blackboard.applyDelta({ [opts.blackboardSlot]: opts.targetPath }, seq);
      if (opts.notifyProjector) {
        await opts.notifyProjector.update({
          event: { event_kind: "artifact_written", phase: opts.phase, status: "ok", seq, run_id: opts.session.runId, skill_id: "" },
          snapshot: opts.blackboard.snapshot() as unknown as Record<string, unknown>,
        });
      }
    } catch (e) {
      await opts.session.emit("projection_failed", {
        status: "failed",
        phase: opts.phase,
        payload: { references_seq: seq, error: (e as Error).message },
      });
    }
  }
  ```

  注：`Session.lastSeq()` 已在 6.a step 6.a.12 实现并测试过。

- [ ] **Step 6.b.16: 跑确认 PASS**

  Run: `bun test engine/tests/runtime/staged-project.test.ts`
  Expected: 2 case PASS（happy path + project 失败补偿）。

### TDD sub-steps（第五批 — CLI `kata events`）

- [ ] **Step 6.b.17: 写 failing test — events CLI 按 spec §9.7 命令面**

  Spec §9.7:
  ```
  kata events tail [--feature X] [--run-id Y] [--kind validator_failed]
  kata events replay <run_id>
  kata events stats [--since 7d] [--by skill|phase]
  kata events validate <jsonl>
  kata events project <run_id>
  ```

  CLI 用 `--workspace-root <path>` 全局选项（默认 `process.cwd()`）定位 `workspace/<project>/features/<feature>/events/<run_id>.jsonl`；`<run_id>` 仅作位置参；`--feature` 指 feature_id（不是绝对路径）；`--kind` filter 单 event_kind。

  Create `engine/tests/cli/events.test.ts`:
  ```typescript
  import { describe, expect, test } from "bun:test";
  import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { buildEventsCommand } from "../../src/cli/events.ts";

  const RUN = "run_01HZX00000000000000000000A";
  function mkRoot(): string {
    const root = mkdtempSync(join(tmpdir(), "kata-events-cli-"));
    const dir = join(root, "workspace/p/features/f/events");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${RUN}.jsonl`), [
      JSON.stringify({ schema_version: 1, seq: 0, event_id: "evt_01HZX00000000000000000000B", ts: "2026-05-29T10:00:00.000Z", run_id: RUN, feature_id: "f", skill_id: "case-draft", skill_version: "1.0.0", workflow_id: "case-draft@1.0.0", event_kind: "session_started", status: "ok" }),
      JSON.stringify({ schema_version: 1, seq: 1, event_id: "evt_01HZX00000000000000000000C", ts: "2026-05-29T10:00:05.000Z", run_id: RUN, feature_id: "f", skill_id: "case-draft", skill_version: "1.0.0", workflow_id: "case-draft@1.0.0", event_kind: "phase_entered", phase: "source-intake", status: "ok" }),
      JSON.stringify({ schema_version: 1, seq: 2, event_id: "evt_01HZX00000000000000000000D", ts: "2026-05-29T10:00:06.000Z", run_id: RUN, feature_id: "f", skill_id: "case-draft", skill_version: "1.0.0", workflow_id: "case-draft@1.0.0", event_kind: "validator_failed", phase: "source-intake", status: "failed" }),
    ].join("\n") + "\n");
    return root;
  }

  describe("kata events CLI", () => {
    test("validate <jsonl> exit 0 on well-formed file", async () => {
      const root = mkRoot();
      try {
        const cmd = buildEventsCommand();
        const exitCode = await runCmd(cmd, ["validate", join(root, "workspace/p/features/f/events", `${RUN}.jsonl`)]);
        expect(exitCode).toBe(0);
      } finally { rmSync(root, { recursive: true, force: true }); }
    });

    test("validate <jsonl> exit 1 on broken envelope", async () => {
      const root = mkdtempSync(join(tmpdir(), "kata-events-cli-"));
      const dir = join(root, "workspace/p/features/f/events");
      mkdirSync(dir, { recursive: true });
      const broken = join(dir, "x.jsonl");
      writeFileSync(broken, JSON.stringify({ event_kind: "made_up" }) + "\n");
      try {
        const exitCode = await runCmd(buildEventsCommand(), ["validate", broken]);
        expect(exitCode).toBe(1);
      } finally { rmSync(root, { recursive: true, force: true }); }
    });

    test("tail --feature f --run-id <id> prints all events (no follow)", async () => {
      const root = mkRoot();
      const captured: string[] = [];
      const origLog = console.log;
      console.log = (s: string) => { captured.push(s); };
      try {
        await runCmd(buildEventsCommand(), ["tail", "--workspace-root", root, "--project", "p", "--feature", "f", "--run-id", RUN]);
        expect(captured.length).toBe(3);
      } finally {
        console.log = origLog;
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("tail --kind validator_failed filters event_kind", async () => {
      const root = mkRoot();
      const captured: string[] = [];
      const origLog = console.log;
      console.log = (s: string) => { captured.push(s); };
      try {
        await runCmd(buildEventsCommand(), ["tail", "--workspace-root", root, "--project", "p", "--feature", "f", "--run-id", RUN, "--kind", "validator_failed"]);
        expect(captured.length).toBe(1);
        expect(JSON.parse(captured[0]).event_kind).toBe("validator_failed");
      } finally {
        console.log = origLog;
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("stats --by event_kind groups across features", async () => {
      const root = mkRoot();
      const captured: string[] = [];
      const origLog = console.log;
      console.log = (s: string) => { captured.push(s); };
      try {
        await runCmd(buildEventsCommand(), ["stats", "--workspace-root", root, "--project", "p", "--by", "event_kind"]);
        const text = captured.join("\n");
        expect(text).toContain("session_started: 1");
        expect(text).toContain("phase_entered: 1");
        expect(text).toContain("validator_failed: 1");
      } finally {
        console.log = origLog;
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("replay <run_id> yields events in seq order", async () => {
      const root = mkRoot();
      const captured: string[] = [];
      const origLog = console.log;
      console.log = (s: string) => { captured.push(s); };
      try {
        await runCmd(buildEventsCommand(), ["replay", RUN, "--workspace-root", root, "--project", "p", "--feature", "f"]);
        const events = captured.map((l) => JSON.parse(l));
        expect(events.map((e: any) => e.seq)).toEqual([0, 1, 2]);
      } finally {
        console.log = origLog;
        rmSync(root, { recursive: true, force: true });
      }
    });

    test("project <run_id> renders notify markdown for last event", async () => {
      const root = mkRoot();
      const { existsSync, readFileSync } = await import("node:fs");
      try {
        await runCmd(buildEventsCommand(), ["project", RUN, "--workspace-root", root, "--project", "p", "--feature", "f"]);
        const md = join(root, "workspace/p/.kata/notify", `${RUN}.md`);
        expect(existsSync(md)).toBe(true);
        const body = readFileSync(md, "utf8");
        expect(body).toContain("【KATA 工作通知】");
        expect(body).toContain("validator_failed");
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  });

  async function runCmd(cmd: any, argv: string[]): Promise<number> {
    let exitCode = 0;
    const origExit = process.exit;
    process.exit = ((code?: number) => { exitCode = code ?? 0; throw new Error("__exit__"); }) as any;
    try {
      await cmd.parseAsync(["bun", "kata", ...argv]);
    } catch (e) {
      if ((e as Error).message !== "__exit__") throw e;
    } finally {
      process.exit = origExit;
    }
    return exitCode;
  }
  ```

- [ ] **Step 6.b.18: 跑确认 fail**

  Run: `bun test engine/tests/cli/events.test.ts`
  Expected: FAIL。

- [ ] **Step 6.b.19: 实现 `engine/src/cli/events.ts`**

  Write commander command builder 按 spec §9.7：
  - 全局选项：`--workspace-root <path>`（默认 `process.cwd()`）、`--project <name>`、`--feature <feature_id>`
  - `tail [--run-id Y] [--kind K]`：扫 `workspace/<project>/features/<feature>/events/*.jsonl`（或按 `--run-id` 单文件），逐行 console.log。filter 可选 `--kind`。**不实现 follow=true**（spec 没要求），所以 `--follow` 标志不加。
  - `replay <run_id>`：必须指定 `--project --feature`；读 `<run_id>.jsonl` 按 seq 升序输出（实际 jsonl 已按 seq 顺序写入，直接逐行 print）。
  - `stats [--since 7d] [--by skill|phase|event_kind]`：聚合 `events.index.jsonl` 或多个 jsonl。
  - `validate <jsonl>`：逐行 parse + `validateEvent`，全过 exit 0，任一失败 exit 1。
  - `project <run_id>`：调 `createNotifyProjector` + 找 `<run_id>.jsonl` 最后一行 event + 读 `blackboard.json` 为 snapshot + `.update({event, snapshot})` + `.flush()`，写入 `.kata/notify/<run_id>.md`。

  完整实现 < 250 行 TS，按 step 6.b.17 测试断言细化。

  注意：`buildEventsCommand` 返回 `commander.Command` 实例。注册到根命令时按现仓 `engine/src/cli/index.ts` 的现有模式（实现者先 `grep -n "addCommand\|registerCommand" engine/src/cli/index.ts` 看现存的 commander 入口对象命名，再 mimic）。

- [ ] **Step 6.b.20: 在 `engine/src/cli/index.ts` 注册 events 子命令**

  Run first: `grep -n "addCommand\|createCli\|new Command" engine/src/cli/index.ts | head -10`
  根据现仓 commander 入口对象名，添加：
  ```typescript
  import { buildEventsCommand } from "./events.ts";
  <现有 command 对象名>.addCommand(buildEventsCommand());
  ```
  (现仓很可能是 `program` / `kata` / 直接 `cli`，按 grep 结果对齐。)

- [ ] **Step 6.b.21: 跑确认 PASS**

  Run: `bun test engine/tests/cli/events.test.ts`
  Expected: 5 case PASS。

### TDD sub-steps（第六批 — schema + 收尾）

- [ ] **Step 6.b.22: 创建 `.claude/contracts/schemas/blackboard.json`**

  按 step 6.b 顶部 "Blackboard envelope schema" 段落原文写入。

- [ ] **Step 6.b.23: 写 test — blackboard schema 与 implementation 一致**

  Append to `engine/tests/runtime/blackboard.test.ts`:
  ```typescript
  test("blackboard.json schema $id matches snapshot envelope", () => {
    const schema = JSON.parse(
      readFileSync(join(repoRoot(), ".claude/contracts/schemas/blackboard.json"), "utf8"),
    );
    expect(schema.required).toEqual(["schema_version", "run_id", "feature_id", "last_seq", "slots"]);
  });
  ```

- [ ] **Step 6.b.24: 更新 `engine/tests/large-file-split.test.ts`**

  加 4 个新文件 entry：
  ```
  "engine/src/runtime/blackboard.ts",
  "engine/src/runtime/projector.ts",
  "engine/src/runtime/phase-dispatcher.ts",
  "engine/src/runtime/staged-transaction.ts",
  "engine/src/cli/events.ts",
  ```

- [ ] **Step 6.b.25: 跑全量 runtime + cli 测试**

  Run: `bun test engine/tests/runtime/ engine/tests/cli/`
  Expected: 全 PASS。

- [ ] **Step 6.b.26: 跑 engine 全量 + lint + type-check**

  Run: `bun test --cwd engine && bun run lint && bun run type-check`
  Expected: 全 PASS。

- [ ] **Step 6.b.27: 跑 sync-check 确认 P1 lint 仍通过**

  Run: `bun run check:skills`
  Expected: 通过。

- [ ] **Step 6.b.28: 实测 CLI**

  Run:
  ```bash
  # 用 stress test 留下的 sample 文件，或现场跑一个 session 写一个文件
  bun engine/bin/kata events validate /tmp/<jsonl path> || true
  bun engine/bin/kata events tail --help
  bun engine/bin/kata events stats --help
  ```
  Expected: 命令注册成功，`--help` 输出 5 subcommand。

- [ ] **Step 6.b.29: commit**

  ```bash
  git add engine/src/runtime/blackboard.ts engine/src/runtime/projector.ts engine/src/runtime/phase-dispatcher.ts engine/src/runtime/staged-transaction.ts
  git add engine/src/runtime/session.ts   # lastSeq 扩展
  git add engine/src/cli/events.ts engine/src/cli/index.ts
  git add .claude/contracts/schemas/blackboard.json
  git add engine/tests/runtime/blackboard.test.ts engine/tests/runtime/projector.test.ts engine/tests/runtime/phase-dispatcher.test.ts engine/tests/runtime/staged-transaction.test.ts engine/tests/runtime/session.test.ts
  git add engine/tests/cli/events.test.ts
  git add engine/tests/large-file-split.test.ts
  git commit -m "feat: 🧩 blackboard + projector + cli + phase dispatcher"
  ```

---

## P2 收尾（merge & cleanup）

- [ ] **Step P2.X.1: worktree 内跑全套 ci**

  Run in worktree: `bun run ci`
  Expected: 全套通过。

- [ ] **Step P2.X.2: 实测 case-draft 与 backbone 还未对接**

  Run（如下命令应该都 exit 0，但不期望真实写 event journal — case-draft skill 还没接 backbone，P3#7 才接）：
  ```bash
  bun engine/bin/kata events validate /dev/null  # 空文件应过
  ls workspace/  # 现仓真实 workspace，不应被 P2 改动
  ```
  Expected: 不写新文件到任何 `workspace/<project>/features/*/events/`。

- [ ] **Step P2.X.3: 记录 worktree HEAD SHA + merge**

  ```bash
  SHA=$(git -C .worktrees/p2-event-core rev-parse HEAD)
  cd /Users/poco/Projects/kata
  git merge --no-ff "$SHA" -m "merge: 🔀 P2 event journal core (2 commits)"
  bun run ci
  ```

- [ ] **Step P2.X.4: push + cleanup worktree**

  ```bash
  git push origin main
  git worktree remove .worktrees/p2-event-core
  ```

---

## Self-Review checklist（实现者跑 ci 前自查）

### Spec coverage（spec §11 P2 表 + §9 全节）

- [x] 6.a covers spec §9.2 envelope + §9.3 19 event_kinds + §9.4 atomic append + 单调 seq + fail-closed
- [x] 6.a covers spec §11 P2#6.a "升级 telemetry validator 到 19 event_kinds + 完整 envelope" via `runtime-telemetry.ts` adapter
- [x] 6.b covers spec §9.4 staged transaction（stage → commit → project + projection_failed compensating event）
- [x] 6.b covers spec §9.4 "events.index 用 file lock"（proper-lockfile）
- [x] 6.b covers spec §9.5 blackboard projection（validator-enforced）
- [x] 6.b covers spec §9.6 notify projection（debounced + atomic rename）
- [x] 6.b covers spec §9.7 CLI tail/replay/stats/validate/project
- [x] 6.b covers spec §6.9 per-phase model fallback chain + §13 F3 决策层（真实 Agent spawn P3#7 落地）
- [x] §9.8 MCP `kata_query_events` 落到 P4#10（spec §11 也是 P4#10）—— **本 plan 不覆盖，不算 gap**

### Spec §13 风险对应

- F2（staged transaction 复杂度）→ commit 6.b step 6.b.13 三段失败路径 + recover 全覆盖
- F3（Phase Dispatcher 与 Agent 工具）→ commit 6.b step 6.b.11 决策层 + P3#7 实测 spawn（明文写）
- 风险 2（event_kind 枚举可能再扩）→ EVENT_KINDS as const，扩枚举只需改一处 + schema.json + 测试
- 风险 3（blackboard validator 严格度）→ commit 6.b step 6.b.3 默认 hard-reject 未声明 slot；可在 P3 实测 tuning

### Placeholder scan

- 全文搜索：`TBD`、`TODO`、`fill in later`、`Similar to`、`appropriate error handling`
- 唯一例外：step 6.b.11 末尾 "真正的 Agent 工具调用 wire-up 在 P3#7 case-draft 迁移时落地" —— 这是 cross-phase 责任声明，不是 plan 步骤的 placeholder；本 plan commit 6.b 完成时 decidePhase 已完整可用。

### Type / 名称一致性

- `Session` 接口在 6.a 定义（`runId / emit / close`），6.b step 6.b.15 显式扩 `lastSeq?: () => number;` —— 在 6.b 描述里说明并要求 implementer 修改 6.a 的实现（合规：commit 6.b 可改 6.a 的文件，只要测试仍 PASS）。
- `EventWriter` 接口在 6.a 定义；6.b 不直接调，通过 Session 间接调，无破坏。
- `Blackboard` / `NotifyProjector` / `PhaseDecision` / `EmitArtifactOptions` 在 6.b 各自首次出现，无 cross-commit drift。
- `EVENT_KINDS` 在 6.a 定义为 `as const` tuple；6.b 不重复定义，引用即可。

### 测试基线

每个 commit 边界：`bun test --cwd engine` fail = 0；新增 test 数 ≥ commit 描述列出的（6.a 4 文件 ~20 case；6.b 5 文件 ~20 case）。

---

## Plan complete — Execution handoff

Plan saved to `docs/superpowers/plans/2026-05-29-p2-event-journal-core.md`。P2 包含 2 commits，hard 顺序 6.a → 6.b（6.b 改 6.a 的 session.ts 加 `lastSeq`，并依赖 6.a 的 event-writer/validator/session）。建议 `superpowers:subagent-driven-development` 执行：一个 implementer 跑 6.a，spec review + quality review 通过后再跑 6.b。

P2 不直接动 skill 行为（case-draft 等 skill 还不会写 event journal）；真实 backbone 接入在 P3。
