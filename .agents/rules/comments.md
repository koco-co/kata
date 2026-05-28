# 代码注释语言规范

## 总则

统一注释语言，降低阅读跳转成本，同时兼顾外部贡献者的可读性。

## 规则

### 1. 公开 API / 类型定义 — 英文

export 的函数、interface、type、class 的 JSDoc 注释必须使用英文。包括：

- `createCli()` 中的 `description` 字段
- export 函数上方的 `/** ... */` 块注释
- export type/interface 的属性注释

```
// CORRECT: 公开 API 用英文注释
/** Create a new progress session with source metadata. */
export function createSession(opts: SessionOptions): Session {
```

### 2. 内部实现逻辑 — 中文优先

文件内部的实现注释、模块切分注释、函数内部步骤注释使用中文。中文对团队成员更精确、更易理解。

```
// CORRECT: 内部逻辑用中文
// 验证依赖任务是否全部完成
for (const dep of deps) {
```

### 3. 文件头部注释 — 按团队习惯

文件开头的 `/** ... */` 多行注释可以使用中文描述，因为开发团队以中文为母语。如果文件同时有外部贡献者关注，建议中英双语或纯英文。

### 4. 禁止混用

**同一文件内，同一类注释（如同为 CLI description、同为函数步骤注释）不得中英混杂。** 选择一种语言后保持一致。

### 5. 分隔注释 — 保持中文

`// ─── Types ───` 这类文件内部分隔线注释使用中文。
