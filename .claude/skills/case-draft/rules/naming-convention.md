# Feature 目录命名规范

`workspace/{project}/features/` 下的目录命名遵循 `YYYY-MM[-{customer}]-{module}-{slug}`。

## 字段规则

- `YYYY-MM` 必须与 `INDEX.md` 中文显示名 `【YYYYMM】` 一致；占位/草稿用 `2099-XX`。
- `{customer}`（可选）：定制化客户用拼音首字母缩写（如 `dfsyc`、`tj`、`sc`、`yht`、`lt`、`ltqc`、`jg717`、`zdxx`、`gate2`）；标品省略此段。
- `{module}` 和 `{slug}` 一律英文（lowercase ASCII，连字符分隔），不得用中文拼音。
- `{module}` 取 metadata.yaml `modules` 的英文简写：`dq`、`metadata`、`modeling`、`general`、`assets`、`standard`、`lineage`、`security`、`multimodal`、`lifecycle`。
- 跨月同名目录视为不同批次，保留独立目录，不合并。
