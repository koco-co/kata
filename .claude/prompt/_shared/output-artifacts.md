# 产物规范

本文件定义生成测试用例的各 QA skill 的共同要求和当前产物矩阵，适用于 `case-draft`、`case-edit`、`case-hotfix`。
不适用于 `defect-analyze`、`infra-diagnose`、`knowledge-curate`、`workspace-manage`、`playwright-automation`；这些 skill 的产物规则在 Phase 2 单独补齐。

## 共同要求

- 产物清单以各 skill 当前 `SKILL.md` 和 references 为准。
- Phase 1 只记录稳定基线，不替代各 skill 的细化产物规则。
- CSV 不作为 `case-draft`、`case-edit`、`case-hotfix` 三者的必交付产物；仅当当前 skill 明确要求生成或转换 CSV 时，才纳入交付范围。

## 当前产物矩阵

| Skill | 当前稳定产物 | 条件与边界 |
| --- | --- | --- |
| `case-draft` | `archive.md`、`cases.xmind`、`metadata.yaml`、`manifest.json` | blocking pending 非零时只输出确认/草稿类产物。 |
| `case-edit` | `archive`、`xmind` | CSV 可以作为输入或转换语义出现，Phase 1 不强制输出 CSV。 |
| `case-hotfix` | `archive`、`notes` | 目录内保留一个 `archive.md`、必要 JSON 文件和 `.temp/`；`archive.md` 禁止 SourceRef 字符串，SourceRefs 写入 `source_refs.json`。 |

## 质量要求

- 字段一致性：只在本次实际声明或生成的产物之间，核对用例标题、步骤、预期结果是否一致。
- 可读性：产物要能让人直接审阅，不依赖工具解析。
