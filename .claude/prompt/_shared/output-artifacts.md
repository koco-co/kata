# 产物规范

本文件定义各 QA skill 生成测试用例时的共同要求与当前产物矩阵，适用于 `case-draft`、`case-edit`、`case-hotfix`。
不适用于 `defect-analyze`、`infra-diagnose`、`knowledge-curate`、`workspace-manage`、`playwright-automation`；这些 skill 的产物规则由各自的 SKILL.md 定义。

## 共同要求

- 产物清单以各 skill 当前 `SKILL.md` 和 references 为准。
- 本文件只记录稳定基线，不替代各 skill 的细化产物规则。
- CSV 不是 `case-draft`、`case-edit`、`case-hotfix` 三者的必交付产物；仅当 skill 明确要求生成或转换 CSV 时，才纳入交付。

## 当前产物矩阵

| Skill | 当前稳定产物 | 条件与边界 |
| --- | --- | --- |
| `case-draft` | `archive.md`、`cases.xmind`、`metadata.yaml`、`manifest.json` | blocking pending 非零时只输出确认/草稿类产物。 |
| `case-edit` | `archive`、`xmind` | CSV 可以作为输入或转换目标出现，不强制输出 CSV。 |
| `case-hotfix` | `archive`、`notes` | 目录内保留一个 `archive.md`、必要 JSON 文件和 `.temp/`；`archive.md` 禁止 SourceRef 字符串，SourceRefs 写入 `source_refs.json`。 |

## 质量要求

- 字段一致性：仅在本次实际生成或声明的产物之间核对标题、步骤、预期结果是否一致。
- 可读性：产物应可直接审阅，无需借助工具解析。
