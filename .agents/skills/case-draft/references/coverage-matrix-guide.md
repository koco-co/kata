# Coverage Matrix Guide
## 读取时机
coverage-matrix 与 case-draft 阶段读取。在 atoms 完成分类后生成覆盖矩阵与草稿用例。
## 输入
- RequirementAtomList、AmbiguityScanReport、EnhancedPrd。
- 产品确认项、默认项、历史推断项、pending 或 blocked 项。
## 输出
- CoverageMatrix → `.process/coverage-matrix.json` (`.process/` keeps machine-layer files separate from delivery artifacts)。
- DraftCaseSet，每条用例包含 requirement_atom_ids、source_refs、evidence_status、preconditions、steps、expected_results。
- pending 或 blocked coverage 只能进入草稿或 unresolved summary。
## 禁止
- 不得生成没有 requirement_atom_ids 的用例。
- 不得让 blocking_unknown 出现在最终步骤中。
- 不得用 few-shot 或历史用例补造缺失需求事实。
