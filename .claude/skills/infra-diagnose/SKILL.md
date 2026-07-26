---
name: infra-diagnose
description: 基础设施配置与 SSH connectivity 最小闭环。数据源/服务器连通性报错时读取本机配置，执行受控的 Kata SSH2 检查并生成脱敏 Markdown 报告；不提供任意远程命令和变更操作。
---

# infra-diagnose

只覆盖「配置可用性 + 单目标 SSH connectivity」；唯一正式报告是 `workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md`，只保存脱敏后的检查结果和结论。

## Phase 1：检查配置

```bash
kata config doctor --scope infra --exit-code
```

确认 `hosts.yaml`、`data_sources.yaml`、`credentials.yaml` 的引用完整，私密文件权限正确。

## Phase 2：受控 connectivity 检查

```bash
kata infra inspect <host> \
  --check connectivity \
  --project <project> \
  --slug <slug>
```

只支持 `connectivity`。SSH 使用 `ssh2`，host key 必须已经显式信任；首次连接先核对指纹，再执行：

```bash
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
```

fingerprint 后续变化会阻断连接，不能通过关闭校验绕过。

## Phase 3：查看正式报告

报告写入 `workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md`，不保存密码、Cookie、连接串或完整终端日志；报告状态只记录本次检查是否完成，SSH 成功不等于业务原始路径已验证。

交付前运行：

```bash
kata infra lint --report workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md --exit-code
```

## 配置文件

- `config/infra/hosts.yaml`：SSH 主机、端口、`credential_ref`、已核验 host fingerprint。
- `config/infra/data_sources.yaml`：数据源地址、协议、端口、数据库和 `credential_ref`。
- `config/infra/credentials.yaml`：本机私密 Credential Profile，权限 `0600`，永不提交；写入使用原子替换。
- 未显式提供 `credential_ref` 时，服务器主机使用 `server-default`，数据源使用 `data-source-default`；两类凭据不交叉尝试。
- 缺少或拒绝某个绑定时只报告该绑定，不轮询其他凭据。
- 密码只能经交互录入，禁止命令行参数：

  ```bash
  kata infra credentials set <name> --username <username>
  ```

  用户未提供凭据时只使用本机默认 profile；连接失败立即返回脱敏错误，要求用户补充，不在自动化进程中等待交互输入。

- 测试或自动化场景可以从 stdin 录入：

  ```bash
  printf '%s\n' '<password>' | kata infra credentials set <name> --username <username> --stdin
  ```

  CLI 输出只返回 profile 名和文件路径，不输出密码。

## 边界

- 任意 `exec`、shell、脚本上传或远程命令拼接。
- `sshpass`、`StrictHostKeyChecking=no` 或环境变量默认密码。
- 服务重启、防火墙、配置文件、进程和数据变更。
- 自动写回 `verified` 知识。
