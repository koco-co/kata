# 代码注释语言规范

## 总则

统一注释语言，既降低阅读时的跳转成本，也照顾外部贡献者的可读性。

## 规则

### 1. 公开 API 与类型定义：用英文

export 的函数、interface、type、class，其 JSDoc 注释必须用英文，包括：

- `createCli()` 中的 `description` 字段
- export 函数上方的 `/** ... */` 块注释
- export type/interface 的属性注释

```
// CORRECT: 公开 API 用英文注释
/** Create a new progress session with source metadata. */
export function createSession(opts: SessionOptions): Session {
```

### 2. 内部实现逻辑：优先用中文

文件内部的实现注释、模块切分注释、函数内部的步骤注释，都用中文。中文对团队成员来说更精确、更好懂。

```
// CORRECT: 内部逻辑用中文
// 验证依赖任务是否全部完成
for (const dep of deps) {
```

### 3. 文件头部注释：随团队习惯

文件开头的 `/** ... */` 多行注释可以用中文描述。外部贡献者关注的文件建议中英双语或纯英文。

### 4. 禁止混用

**同一文件内，同一类注释不得中英混杂**（比如都是 CLI description，或都是函数步骤注释）。选定一种语言后就保持一致。

### 5. 分隔注释：保持中文

`// ─── Types ───` 这类文件内部的分隔线注释，用中文。
