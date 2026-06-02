# dtstack-sdk 迁移到 .claude/packages 设计

- 日期：2026-06-02
- 状态：设计已确认，待写实施计划
- 方向：A —— 保持独立 workspace 包，从 `tools/` 挪到 `.claude/packages/dtstack`

## 背景与动机

`tools/` 目录当前只装 `dtstack-sdk` 一个包（外加一个 `.DS_Store`），为单个包保留一级顶层目录显得冗余。用户希望让它「归位」、与项目其它内部代码概念统一。

调研结论：`.claude/plugins/*`（lanhu/zentao/notify）是**事件驱动的轻量集成适配器**——单个 `fetch.ts`、无自带依赖、通过 `plugin.json` 的 hooks 挂到 skill 生命周期（`case-draft:init` 等）。而 `dtstack-sdk` 是**被测试代码 `import` 的运行时库/包**：自带依赖树（mysql2、sm-crypto、yaml，可选 hive-driver，peer @playwright/test）、subpath exports（`dtstack-sdk/adapters/...`）、`dtstack-cli` bin、独立测试。两者不是同一物种。

因此**不**把它塞进 `.claude/plugins`（会伪造用不上的 hook、把 DB 驱动灌进根依赖、污染 plugin 模型定义），而是把它挪到与另一个 workspace 成员 `.claude/scripts/_shared` 同辈的内部包位置 `.claude/packages/dtstack`。

被否决的备选：
- **B 混血**：挪进 `.claude/plugins/dtstack` 但保留 package.json。视觉归位但破坏 plugin 模型一致性。
- **C 全量压成 plugin**：删 package.json、deps 进根、重写 import、加 hook。代价最大且 hook 是硬造的。

## 核心原则

**包名 `dtstack-sdk` 保持不变。** 所有 `import ... from "dtstack-sdk"` 与 `dtstack-sdk/adapters/...` 靠 bun workspace 的包名解析，零改动。本次只动**物理目录路径**和代码里**硬编码的运行时文件系统路径字符串**。

## 变更清单

### 1. 移动目录
- `git mv tools/dtstack-sdk .claude/packages/dtstack`（保留 git 历史）。
- 删除空掉的 `tools/` 目录及 `tools/.DS_Store`。

### 2. 根 `package.json`
- `workspaces`：`"tools/dtstack-sdk"` → `".claude/packages/dtstack"`。
- 脚本 `test:tools`：`--cwd tools/dtstack-sdk` → `--cwd .claude/packages/dtstack`。
- 脚本 `lint`：`biome check ... tools` 中的 `tools` glob → `.claude/packages`。

### 3. 包内 `tsconfig.json`
- `extends`：`"../../tsconfig.json"` → `"../../../tsconfig.json"`（目录深了一层）。

### 4. 硬编码运行时路径（filesystem 字符串，非 import，必须改）
- `src/adapters/execute-table.ts:45` —— spawn CLI 用的 `tools/dtstack-sdk/src/cli.ts`。
- `__tests__/adapters/execute-table.test.ts:66` —— 断言里的同一路径。
- `.claude/scripts/_shared/tests/security-command-hardening.test.ts:14` —— `tools/dtstack-sdk/src/adapters/execute-table.ts`。
- `workspace/dataAssets/features/【v6410】【岚图汽车】【数据质量】主流程用例整理/tests/helpers/dtstack-preconditions.ts:162` —— fallback 路径（在 workspace/ 下，属测试产物，可改）。

全部改为 `.claude/packages/dtstack/...` 对应路径。

### 5. 文档
- 包内 `README.md:41`：`bun test tools/dtstack-sdk/__tests__` → 新路径。
- 包内 `scripts/diagnose-insert.ts:5`：运行注释里的路径。
- 根 `README.md:164` 与 `README-EN.md:164`：目录树里的 `tools/` 行。

### 6. 明确不动
- 4 处 `from "dtstack-sdk"` / `dtstack-sdk/adapters/...` 包名 import。
- 根 `tsconfig.json` 的 `include`：dtstack 现在就不在根 type-check 范围内（靠自带 tsconfig），保持现状不引入 `.claude/packages/**`，避免改变 type-check 行为。

### 7. 重链与验证
1. `bun install` —— 重建 workspace symlink（`node_modules/dtstack-sdk` 指向新路径）。
2. `bun run test:tools` —— 包自身测试。
3. 受影响 import 站点测试 + `security-command-hardening.test.ts`。
4. `bun run check`（biome）与 `bun run lint`。
5. `bun run check:skills`（应不受影响）。

验证须按测试规范记录 exact command、exit code、pass/fail/skip 计数。

## 出范围

- `.vscode/settings.json:120` 引用的 `./tools/lanhu/lanhu-mcp` 已失效（`tools/lanhu` 不存在）——与本次迁移**无关的既有问题**，不在本设计内，另行提醒处理。

## 可选改进（默认不做，避免扩范围）

把 `execute-table.ts` 里硬编码的 CLI 路径改成用 `import.meta` 推导，未来再挪目录就无需改字符串。是否纳入由用户在实施计划阶段决定。

## 验收标准

- `dtstack-sdk` 包位于 `.claude/packages/dtstack`，`tools/` 已删除。
- 所有 `from "dtstack-sdk"` import 无需改动即可解析。
- 全部硬编码路径已更新，无残留 `tools/dtstack-sdk` 引用（grep 验证）。
- `bun run test:tools` 与受影响测试全绿。
- `bun run check` / `lint` / `check:skills` 通过。
