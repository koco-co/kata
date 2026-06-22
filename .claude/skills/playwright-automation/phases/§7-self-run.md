# self-run

## 读取时机

进入 `self-run` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 命令序列（唯一权威）

flag 拼写以 `bun run kata results path --help`、`bun run kata handoff render --help` 为准。

```bash
# 1. 分配 run 目录
RUN_PATH=$(kata results path <featureId> --new-run --project <project>)
RUN_ID=$(basename "$RUN_PATH")

# 2. --list 预览：确认 spec 可被 Playwright 解析（缺 case 说明 runner import 不全）
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> \
  npx playwright test 'features/<version>/<featureId>/automation/tests/runners/full.spec.ts' --list

# 3. 运行 full.spec.ts
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> \
  KATA_ALLURE_RESULTS_DIR="$RUN_PATH/allure-results" \
  npx playwright test 'features/<version>/<featureId>/automation/tests/runners/full.spec.ts' \
  --output="$RUN_PATH/playwright"

# 4. 渲染 handoff.md（先按 PlaywrightAutomationHandoff@2 写好 $RUN_PATH/handoff.json）
kata handoff render <featureId> --run "$RUN_ID" --project <project>
```

判读规则：

- `--list` 无输出/报错 → 检查 import 路径与文件命名；缺预期 case → runner import 待补；全部列出 → 进运行。
- 运行退出码：0=全过，非 0=有失败。记 passed/failed/skipped 数与失败错误摘要。
- `KATA_ALLURE_RESULTS_DIR` 把 allure 落点统一到 `$RUN_PATH/allure-results`，和 `playwright/` 同在本次 run 目录，`kata results publish` 才能一并发布。
- handoff.json 的 `run_command` 记本次实际命令；`acceptance_command` 记带 `full.spec.ts` + `--headed` 的有头验收命令。

## few-shot：中文展示名目录

`features/<version>/【v...】.../` 这类中文展示名目录，**不传 `KATA_ACTIVE_FEATURE`**，用绝对/相对路径直接点 spec：

```bash
FEATURE_DIR='workspace/dataAssets/features/v6.4.11/【v6411】【客户】【模块】需求名'
RUN_PATH="$FEATURE_DIR/runs/20260622-0630-codexrun"
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV=ltqc-local.yaml KATA_ACTIVE_PROJECT=dataAssets \
  KATA_ALLURE_RESULTS_DIR="$RUN_PATH/allure-results" \
  npx playwright test "$FEATURE_DIR/automation/tests/runners/full.spec.ts" \
  --output="$RUN_PATH/playwright"
```

## 人工验收命令（交付前必打印）

无论结果 passed/blocked/failed/partial，最终交付都要给一条可直接复制的有头全量验收命令：

```bash
KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> npx playwright test 'features/<version>/<featureId>/automation/tests/runners/full.spec.ts' --headed --reporter=line
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
