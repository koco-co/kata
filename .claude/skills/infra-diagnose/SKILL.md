---
name: infra-diagnose
description: 诊断 Kata 工作区中已登记服务器或数据源的 SSH 连通性问题，包括配置缺失、host key 未信任、网络失败和认证失败，并生成脱敏报告。仅适用于受控 connectivity 检查；业务缺陷转 defect-analyze，用例与 UI 自动化问题转对应 Skill。
---

# Outcome

对一个明确目标完成受控 SSH2 connectivity 检查，交付一份可通过 CLI 校验、且不含凭据或完整终端日志的 Markdown 报告。

## Routing

- 服务器或数据源无法连接、SSH 认证失败、host key 异常：执行本 Skill。
- SQL、服务接口或产品行为异常：转 `defect-analyze`。
- 用例编写、UI 自动化或知识维护：转对应 Skill。
- 用户要求执行任意远程命令或改变远程系统：说明超出本 Skill 权限边界并停止。

## Steps

1. 检查本机配置
   - 完整读取 [references/playbook.md](references/playbook.md)，执行其中的配置检查。
   - 完成条件：目标唯一解析到 `hosts.yaml` 中的主机，所引用的 Credential Profile 存在，配置检查退出码为 0。

2. 执行 connectivity 检查
   - 按 playbook 处理凭据和 host key，再通过 `kata infra inspect` 执行唯一受支持的 `connectivity` 检查。
   - 完成条件：检查命令已结束，并在 `workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md` 写入成功或失败结论；未知或变化的指纹必须保持阻断状态。

3. 校验交付报告
   - 使用 `kata infra lint` 校验报告。
   - 完成条件：lint 退出码为 0，报告不含密码、Cookie、连接串、私密 YAML 正文或完整终端日志。

## Delivery

- 返回报告路径、检查状态、失败阶段和下一条可执行恢复命令。
- 明确区分“SSH connectivity 已验证”和“业务原始访问路径尚未验证”。
- 未完成配置、信任或认证时交付阻塞结论，不把局部成功表述为业务可用。

## Guardrails

- 只使用 Kata 的 `ssh2` 检查能力，不执行任意远程命令、shell、脚本上传、服务重启、防火墙修改、配置变更或数据操作。
- 凭据只保存在本机 `config/infra/credentials.yaml`；通过 `kata infra credentials set --username` 交互录入，不在命令参数、对话或日志中传递密码。
- host key 必须通过 `kata infra trust-host --fingerprint` 显式信任；不关闭校验，也不自动接受变化后的指纹。
- 不自动把一次 connectivity 结果写成 `verified` 业务知识。

## References

- 执行本 Skill 时完整读取 [references/playbook.md](references/playbook.md)，其中是命令、配置默认值和逐步完成条件的唯一来源。
- 生成报告时使用 [templates/infra-report.md](templates/infra-report.md)。
