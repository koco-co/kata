# 证据合同

## 目录身份

一次执行使用：

`artifacts/runs/<project-id>/<logical-run-id>/executions/<executor-id>/<execution-id>/`

一次真实运行在其下分配独立 `attempts/<NNN>/`。所有身份必须与 manifest、status、Allure label、evidence 和 handoff 一致。

## 必需产物

| 层级 | 产物 | 作用 |
|---|---|---|
| execution | `execution-manifest.json` | immutable case identity、effects 和 business record policy |
| execution | `collection-status.json` | 精确 collection 命令与状态 |
| execution | `preparation-status.json` | 环境解析、权限与 attempt 分配前状态 |
| attempt | `status.json` | 本次 run 状态与退出码 |
| attempt | `allure-results/` | 带 canonical label 的测试结果 |
| attempt | `evidence/` | 每 case 的步骤、失败诊断、截图或 executor 声明证据 |
| attempt | `business-records/` | policy=required case 的受控业务记录 |
| logical run | `handoff.md` | CLI 汇总的 VERIFIED 或 NOT VERIFIED 结论 |

## 验证规则

- `kata runs verify` 必须核对同一 execution 与 attempt，不跨 attempt 拼证据。
- collection、preparation、run、Allure、evidence 和 required business record 任一缺失都不得 VERIFIED。
- `business_record.policy: not_applicable` 必须在 manifest 中有具体原因，不生成 record 文件。
- `policy: required` 必须且只能生成一个合规记录，并与 case identity 对应。

## Attempt 前失败

- collection 或 preparation 失败时不得创建假 attempt。
- `handoff.md` 必须写 NOT VERIFIED，Attempt 和 Attempt path 显示 `unavailable`，并只记录稳定错误码。
- 后续修复使用新的 logical run 或 execution，不覆写失败事实。

## 安全与裁决

- CLI 负责原子写入和路径 containment；不要手工创建、复制、改名或修补证据。
- secret 不进入 Allure、文本附件、DOM、console、请求诊断、截图、视频元数据或 handoff。
- VERIFIED 只代表 manifest 声明范围的证据链完整；产品缺陷、实现错误、数据、权限、环境和未验证范围必须分开报告。
