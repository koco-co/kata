# ADR-0002: Feature 目录命名规范（拼音转英文）

**状态**: 已采纳  
**日期**: 2026-04-01  
**关联**: `.ai/core/rules/naming-convention.md`

## 背景

Kata v2 早期，workspace 下的 feature 目录命名混杂了中文拼音、中文全角标点和英文，导致工具链处理（XMind 路径、CLI 参数、CI lint）频繁出错。例如，目录名中包含空格或中文标点在 shell 中需要转义，在 URL 中需要编码，在 CI 日志中难以阅读。

## 决策

Feature 目录统一采用 `YYYY-MM[-{customer}]-{module}-{slug}` 格式，其中：

- `YYYY-MM` 必须与 `INDEX.md` 的 `【YYYYMM】` 一致；草稿用 `2099-XX`。
- `{customer}`（可选）：客户拼音首字母缩写（如 `lt`、`tj`、`dfsyc`、`yht`、`ltqc`、`jg717`、`zdxx`、`gate2`）。
- `{module}` 和 `{slug}` 一律英文（lowercase ASCII，连字符分隔）。
- `{module}` 取 metadata.yaml `modules` 的英文简写：`dq`、`metadata`、`modeling`、`general`、`assets`、`standard`、`lineage`、`security`、`multimodal`、`lifecycle`。

## 理由

1. **Shell 安全**：全英文 + 连字符 + 数字的目录名无需转义即可在 shell、Makefile、CI 中使用。
2. **工具链兼容**：XMind generator、CSV parser、CLI 参数解析器对 ASCII 路径的处理更可靠。
3. **人类可读**：英文 slug 比拼音缩写更易理解目录内容（如 `dq` 比 `sjzl` 直观）。
4. **排序一致**：`YYYY-MM` 前缀保证目录按时间顺序自然排序。

## 降级策略

当输入字符串包含中文、全角标点、空格、长度超限或多模块串联描述时，降级为 `YYYY-MM[-{customer}]-unresolved-{module}-{8-hex}` 兜底，原文写入 metadata.yaml notes。

## 后果

- 跨月同名目录视为不同批次，保留独立目录不合并。
- `{slug}` 必须从 metadata.yaml 推断，不能从用户输入的任意字符串生成。
- 草稿或占位场景使用 `2099-XX` 作为时间占位。

## 关联

- `.ai/core/rules/naming-convention.md` — 规范详细定义
- `case-draft` skill 的 `references/error-fallback-paths.md` — Slug fallback 实现
