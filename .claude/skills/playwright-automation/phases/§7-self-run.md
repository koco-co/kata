# self-run

## 读取时机

进入 `self-run` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

### 第一步：--list 预览

在真实运行之前，必须先执行 `--list` 确认 spec 文件可被 Playwright 正确解析：

```bash
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV={env} KATA_ACTIVE_PROJECT=dataAssets npx playwright test 'automation/tests/runners/full.spec.ts' --list --project=chromium
```

输出应包含所有预期 case 名称和行号。若：
- 无输出或报错 → 检查 import 路径和文件命名是否正确
- 缺少预期 case → runner 的 import 可能需要补充
- 正确列出所有 case → 进入第二步

### 第二步：运行目标 full.spec.ts

```bash
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV={env} KATA_ACTIVE_PROJECT=dataAssets npx playwright test 'automation/tests/runners/full.spec.ts' --project=chromium --reporter=line
```

运行要求：
- **禁止**使用 `bun test`、`playwright test` 不带文件参数的全量运行
- 必须显式传入目标 spec 文件路径
- 必须使用明确的 `KATA_DATAASSETS_ENV` 环境变量
- 运行前确认 Auth session 未过期（浏览器没有被重定向到 /login）

### 第三步：记录运行证据

运行后必须记录：

1. **命令**：完整 shell 命令（含 KATA_DATAASSETS_ENV）
2. **退出码**：0=全部通过，1=有失败
3. **通过/失败数量**：passed N, failed N, skipped N
4. **失败详情**：每个失败 test 的错误消息摘要
5. **报告路径**：`runs/<run-id>/playwright/`、`runs/<run-id>/allure-results/` 及 `runs/<run-id>/handoff.json`
6. **输出摘要**：最后 20 行运行输出

### 第四步：烟雾验证

- `smoke.spec.ts` 可以作为前置验证，但不得替代 `full.spec.ts` 自运行
- 如果 full 全部失败（0 passed），先运行 smoke 确认基座是否正常
- 如果 smoke 运行正常但 full 失败 → 进入 run-triage
- 如果 smoke 也失败 → 优先检查 env profile 和 session 是否正常

### 第五步：人工验收命令

无论结果是 passed、blocked、failed 还是 partial，最终交付前都要打印一条人工验收命令：有头模式、跑 full test、可直接复制运行。

```bash
KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> npx playwright test 'features/<version>/<featureId>/automation/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line
```

调试时可以用无头命令，但交付或阻塞说明中必须同时给出上面这条 `--headed` full.spec.ts 命令；不得只宣称完成，也不得只给 smoke 或单条用例命令。

## self-run 命令模板

1. 先分配 run id：
   ```bash
   RUN_PATH=$(kata results path <featureId> --new-run --project <project>)
   RUN_ID=$(basename "$RUN_PATH")
   ```
2. 运行测试：
   ```bash
   PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> \
     KATA_ALLURE_RESULTS_DIR="$RUN_PATH/allure-results" \
     npx playwright test 'features/<version>/<featureId>/automation/tests/runners/full.spec.ts' \
     --output="$RUN_PATH/playwright"
   ```
   > allure 落点由 config 中带 `outputFolder` 的 reporter 决定，经 `KATA_ALLURE_RESULTS_DIR` 统一到
   > `$RUN_PATH/allure-results`，和 `playwright/` 同在本次 run 目录，`kata results publish` 才能一并发布。
   > 不得在 CLI 用 `--reporter` 指定 allure：CLI 无法附带 `outputFolder`，allure 会退回默认 `./allure-results`（仓库根）。
3. 测试退出后，按 `PlaywrightAutomationHandoff@2` schema 写 `$RUN_PATH/handoff.json`。`run_command` 记本次实际跑的命令；`acceptance_command` 记带 `full.spec.ts` 和 `--headed` 的有头全量验收命令。
4. 渲染 md：`kata handoff render <featureId> --run "$RUN_ID" --project <project>`。

## 禁止

全局禁令见 SKILL.md「真实性质控」。本阶段另加：

- 不得跳过 `--list` 直接运行。
- 不得用不带文件参数的全量 Playwright 运行做调试。
- 仅运行 `smoke.spec.ts` 不得宣称端到端自动化完成。
- 不得在 CLI 用 `--reporter` 指定 allure：会绕过 config 的 `outputFolder`，allure 落到仓库根 `./allure-results`。
