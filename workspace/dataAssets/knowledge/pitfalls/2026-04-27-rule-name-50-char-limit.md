---
title: 规则名称/任务名称 50 字符限制
type: pitfall
tags: []
status: verified
source: ""
updated: 2026-04-27
---

# 规则名称/任务名称 50 字符限制

## 症状
- 填写任务名或规则名时，输入框阻止输入（超出 50 字符时截断或报错）
- `fillTaskBaseInfo` 填写的任务名被截断，保存后任务名不匹配
- 后续 `getTableRowByTaskName` / `resolveTaskNameCandidates` 因名称不匹配找不到任务

## 复现条件
- 任务名包含 `uniqueName` 生成的 timestamp（14 字符）+ datasource 后缀（`_sparkthrift2_x` 等 16 字符）时易超限
- 例：`kt_main_1777299176362_sparkthrift2_x` = 47 字符（已接近极限）
- 若任务名前缀更长或需要拼接中文前缀，轻松超 50

## 根因
平台 `规则名称` / `任务名称` input 组件默认 `maxLength={50}`（Ant Design Input 标准行为）。

## 修复方案

### 核心原则
**不要给任务名追加 datasource cache suffix（如 `_sparkthrift2_x`）。**  
`uniqueName()` 生成的 timestamp 已保证全局唯一性——timestamp 是毫秒级，多 worker 也几乎不可能撞名。追加后缀只会浪费字符且无安全收益。

### 代码变动
```typescript
// ❌ 之前: resolveTaskName adds suffix
function resolveTaskName(taskName: string): string {
  return resolveVariantName(taskName);  // taskName_sparkthrift2_x — 可能超限
}

// ✅ 之后: timestamp 已保证唯一，直接返回
function resolveTaskName(taskName: string): string {
  return taskName;
}
```

### 命名规范
- 任务名前缀复用对应的**表名前缀**（如 `kr_main_t` 对应表 `kr_main`）
- 不使用独立的短前缀体系（`kt_main` → `kr_main_t`）
- 包名前缀同理（`kp_main` → `kr_main_p`）
- 规则名称字段限制 50 字符，uniqueName 后缀 14 字符，前缀留 36 字符空间，绰绰有余

## 验证
- 任务创建后，在 UI 的任务列表中可见任务名完整显示（未被截断）
- `fillTaskBaseInfo` → 输入框 filled 值 = 实际保存值（无截断）
