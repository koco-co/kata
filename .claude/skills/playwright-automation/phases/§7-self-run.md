# self-run

## 读取时机

进入 `self-run` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 命令序列（唯一权威）

flag 拼写以 `bun run kata results path --help`、`bun run kata handoff render --help` 为准。

```bash
# 1. 分配 run 目录
RUN_PATH=$(kata results path <feature-id> --new-run --project <project>)
RUN_ID=$(basename "$RUN_PATH")

# 2. --list 预览：确认 spec 可被 Playwright 解析（缺 case 说明 runner import 不全）
PLAYWRIGHT_HTML_OPEN=never kata env run <env> -- \
  npx playwright test 'features/<version>/<feature-id>/automation/tests/runners/full.spec.ts' --list

# 3. 运行 full.spec.ts：唯一汇总入口，同时落实 @serial、Allure 与审查证据
PLAYWRIGHT_HTML_OPEN=never KATA_RUN_PATH="$RUN_PATH" PW_TWO_PHASE=1 SKIP_NOTIFY=1 \
  kata env run <env> -- kata run-tests-notify 'features/<version>/<feature-id>/automation/tests/runners/full.spec.ts' \
  --project=chromium --output="$RUN_PATH/playwright/test-results"

# 4. 写 handoff.json；先执行 §12 case-feedback，再由 §11 渲染 handoff.md
```

判读规则：

- `--list` 无输出/报错 → 检查 import 路径与文件命名；缺预期 case → runner import 待补；全部列出 → 进运行。
- 运行退出码：0=全过，非 0=有失败。记 passed/failed/skipped 数与失败错误摘要。
- `KATA_RUN_PATH` 让 wrapper 固定生成 `$RUN_PATH/allure-results/`、`playwright/full/stdout.log`、`stderr.log`、`exit-code` 与 `allure-report/`。
- `PW_TWO_PHASE=1` 先并发运行非 `@serial` case，再以 `workers=1` 运行 `@serial` case；汇总执行不得改回直接 `npx playwright test`。
- 运行后必须检查 `$RUN_PATH/allure-results` 至少包含本次目标 runner 的 result JSON；没有 Allure 结果时，本次 self-run 不得标记 passed。
- 运行后必须核对平台记录数据：记录每个状态变化用例产生的记录名称或 ID、页面路由/API、状态、截图或响应证据路径。没有平台业务记录且用户未明确要求只读脚本时，本次 self-run 不得标记 passed。
- handoff.json 的 `run_command` 记本次实际命令；`acceptance_command` 记带 `full.spec.ts` + `--headed` 的有头验收命令。

## few-shot：中文展示名目录

`features/<version>/【v...】.../` 这类中文展示名目录，**不传 `KATA_ACTIVE_FEATURE`**，用绝对/相对路径直接点 spec：

```bash
FEATURE_DIR='workspace/dataAssets/features/v6.4.11/【v6411】【客户】【模块】需求名'
RUN_PATH="$FEATURE_DIR/runs/20260622-0630-run-01"
PLAYWRIGHT_HTML_OPEN=never KATA_RUN_PATH="$RUN_PATH" PW_TWO_PHASE=1 SKIP_NOTIFY=1 \
  kata env run ltqc-local -- kata run-tests-notify "$FEATURE_DIR/automation/tests/runners/full.spec.ts" \
  --project=chromium --output="$RUN_PATH/playwright/test-results"
```

## 人工验收命令（交付前必打印）

无论结果 passed/blocked/failed/partial，最终交付都要给一条可直接复制的有头全量验收命令：

```bash
kata env run <env> -- npx playwright test 'features/<version>/<feature-id>/automation/tests/runners/full.spec.ts' --headed --reporter=line
```

调试可用无头命令，但交付或阻塞说明必须同时给出这条 `--headed` full.spec.ts 命令；不得只宣称完成，也不得只给 smoke 或单条用例命令。

## 烟雾验证

- `smoke.spec.ts` 只做前置验证，不替代 `full.spec.ts` 自运行。
- full 全部失败（0 passed）先跑 smoke 确认基座：smoke 正常但 full 失败 → run-triage；smoke 也失败 → 优先查 env profile 与 session。

## 禁止

全局禁令见 SKILL.md「真实性质控」。本阶段另加：

- 不得跳过 `--list` 直接运行；不得用不带文件参数的全量 Playwright 运行做调试。
- 仅运行 `smoke.spec.ts` 不得宣称端到端自动化完成。
- 不得在 CLI 用 `--reporter` 指定 allure：CLI 无法附带 `outputFolder`，allure 会退回仓库根 `./allure-results`，绕过 config。
