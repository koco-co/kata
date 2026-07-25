---
title: 测试数据名称必须唯一化
type: pitfall
tags: [测试数据, 唯一化, uniqueName]
status: observed
source: "历史沉淀约定,迁移时补全 frontmatter"
updated: 2026-07-25
---

# 测试数据名称必须唯一化

所有测试脚本中在系统中创建持久化实体的名称，**必须使用 `uniqueName()` 封装**，避免同名冲突。

## 命名方式

**拼接规则：** `uniqueName(用例中提供的数据名称)`

即在用例（Archive MD）中定义的原始名称上直接调 `uniqueName()`：

```typescript
// ✅ 正确：用例原名 + uniqueName
const tableName = uniqueName("test_json_key_range");
const packageName = uniqueName("key范围校验测试包");
const taskName = uniqueName("task_json_key_range_test");

// ❌ 错误：自造短前缀
const tableName = uniqueName("t16tbl");
```

## 适用范围

所有在系统中创建持久化实体的名称：

- **数据表名**（SQL DDL 中的表名）
- **任务名**（监控规则任务名称）
- **规则包名**
- **JSON key 配置名**（如 "key1"、"key2" 等系统级 key 配置）

## 约束

- 封装后完整名称（含时间戳后缀）**不超过 50 字符**
- 基础名称确保能在 50 字符内容纳 `_1777529675366`（13 位时间戳）后缀

## 示例

```typescript
import { uniqueName } from "../../../../lib/playwright";

const tableName = uniqueName("test_json_key_range");
// → "test_json_key_range_1777529675366" (34 字符 ✓)

const taskName = uniqueName("task_json_key_range_test");
// → "task_json_key_range_test_1777529675366" (41 字符 ✓)
```

## Why

避免并行运行、重复运行时因名称冲突导致失败（表已存在、任务名重复等）。
