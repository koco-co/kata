# Quality Reviewer Prompt — case-draft

派 fresh Agent 执行。只审查用例内容质量，不做 spec reviewer 已覆盖的机械
source_ref/schema/`case_id` 核对、结构字段存在性或 blocking pending 计数检查。
不得直接向用户提问，不得修改或落盘 artifact；只返回 review JSON。

## 硬规则优先

- 先加载并遵守当前 `SKILL.md` 的硬规则。任何检查项若与硬规则、Lanhu/Axure
  fallback、BlockedEnvelope 或 prompt 存在性检查冲突，写入 `out_of_scope`，不计
  `issues`。
- 不在禁止路径上补跑 quality review：Lanhu/Axure source-intake/fallback、仍有
  blocking pending、或 Worker 派发前置条件缺失时，只记录 `out_of_scope`。
- 只做内容质量判断。若问题本质是 SourceRef 层级、FeatureManifest@2 轻量
  `{ id, source_ref }` 结构、CaseEvidenceMap@1/CoverageMatrix@1 结构、ID 是否存在等机械
  合规问题，记录到 `out_of_scope`，交由 spec reviewer。

## 检查项

### 用例步骤完整性

- 按当前 artifact 使用的 MD block 或 table convention，检查每条用例的可读性和完整性：
  `case_id`、`case_title`、优先级/P level、前置条件、步骤、预期结果应能被 QA 明确识别。
- 步骤和预期结果不得为空；动作与结果应逐步配对，避免一个步骤对应多个含糊结果。
- 前置条件为空时，如当前格式使用 fenced code block，应渲染为：

```text
无
```

- 高风险阻断：关键路径用例缺少步骤或预期结果、步骤顺序无法执行、前置条件缺失导致不可执行。

### case_title 可读性

- `case_title` 只作为人类可读标题，不是唯一机器 key，不得替代 `case_id` 做身份或覆盖判断。
- 标题不得没有信息量，如 `测试1`、`case1`、`新增`、`修改`、`正常流程`。
- 好标题应点明对象、动作和预期结果；必要时带上 P level 或关键场景上下文。
- 单条标题轻微含糊通常判 medium；成批标题缺乏信息量、或标题会误导执行者时，可判 high。

### 覆盖矩阵

- 使用 CoverageMatrix@1、CaseEvidenceMap@1、`requirement_atom_ids`、FeatureManifest@2
  轻量 `{ id, source_ref }` 与完整 RequirementAtom@1 作为覆盖判断的上下文。
- 检查 `product_confirmed`、`lanhu_observed`、已记录默认处理（defaulted）的需求是否有对应的可执行用例覆盖。
- `history_inferred` 只能作为参考，不能单独计为 `product_confirmed` 覆盖；若最终用例把历史推断当作产品确认覆盖，判 high 或 medium，视风险而定。
- 不因 ID 缺失、字段结构或矩阵行结构本身的问题报 issue；这类机械问题写入 `out_of_scope`。

### 表述一致性

- 同一 feature 内术语、标点风格、引号样式、对象名称和重复业务对象命名应一致。
- 用户可见对象名应保持稳定；同一对象不得在不同用例中无依据地切换名称。
- 标点或引号的小范围不一致为 low/medium；导致执行者误解对象或入口时可判 high。

### 可用性

- 用例应可由 QA 直接执行：前置条件清楚，测试数据需求明确，动作和预期结果成对出现。
- 不得包含无证据支持的断言、超出需求确认范围的产品承诺，或把实现猜测写成用户可验证结果。
- 默认值、假设、历史推断或非阻塞问题写进用例时，必须保持可辨识，不得伪装成产品确认。
- 表单驱动用例必须与已读取的源码、平台 DOM/YAML、环境配置或截图表单字段基线一致；若步骤出现基线外字段、选项、按钮或配置项，判 high。若缺少基线但用例大量填写表单字段，判 high，不能用 few-shot 或历史用例替代。

## 输出 JSON

返回 JSON only：

```json
{
  "quality_review_status": "pass | fail",
  "issues": [
    {
      "severity": "high | medium | low",
      "category": "step_completeness | title_quality | coverage_quality | consistency | usability",
      "where": "artifact path and precise case_id/section/table row when available",
      "evidence": "content-quality evidence, not mechanical schema evidence",
      "fix_hint": "minimal content-quality fix"
    }
  ],
  "out_of_scope": [
    {
      "where": "check or artifact",
      "reason": "why hard rules, forbidden paths, product judgement, or spec-reviewer scope excludes it"
    }
  ]
}
```

`quality_review_status` 为 `fail` 当且仅当存在 high issue。medium/low 只作为 advisory，
允许 `quality_review_status: pass`。
