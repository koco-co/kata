# playwright-automation

## 功能说明

生成、修复或验证 Playwright UI 自动化，并在交付前完成真实浏览器运行与失败归因。从用例/PRD/Lanhu 出发，经过页面探测、计划对齐、脚本生成、自我运行、失败修复，最终交付通过的 Playwright 测试。

## 输入

- **request** (required): 自动化请求。支持：
  - MD 用例路径（`archive.md`）
  - PRD 文件路径
  - Lanhu URL
  - 已有 Playwright 脚本（需要修复）
  - 失败结果（需要归因和修复）
  - UiAutomationIntent 结构化输入
- **automation_intent** (optional): 从 case-draft 交接的自动化意图文件（AutomationIntent@1 schema）。
- **project** (optional): workspace ID。

**示例**:
```
"/playwright-automation features/data-assets/tests/cases/t01-data-source.ts"
"为 features/<slug>/ 下的用例生成 Playwright 自动化"
"修复这个失败的 spec: /path/to/failed-spec.ts"
```

## 输出

- **plan**: 自动化计划（覆盖范围、断言策略、选择器策略）。
- **script**: 生成的 Playwright 脚本。
- **run**: 运行结果报告。
- **handoff**: 交付报告（通过/阻塞/部分完成/修复耗尽）。
- **case_corrections**: 用例修正建议。

## 执行流程

### 阶段 1: 环境准备 (env-preflight)

1. **环境确认**: 用户无显式 env profile 时静默引导确认。
2. **env-preflight**: 校验 base URL、登录态、项目、数据源、权限与浏览器依赖。
3. **登录检测**: 检查 `.auth/` 已有会话文件，存在则复用。
4. **权限处理**: 处理权限拒绝、静默模式等 blocker。

### 阶段 2: 分析对齐 (ui-probe + plan-reconcile)

1. **case-normalize**: 将输入归一化为 UiAutomationIntent。
2. **ui-plan**: 规划覆盖范围、可见断言、fixture、选择器策略和风险。
3. **ui-probe**: 通过真实浏览器收集页面、可访问性、截图、网络与 locator 证据。
4. **plan-reconcile**: 对账书面用例与真实 UI，输出继续/调整/提问/阻塞。

### 阶段 3: 脚本生成 (playwright-generate)

1. 以 plan-reconcile 结论为 `aligned` 或 `plan_adjusted` 为前提。
2. 生成 Playwright 脚本（Page Object Model + 共享 helper）。
3. 脚本落盘到 `tests/cases/`，共享组件写入 `_shared/`。

### 阶段 4: 自我运行 (self-run)

1. 运行目标 spec。
2. 记录命令、退出码、输出与报告路径。
3. 失败时执行 run-triage 归类。

### 阶段 5: 修复循环 (repair-loop)

1. 将失败归类：产品/脚本/数据/权限/环境/未知/修复耗尽。
2. 每个 spec 最多 3 次修复，locator 内部重试最多 2 次。
3. 保留每次修复的证据。
4. 通过 quality-gate 检查脚本结构、断言、session 合规、manifest 等。

### 阶段 6: 交付 (handoff)

- 输出通过/阻塞/部分完成/修复耗尽的最终交付报告。

## 子任务编排

在用户确认 env 且 env-preflight 无 blocker 后启用阶段内任务编排：
- TodoWrite 跟踪阶段推进。
- Worker subagent 派发执行具体任务。
- Spec Reviewer 和 Quality Reviewer 进行二阶段审查。

## 产物要求

### 项目结构

```
features/<slug>/
  ├── tests/
  │   ├── runners/
  │   │   ├── smoke.spec.ts     # 冒烟测试
  │   │   └── full.spec.ts      # 全量测试（交付标准）
  │   └── cases/
  │       └── t01-xxx.ts        # 单条用例
  └── _shared/                  # 共享页面对象/helper
```

### 交付标准

- 交付以 `full.spec.ts` 全量通过为准。
- 仅 `smoke.spec.ts` 通过不视为端到端自动化完成。

### 证据要求

需要以下 SourceRef：
- `ui.automation.intent@1`: 自动化意图
- `ui.probe.snapshot@1`: 页面探测证据
- `self.run.result@1`: 自我运行结果

### 失败处理纪律

- 先归类再决定动作（产品/脚本/数据/权限/环境/未知）。
- 失败断言反映真实问题，不用弱断言、try/catch、test.skip 或宽泛条件掩盖。
- 修复循环有上限（3 次/脚本，2 次/locator）。

### 环境配置

- 环境通过 `workspace/<project>/_shared/env/*.yaml` profile 表达。
- 不为交付新建 `.env.local`。
- 新建 profile 前检查现有 profile 是否已匹配 base_url + tenant。

## 参考

- `.ai/core/skills/playwright-automation/skill.yaml`
- `.ai/core/skills/playwright-automation/references/env-preflight.md`
- `.ai/core/skills/playwright-automation/references/ui-probe.md`
- `.ai/core/skills/playwright-automation/references/playwright-generate.md`
- `.ai/core/skills/playwright-automation/references/self-run.md`
- `.ai/core/skills/playwright-automation/references/quality-gate.md`
