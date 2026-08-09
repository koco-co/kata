---
title: 测试数据名称必须唯一化
type: pitfall
tags: [测试数据, 唯一化, uniqueName, pytest]
status: observed
source: 历史并发冲突约定；playwright_web_ui.runtime_identity 当前实现与契约测试
updated: 2026-08-09
---

# 测试数据名称必须唯一化

凡 `automation.effects.platform_write: true` 的 Python 自动化用例，只要会创建持久化实体，就必须使用对并发 worker 与重复 attempt 均不冲突的最终名称。

## 适用范围

- 数据表名
- 任务名与规则集名
- 规则包名
- JSON key 配置名
- 其他受唯一约束的持久化实体

## 当前约束

- 基础名称沿用 canonical YAML 中的业务语义，不得为了省长度改成不可读短前缀。
- 请求公开的 `automation_identity` fixture，并调用 `automation_identity.unique_name(base, max_length=...)`；该 API 按 logical run、execution、attempt、worker 和 canonical case 生成稳定 collision token。
- helper 不会截断业务基础名；超过产品字段上限时会硬失败，要求 capability 选择仍可读且合规的基础名。
- 最终创建成功后，必须通过 `business_records` 写入同一 case 的 UI readback，记录实际名称或稳定业务 ID。
- capability 尚未确定该领域的字符集和长度边界时，case 保持 `planned`，不得仅靠硬编码时间戳改为 `active`。

## 原因

避免 xdist 并发、重复执行和失败重试因同名实体产生假失败，同时让清理、业务记录和问题定位能够关联到同一 immutable execution。
