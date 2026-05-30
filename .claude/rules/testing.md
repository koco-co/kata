# 测试规范

## Test-After-Edit

代码（含源代码、测试、脚本、配置）有任何改动后，**必须**跑相关单元测试；任何失败都要排查根因并修复。

### 规则

1. 改动落盘后立即运行受影响范围的单元测试（最小作用域优先，例：`bun test .claude/scripts/_shared/tests/<area>`）；不确定影响面时跑全量。
2. 任何 fail（含 pre-existing 失败）都必须在当前 worktree 内排查到根因并修复，不可只标 TODO、`skip`、`it.todo`、注释掉用例，或推给后续 PR。
3. 若失败确实超出本次任务能力范围（如需求未冻结、缺外部依赖），必须先停下来向用户说明失败用例、根因假设、所需决策，由用户显式同意后才能跳过；不得自行决定 defer。
4. 仅在所有相关测试 pass 后才能进入「合并回 main + push」步骤；merge 前再跑一次 `bun test` 做最终确认。
5. 纯文档（`*.md`、`docs/**`）改动可跳过测试，但若文档变更涉及命令、路径、配置示例，需手工验证示例可执行。

## 测试命令

- 全量：`bun test`。
- 局部：`bun test .claude/scripts/_shared/tests/<area>`。
- watch：`bun run test:watch`。
- Runtime 契约：`bun run check:skills`。
