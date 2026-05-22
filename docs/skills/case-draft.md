# case-draft

## 功能说明

以需求文档、PRD、设计稿（Lanhu）、原型（Axure）、截图、功能描述等需求源生成 QA 测试用例。是 kata 最核心的 skill，覆盖从需求摄入到用例产出的完整流程。

## 输入

- **prd** (required): 需求源。可以是以下之一：
  - Lanhu 设计稿 URL
  - Axure 原型 URL
  - Markdown PRD 文件路径
  - 截图/图片文件路径
  - fixture 文件
  - 自然语言功能描述
- **project** (optional): workspace ID。

**示例**:
```
"基于这个 PRD 生成测试用例"
https://lanhu.xx.com/app/xxx
"帮我分析这个需求文档: /path/to/prd.md"
```

## 输出

- **enhanced.md**: 增强后的需求文档（融合了原始需求和历史上下文）。
- **confirmation-package.md**: 面向产品的确认问题包，用于澄清模糊/缺失的需求点。
- **archive.md**: 最终的可执行测试用例文档（Markdown 格式）。
- **archive.draft.md**: 未完成确认时的草稿用例文档。
- **cases.xmind**: XMind 格式的测试用例脑图。
- **unresolved-summary.md**: 未能澄清的问题汇总。
- **manifest.json#automation**: 自动化意图清单，标记可自动化/推迟/阻塞的用例。

## 执行流程

分为 12 个标准步骤：

1. **source-intake**: 接收需求源，建立 `source_snapshot`、`source_refs`。Lanhu/Axure 需要抓取页面内容，失败时有降级处理。
2. **module-identify**: 根据 workspace 配置、仓库画像、知识库推断项目和模块。
3. **historical-context**: 在用户授权后读取历史用例、知识库和只读源码证据。
4. **requirement-atomize**: 将需求拆分为 requirement atoms，每个 atom 携带 `evidence_kind`、`ambiguity_class`、`confidence` 和至少一个 `source_ref`。
5. **ambiguity-scan**: 识别需求中的 blocking、defaultable、inferred 与 confirmed 情形。
6. **confirmation-package**: 输出面向产品的确认问题包。
7. **product-feedback-merge**: 合并产品反馈回 enhanced PRD。
8. **coverage-matrix**: 将 requirement atoms 映射到覆盖矩阵和草稿用例。
9. **case-draft**: 生成正式测试用例草稿。
10. **case-review**: 机械复核（spec 合规、SourceRef 分层、case_id 对账）和内容质量审查。
11. **output**: 输出最终产物（archive.md / cases.xmind 等）。
12. **automation-handoff**: 将 `automation_status=ready` 的自动化意图移交给 playwright-automation。

## 子任务编排

在 source-intake 和 module-identify 完成且非 Lanhu/Axure error-fallback 路径时，启用阶段内任务编排：

- TodoWrite 跟踪阶段推进。
- Worker subagent 派发执行具体任务。
- Spec Reviewer 和 Quality Reviewer 进行二阶段审查。

## 产物要求

### SourceRef 分层

- archive.md、archive.draft.md、cases.xmind 正文只保留人类可读用例内容。
- SourceRef 标识（SR-\<ID\>、csv::、SourceRef 字符串）仅存在于结构化数据层（manifest.json）。
- 用例与证据映射通过 `case_id` 与 `requirement_atom_ids` 对账。

### 用例优先级标记

| 标记 | 含义 |
|------|------|
| P0 | 核心功能，阻塞发布 |
| P1 | 重要功能，高优先级 |
| P2 | 一般功能，正常优先级 |
| P3 | 边缘功能，低优先级 |

### Requirement Atom 字段

每个 requirement atom 必须包含：
- `evidence_kind`: 事实/推断/假设
- `ambiguity_class`: blocking / defaultable / inferred / confirmed
- `confidence`: 高/中/低
- `source_ref`: 至少一个来源引用

### blocking pending

- blocking pending 非零时只输出草稿与确认类产物（confirmation-package.md、archive.draft.md、unresolved-summary.md）。
- archive.md 与 cases.xmind 只在 blocking pending 清零后生成。

## 参考

- `.ai/core/skills/case-draft/skill.yaml`
- `.ai/core/skills/case-draft/references/source-intake-protocol.md`
- `.ai/core/skills/case-draft/references/atomization-guide.md`
- `.ai/core/skills/case-draft/references/ambiguity-decision-tree.md`
- `.ai/core/skills/case-draft/references/error-fallback-paths.md`
