# kata CLI 与产物设计

**日期**：2026-07-10  
**状态**：设计已确认

## 目标

项目只保留一个公开命令 `kata`。所有命令采用相同的参数、帮助、输出、退出码和文件写入方式，让人和 Agent 都能稳定使用。

本设计同时解决现有 run ID、handoff、AutomationIntent、帮助文档和运行目录彼此不一致的问题。

## 单一入口

取消 `dtstack-cli` 的公开入口，其能力并入 `kata`：

```text
kata auth ...
kata db ...
kata project ...
kata env ...
kata skills ...
kata cases ...
kata automation ...
kata features ...
kata runs ...
kata workspace ...
```

旧的隐藏命令不再注册。典型迁移如下：

```text
xmind-gen        → kata cases export --format xmind
case-tasks       → kata automation tasks
results publish  → kata runs publish
handoff render   → kata runs handoff
paths audit      → kata workspace check
agents audit     → kata skills audit --runtime <name>
```

命令层级最多保持“命令组 + 动作”两级。确有子资源时可以增加第三级，但不得用深层命令弥补含糊的命名。

## 命令定义

每个公开命令在一个定义中声明：

- 名称和一句话用途；
- 输入参数、类型、默认值和允许值；
- 是否读取标准输入；
- 是否写文件；
- 是否允许 `--dry-run`；
- 文本结果如何呈现；
- JSON 结果使用哪个 schema；
- 可能返回的退出码；
- 可执行示例；
- 相关命令。

解析、帮助、文档和测试都从同一命令定义生成。README 不再手工维护另一份参数表。

## 帮助

帮助是公开接口的一部分。

### 根帮助

`kata --help` 包含：

- kata 的用途；
- 完整 usage；
- 全局参数；
- 所有公开命令组及一句话说明；
- 常用工作流示例；
- 退出码说明；
- 当前 CLI 与 schema 版本。

### 命令组帮助

例如 `kata cases --help` 包含：

- 该命令组解决什么问题；
- 全部子命令；
- 常见输入文件；
- 典型的前后调用顺序；
- 两至三个完整示例。

### 叶子命令帮助

例如 `kata cases export --help` 包含：

- 功能说明；
- usage；
- 必填参数；
- 可选参数、默认值和允许值；
- 输入文件与输出文件；
- 是否会创建、覆盖或删除文件；
- 文本与 JSON 输出说明；
- 退出码；
- 可直接执行的示例；
- 相关命令。

未知命令和参数应给出最接近的正确写法。不存在帮助中看不到的公开命令。

机器可以读取：

```text
kata help cases export --format json
```

帮助示例通过 fixture 或 `--dry-run` 实际执行。示例失效时测试必须失败。

## 输入方式

所有命令默认非交互运行。缺少必填参数时返回清楚的错误，不在半途打开问答。

只有初始化向导等明确场景才支持：

```text
--interactive
```

所有会写文件的命令支持：

```text
--dry-run
```

输出格式统一为：

```text
--format text
--format json
```

不再同时存在 `--json`、隐式 JSON 和文本混输。需要查看结果但不影响 shell 时，检查命令可以使用：

```text
--report-only
```

## 输出方式

- `stdout` 只输出最终结果；
- `stderr` 输出过程信息、警告和错误说明；
- JSON 模式只输出一个完整 JSON，不夹杂日志、颜色或进度文本；
- 文本模式在 TTY 中可以使用颜色，重定向时自动关闭；
- 所有写入结果都列出实际文件路径。

统一 JSON 结构：

```json
{
  "schema_version": 1,
  "command": "kata cases validate",
  "status": "passed",
  "data": {},
  "artifacts": [],
  "warnings": [],
  "errors": []
}
```

错误项至少包含稳定的 `code` 和自然、可执行的 `message`。需要用户补充内容时，可以增加 `required_input`。不在 JSON 中输出堆栈，除非显式启用详细模式。

## 退出码

```text
0  命令成功
1  执行失败或检查未通过
2  参数、配置或输入格式错误
3  环境、权限或外部服务不可用
4  工作尚未完成，需要补充信息
```

检查命令发现问题时默认返回非零。`--report-only` 只改变 shell 退出码，不改变 JSON 中的实际 `status`。

命令处理函数不直接调用 `process.exit()`。它们返回结果或抛出统一错误，由 CLI 最外层决定输出和退出码。

## 用例文件名

需求名称经过一个共享函数转换为文件名主体。所有 Skill、CLI 和迁移脚本调用同一实现。

规则如下：

1. 先做 Unicode NFC 归一化；
2. 只保留中文、英文字母和数字；
3. 删除所有空白和标点；
4. Markdown 与 XMind 使用相同主体；
5. 原始需求名称完整保存在 metadata 和文件内容中；
6. 主体长度以 180 个 UTF-8 字节为上限，截取时不得切断字符；
7. 重名时优先直接追加需求 ID；没有需求 ID 时追加八位稳定字母数字标识；
8. 追加标识前重新计算长度，最终文件名始终低于文件系统限制。

示例：

```text
数据质量任务：支持规则 SQL 合并（第一期）
→ 数据质量任务支持规则SQL合并第一期.md
→ 数据质量任务支持规则SQL合并第一期.xmind

StarRocks 3.x 数据源适配
→ StarRocks3x数据源适配.md
→ StarRocks3x数据源适配.xmind
```

metadata 明确记录路径：

```yaml
artifacts:
  case_markdown: cases/数据质量任务支持规则SQL合并.md
  case_xmind: cases/数据质量任务支持规则SQL合并.xmind
```

下游工具只读取这两个字段。metadata 缺失时，可以在同一目录中寻找唯一的同名 `.md + .xmind` 组合；存在多组时返回退出码 4，请用户选择。

## 公共数据结构

FeatureMetadata、AutomationIntent、CaseTaskList、Run、RunResult 和 Handoff 使用一组版本一致的 schema。

需要保证：

- AutomationIntent 的 ID、标题、用例文件和状态只有一种字段名；
- 生成 CaseTaskList 的 fixture 必须先通过 AutomationIntent schema；
- run ID 的生成规则与 Handoff schema 完全相同；
- `status`、退出码、通过数、失败数和跳过数能够互相校验；
- 只读用例可以明确说明不需要业务记录；
- 会改变业务状态的用例必须填写记录名称、ID、状态或页面附件；
- `report_paths` 中每类产物都有清楚的必填条件。

schema 改动与 TypeScript 类型由同一来源生成或相互检查，不能各自维护。

## 运行目录

所有自动化运行写入功能目录下的统一位置：

```text
<feature>/runs/<run-id>/
  run.json
  result.json
  handoff.json
  handoff.md
  allure-results/
  allure-report/
  screenshots/
  traces/
```

`run-id` 使用可排序的 UTC 时间和六位字母数字标识，例如：

```text
20260710T081530Z7K2M4Q
```

`kata runs create` 需要实际创建目录，并通过原子操作保证并发调用不会得到相同 ID。只计算路径而不创建目录的行为不再称为“分配”。

不再并存 `_shared/published-reports`、不同年月目录和多套 feature run 命名。发布只整理当前运行目录的状态，不复制出新的目录树。

## 命令测试

每个公开命令至少包含：

- 根帮助、命令组帮助和叶子帮助；
- 正确输入的文本输出；
- 正确输入的 JSON 输出；
- 缺少参数；
- 无效枚举；
- 业务检查未通过；
- 外部环境不可用；
- `--dry-run` 不写文件；
- 帮助示例可以执行；
- stdout、stderr 和退出码互不混淆。

需要增加跨模块流程：

```text
建立功能目录
→ 写入 metadata
→ 生成需求用例
→ 导出 XMind
→ 建立自动化运行
→ 写入结果
→ 生成 Handoff
→ 发布运行
```

该流程必须使用真实 schema 和真实 run ID，不能为每个测试单独捏造一套字段。

## 迁移

1. 建立公共 CLI runner 和结果类型；
2. 合并 `dtstack-cli` 功能；
3. 建立新命令树和完整帮助；
4. 统一 schema 与 TypeScript 类型；
5. 实现用例文件名函数；
6. 统一运行目录和 run ID；
7. 提供旧 metadata、用例文件和运行结果的迁移命令；
8. 更新所有 Skill 和文档；
9. 删除旧入口和隐藏命令。

## 完成标准

- 只有 `kata` 一个公开可执行文件；
- 根帮助、命令组帮助和全部叶子帮助完整；
- 帮助中的示例实际通过；
- 所有公开命令支持一致的 text/json 输出；
- 退出码与错误类型一致；
- 不存在 action 内部直接 `process.exit()`；
- 用例 Markdown 与 XMind 使用同一需求名称主体；
- metadata 是用例文件路径的正常读取方式；
- run ID、Handoff 和运行目录使用同一规则；
- 完整 CLI 生命周期实际执行通过。

