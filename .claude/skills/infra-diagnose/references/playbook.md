# SSH connectivity playbook

当前能力只检查配置、网络、host key 和 SSH 认证，不执行远程命令。

## 1. 检查配置

```bash
kata config doctor --scope infra --exit-code
```

配置文件职责：

- `config/infra/hosts.yaml`：SSH 主机、端口、Credential Profile 引用和 host key。
- `config/infra/data_sources.yaml`：数据库或数据源的连接元数据和 Credential Profile 引用。
- `config/infra/credentials.yaml`：本机私密认证材料。

未填写 `credential_ref` 时，主机使用 `server-default`，数据源使用 `data-source-default`。加载器只检查目标最终绑定的 Profile，不会在认证失败后尝试其他凭据。

完成条件：命令退出码为 0，目标主机及其最终 Credential Profile 均存在，三个私密配置文件的权限和 Git 状态符合检查结果。

## 2. 准备凭据

缺少目标绑定的 Profile 时，使用交互输入：

```bash
kata infra credentials set <name> --username <username>
```

自动化场景由受控的密钥管理器将值传入 stdin；不要把密码写入脚本、命令行、shell 历史或日志。

CLI 只返回 Profile 名和文件路径。认证失败时保留当前绑定，不轮询其他 Profile。

完成条件：目标引用的 Profile 已存在，写入文件权限为 `0600`，任何输出均未包含密码。

## 3. 信任 host key

首次连接前从可信渠道核对服务器指纹，再显式执行：

```bash
kata infra trust-host <host> --fingerprint <SHA256-fingerprint>
```

未知指纹不会自动写入；已记录指纹发生变化时保持阻断。

完成条件：`hosts.yaml` 中保存的指纹与可信渠道提供的值完全一致。

## 4. 执行 connectivity 检查

```bash
kata infra inspect <host> \
  --check connectivity \
  --project <project> \
  --slug <slug>
```

命令通过一次受控 SSH 连接覆盖网络连通、host key 验证和 SSH 认证，并将唯一报告写入：

```text
workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md
```

完成条件：命令已结束，报告记录了明确的成功阶段或失败阶段及脱敏错误；SSH 成功仅证明 connectivity，不证明业务原始路径。

## 5. 校验报告

```bash
kata infra lint \
  --report workspace/<project>/analyses/infra-report/<yyyymm>/<slug>.md \
  --exit-code
```

完成条件：lint 退出码为 0；报告不含凭据、连接串、私密配置正文或完整终端日志。
