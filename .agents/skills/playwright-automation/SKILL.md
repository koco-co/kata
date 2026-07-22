---
name: playwright-automation
description: 审查、生成、运行或修复 Playwright UI 自动化。输入可以是 feature 目录、QA 用例、Playwright 脚本或失败日志。用户只修改用例内容时使用 case-edit；只起草非自动化用例时使用 case-draft；只做一般代码缺陷扫描时使用 defect-analyze。
---

# Playwright Automation

根据用户意图选择 `review`、`generate`、`run` 或 `repair`。不要仅凭输入文件是 Markdown、脚本或日志来决定路由。

## 模式

| 模式 | 环境要求 | 交付状态 |
| --- | --- | --- |
| `review` | 不需要真实环境 | `reviewed` |
| `generate` | 有页面资料即可；无环境时不得声称已运行 | `generated-not-run` |
| `run` | 必须选择环境并通过预检 | `passed` / `failed` / `blocked` |
| `repair` | 必须能复现或有足够失败材料 | `passed` / `failed` / `blocked` |

用户没有明确模式时，根据动词和目标推断；只有不同选择会改变操作或产生外部写入时才询问。

## 工作方式

1. **确定范围**：识别目标 feature、用例、spec、模式和允许的外部写入。读取现有 manifest；没有时建立最小 manifest。
2. **检查输入**：核对用例、已有脚本、页面资料和项目共用组件。`run` / `repair` 才要求环境预检。
3. **计划与实现**：为每条场景写出核心用户动作、可见结果、测试数据、选择器和清理策略，再生成或修改脚本。
4. **运行与分析**：执行 manifest 声明的范围；按产品、脚本、数据、权限、环境和不确定六类记录失败。只对可能恢复的瞬时问题重试。
5. **交付**：写入 `run.json`、简短摘要和产物路径。没有真实运行时必须使用 `generated-not-run`，不得写“通过”。

模型可根据规模自行决定是否并行、是否使用子代理以及如何拆分文件；不要固定模型名称、代理数量或机械阶段数。

## 核心边界

- 用户要求验证的核心业务动作必须通过页面完成，并由页面可见结果或业务记录确认。
- 测试准备、清理和诊断可以使用 API/DB，但必须符合项目策略，不能替代核心页面动作，并要写入 manifest 与运行记录。
- 共享环境只清理由本次运行创建、带唯一前缀且记录在 manifest 中的数据。禁止模糊名称或全项目清理。
- 不用弱断言、宽泛 `try/catch`、`test.skip` 或无意义重试掩盖失败。
- 静态审查、脚本生成和真实运行是不同完成度，必须分别表述。
- 无法实现的场景保留在 `unresolved` 中，说明类别、影响和下一步；不要把未执行场景计为通过。

## 环境

仅在 `run` 或 `repair` 需要真实复现时读取 `references/environment-policy.md`。不硬编码环境名；优先使用用户明确给出的环境或项目唯一默认值。

## 脚本

生成或审查脚本时读取 `references/script-standard.md`。完成条件和运行记录见 `references/run-contract.md`。

## 输出

推荐布局：

```text
automation/
├── manifest.yaml
├── tests/
│   ├── cases/
│   ├── pages/
│   ├── fixtures/
│   └── runners/
└── README.md
runs/<run-id>/
├── run.json
├── summary.md
└── artifacts/
```

现有项目暂时使用 `smoke.spec.ts` / `full.spec.ts` 时可以兼容，但完成范围由 manifest 声明，不由固定文件名决定。
