# case-draft 输出产物标准（normative）

## 文件集
- 交付层（feature 根，仅 4 件）：archive.md、cases.xmind、metadata.yaml、manifest.json。
- 机器层 + 过程/证据：一律落 `.process/`（source-snapshot.json、coverage-matrix.json、enhanced.md、confirmation-package.md、case-evidence-map.json、unresolved-summary.md、archive.draft.md、tmp/）。feature 根禁止出现这些文件。

## archive.md frontmatter（字段固定）
suite_name / root_name / module / prd_version / prd_id / tags / status / create_at / case_count / origin。
禁止 product / description / dev_version 等无消费方字段。prd_id 与 case_id 统一用 prd_id。

## 章节层级（映射 xmind-gen 树）
`## 模块` → `### 页面` → `#### 子分组(可选)` → `##### 【Pn】用例`。

## 用例标题（硬）
- 必带 `【Pn】` 前缀（工具解析优先级）。
- 标题内禁止任何机器标识：TC-ID、SR-、RA-。
- 自然中文动宾句。

## 括号语义（硬）
- `【】` 专用于 `【Pn】` 优先级前缀。
- `「」` 用于所有 UI/菜单/选项/字段名。

## 用例内容质量（硬）
- 每条用例 ≥1 前置条件、≥1 步骤，每步预期具体可验；禁止「页面正常打开」作为唯一断言。
- 原子化：一条用例一个验证目标。
- 覆盖维度齐全：正常 + 边界 + 异常/空态 + 组合联动 + 持久化。
- 每条用例可追溯真实证据；纯推断不进最终档（见证据底线）。

## cases.xmind
- 永远 `kata xmind-gen` 从 archive.md 生成；archive 改后即重生成；与 archive 逐字段一致。
- 节点可读性：单节点不堆多操作分句、引号项 < 3。

## 证据底线（硬）
- 关键设计证据（Lanhu 设计内容、相关源码）读不到 → 不产出最终 archive.md/cases.xmind。
- 用 AskUser 一次性批量索要缺口（贴内容 / Lanhu cookie / 截图 / 可读源码路径）。拿到真实证据再产出。
