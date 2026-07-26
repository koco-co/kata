# 当前最小诊断 playbook

当前版本只执行 SSH connectivity 检查，不执行任意远程命令。

## 1. 配置检查

```bash
kata config doctor --scope infra --exit-code
```

配置文件职责：

- `config/infra/hosts.yaml`：SSH 主机及 host key。
- `config/infra/data_sources.yaml`：数据库/数据源连接元数据。
- `config/infra/credentials.yaml`：可复用的私密认证材料。

每个 host 或 data source 必须显式绑定一个 `credential_ref`。认证失败时不得尝试其他 Credential Profile。

## 2. 首次信任 host key

先从可信渠道核对服务器指纹。未知指纹不会自动写入配置，必须显式执行：

```bash
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
```

此后指纹一旦变化即阻断连接，不能通过关闭校验绕过。

## 3. Connectivity

```bash
kata infra inspect <host> \
  --check connectivity \
  --project <project> \
  --slug <slug>
```

该命令使用 Kata 的 SSH2 客户端依次验证网络、host key 和 SSH 认证，并生成唯一一份报告，固定写入：

```text
workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md
```

报告状态只记录本次检查是否完成；SSH 成功不代表业务原始路径已验证。

## 4. 凭据录入

```bash
kata infra credentials set <name> --username <username>
```

交互输入不回显；写入文件时使用原子替换，文件权限为 `0600`。CLI 输出只返回 profile 名和文件路径，不输出密码。
