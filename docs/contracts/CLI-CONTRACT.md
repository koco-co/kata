# Kata CLI 合同

## 目标

所有命令遵循相同的参数、输出、退出码和副作用规则，使人类、CI 与 Skill 能用同一种方式调用。

## 参数

### 范围选择

需要项目范围的命令使用：

```text
--project <name>  检查一个项目
--all             检查所有已注册项目
```

两项必须且只能选择一项。不要把 `--project` 声明为 required 后再添加 `--all`。

`--all` 只读取项目注册表或通过 Schema 的目录，不把 `workspace/` 下任意文件夹都当作项目。

### 通用选项

```text
--format human|json|md   默认 human
--quiet                  只输出结果或错误
--no-color               禁用颜色
--dry-run                预览，不改变文件或外部系统
--debug                   输出调试详情到 stderr
```

改变 Git 暂存区使用单独 `--stage`；不得把 `git add` 藏在 `--apply` 中。

秘密值不得作为位置参数或普通 option 出现在命令历史。使用 `--stdin`、受权限保护的文件或系统凭据存储。

## 输出流

### human / md

- stdout：请求的数据或最终摘要。
- stderr：进度、警告、诊断和错误。
- 不在库函数中直接 `console.log`；由命令层统一渲染。

### json

stdout 只输出一个 JSON 文档，成功和失败都使用同一 envelope：

```json
{
  "schema_version": 1,
  "ok": true,
  "command": "features.lint",
  "data": {},
  "warnings": []
}
```

```json
{
  "schema_version": 1,
  "ok": false,
  "command": "features.lint",
  "error": {
    "code": "CLI_SCOPE_REQUIRED",
    "message": "请在 --project <name> 与 --all 中选择一项",
    "details": {}
  }
}
```

JSON 模式不得混入进度文本、颜色码或堆栈。

## 退出码

| 退出码 | 含义 |
| --- | --- |
| 0 | 命令完成，且检查没有发现需要处理的问题。 |
| 1 | 参数、环境、IO、网络或程序错误，命令没有正常完成。 |
| 2 | 检查正常完成，但发现违规、冲突或失败项。 |
| 130 | 用户中断。 |

库函数不调用 `process.exit()`；顶层入口将结构化结果转换为 `process.exitCode`。

## 表格

`--format human` 的列表必须有表头，列宽可根据终端调整。无法对齐时使用简短逐行输出，不把无表头 TSV 称为 table。

## 副作用

- 默认只读或 dry-run。
- `--apply` 只执行命令名称直接表达的改变。
- 额外改变 Git、远端仓库或外部系统状态时使用独立开关，并在 human 模式提前列出计划。
- 原子写入：同目录临时文件、校验、rename。
- 批量操作先验证全部目标，再开始写入；中途失败时给出已完成与未完成清单。

## 本次已落实的调整

### `features lint` / `features index`

- `--project` 与 `--all` 必须且只能选择一项。
- `--all` 只读取含 `features/` 的项目目录，不扫描无关缓存目录。
- `index --dry-run` 生成内容但不写文件。
- 合同测试通过真实 Commander 命令入口检查互斥参数。

### `features list`

- `table` 增加表头与显示名。
- Markdown 单元格统一转义 `|` 与换行。
- 现有 JSON 形式暂时保持兼容；统一 envelope 留到下一次 CLI 版本升级。

### `features resolve`

- 命令只计算目录，不再暗中创建 feature 与 `.process/`。
- 底层库保留默认创建行为，避免影响已有内部调用。

### `features clean`

- `--keep` 解析为正整数；零、负数、小数和非数字返回用法错误。
- 预览和执行继续沿用当前 human 输出；JSON plan/result 留到下一次 CLI 版本升级。

### `features migrate`

- `--apply` 只迁移。
- `--stage` 才改变 Git 暂存区，且只暂存本次迁移涉及的路径。

## 后续兼容升级

`--format human|json|md`、统一 JSON envelope，以及 `features show` 的格式选项属于下一次公开 CLI 版本升级。实施前应先给旧调用方保留兼容期，不能在本次修复中悄然改变 JSON 结构。

## 合同测试

测试必须通过 CLI 入口执行，而不仅调用内部函数：

```bash
kata features lint --all --exit-code
kata features lint --project demo --exit-code
kata features lint --all --project demo
kata features index --all --dry-run
kata features clean --project demo --keep foo
```

每个测试检查 stdout、stderr、退出码和文件副作用。
