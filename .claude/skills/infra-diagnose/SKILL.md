---
name: infra-diagnose
description: 数据源或服务器连通性报错时，读取本机配置，执行受控的 Kata SSH2 检查并生成脱敏的 Markdown 报告；不提供任意远程命令和变更操作。SSH connectivity 之外的问题（业务缺陷、用例、UI 自动化、知识维护）转对应 skill。
---

# infra-diagnose

只覆盖「配置可用性 + 单目标 SSH connectivity」。只产出一份报告，其中只保存脱敏后的检查结果和结论。

## Phase 1：检查配置

```bash
kata config doctor --scope infra --exit-code
```

确认 `hosts.yaml`、`data_sources.yaml`、`credentials.yaml` 之间的引用完整，且私密文件权限正确。

## Phase 2：受控 connectivity 检查

```bash
kata infra inspect <host> \
  --check connectivity \
  --project <project> \
  --slug <slug>
```

只支持 `connectivity` 一种检查。SSH 连接基于 `ssh2` 实现，host key 必须显式信任才能连接；首次连接时先核对指纹，再执行：

```bash
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
```

此后指纹一旦变化即阻断连接，不能通过关闭校验绕过。

## Phase 3：查看与校验报告

报告写入 `workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md`，其中不保存密码、Cookie、连接串或完整终端日志。报告状态只记录本次检查是否完成；SSH 成功不代表业务原始路径已验证。

交付前运行：

```bash
kata infra lint --report workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md --exit-code
```

## 配置文件

- `config/infra/hosts.yaml`：SSH 主机、端口、`credential_ref` 和已核验的 host key 指纹。
- `config/infra/data_sources.yaml`：数据源地址、协议、端口、数据库和 `credential_ref`。
- `config/infra/credentials.yaml`：本机私密 Credential Profile，权限 `0600`，永不提交；写入时使用原子替换。
- 未显式提供 `credential_ref` 时，服务器主机使用 `server-default`，数据源使用 `data-source-default`；两类凭据不交叉尝试。
- 某个绑定缺失或认证被拒绝时，只报告该绑定，不逐个尝试其他凭据。
- 密码只能通过交互方式录入，不允许用命令行参数传入：

  ```bash
  kata infra credentials set <name> --username <username>
  ```

  用户未提供凭据时只使用本机默认 profile。连接失败时立即返回脱敏后的错误并要求用户补充凭据，不在自动化进程中等待交互输入。

- 测试或自动化场景可以从 stdin 录入：

  ```bash
  printf '%s\n' '<password>' | kata infra credentials set <name> --username <username> --stdin
  ```

  CLI 输出只返回 profile 名和文件路径，不输出密码。

## 边界

- 不执行任意 `exec`、shell、脚本上传或远程命令拼接。
- 不使用 `sshpass`、`StrictHostKeyChecking=no` 或环境变量默认密码。
- 不做服务重启、防火墙、配置文件、进程和数据方面的变更。
- 不自动写回 `verified` 知识。
