# self-run

## 读取时机

进入 `self-run` 阶段时读本文；前序阶段未通过不提前进入，也不批量预读 `phases/**`。

## 协议

### 第一步：--list 预览

在真实运行之前，必须先执行 `--list` 确认 spec 文件可被 Playwright 正确解析：

```bash
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV={env} KATA_ACTIVE_PROJECT=dataAssets npx playwright test 'tests/runners/full.spec.ts' --list --project=chromium
```

输出应包含所有预期 case 名称和行号。若：
- 无输出或报错 → 检查 import 路径和文件命名是否正确
- 缺少预期 case → runner 的 import 可能需要补充
- 正确列出所有 case → 进入第二步

### 第二步：运行目标 full.spec.ts

```bash
PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV={env} KATA_ACTIVE_PROJECT=dataAssets npx playwright test 'tests/runners/full.spec.ts' --project=chromium --reporter=line
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
5. **报告路径**：`results/<run-id>/playwright/` 及 `results/<run-id>/handoff.json`
6. **输出摘要**：最后 20 行运行输出

### 第四步：烟雾验证

- `smoke.spec.ts` 可以作为前置验证，但不得替代 `full.spec.ts` 自运行
- 如果 full 全部失败（0 passed），先运行 smoke 确认基座是否正常
- 如果 smoke 运行正常但 full 失败 → 进入 run-triage
- 如果 smoke 也失败 → 优先检查 env profile 和 session 是否正常

### 第五步：人工验收命令

无论结果是 passed、blocked、failed 还是 partial，最终交付前都必须打印一条可直接复制运行的有头模式 full test 临时命令，供人工验收：

```bash
KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> npx playwright test 'features/<featureId>/tests/runners/full.spec.ts' --project=chromium --headed --reporter=line
```

调试期可以使用无头命令，但交付/阻塞说明中必须同时给出上述 `--headed` full.spec.ts 命令；不得只宣称完成或只给 smoke/single-case 命令。

## Self-run command template

1. Allocate run id via:
   ```bash
   RUN_PATH=$(kata results path <featureId> --new-run --project <project>)
   RUN_ID=$(basename "$RUN_PATH")
   ```
2. Execute:
   ```bash
   PLAYWRIGHT_HTML_OPEN=never KATA_DATAASSETS_ENV=<env> KATA_ACTIVE_PROJECT=<project> \
     npx playwright test 'features/<featureId>/tests/runners/full.spec.ts' \
     --output="$RUN_PATH/playwright" \
     --reporter=line,json,allure
   ```
3. After test exit, write `$RUN_PATH/handoff.json` per `PlaywrightAutomationHandoff@2` schema. `run_command` records the actual command that was run; `acceptance_command` must record the required headful full-run command with `full.spec.ts` and `--headed`.
4. Render md: `kata handoff render <featureId> --run "$RUN_ID" --project <project>`.

## 禁止

- 不得把用户文字当作真实 UI 事实。
- 不得弱化断言来换取通过。
- 不得修改 `workspace/{project}/.kata/repos/**`。
- 不得跳过 `--list` 直接运行。
- 不得用不带文件参数的全量 Playwright 运行做调试。
- 只运行 `smoke.spec.ts` 不得宣称端到端自动化完成。
