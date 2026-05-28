# 验证口径

本文件定义生成测试用例的 QA skills 执行完成前必须通过的验证项，适用于 `case-draft`、`case-edit`、`case-hotfix`。
其他 skill 的验证口径在 Phase 2 按各自交付物单独补齐。

## 通用验证项

- 产物文件存在且可解析
- 只验证本次 skill 实际声明或生成的产物。
- Archive 与 XMind 一致性只在两者都应生成时检查。
- CSV 只在本次明确生成或转换时检查。
- 无未完成标记残留（包括常见英文待办词和中文待确认词）

## SourceRef 放置边界

- `case-draft`：人类可读产物不含 SourceRef 字符串。
- `case-hotfix`：`archive.md` 不含 SourceRef 字符串，SourceRefs 写入 `source_refs.json`。

## 未验证范围声明

每次交付必须列出已验证和未验证的条目，不得将局部通过表述为全量通过。
