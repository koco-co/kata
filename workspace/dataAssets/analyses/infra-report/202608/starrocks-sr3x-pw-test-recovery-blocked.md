# 基础设施连通性报告：starrocks-sr3x-pw-test-recovery-blocked

- 状态：blocked
- 项目：dataAssets
- 目标：172.16.113.225

## 基本信息

- 生成时间：2026-08-07T08:00:00+08:00
- 目标：172.16.113.225
- 检查类型：SSH connectivity

## 症状

- 平台 StarRocks 任务提交成功，但建临时表失败。
- 错误为 default_replication_num=3 大于当前存活 BE 节点数，alive backend 仅 10004、10006。
- 用户判断其中一台 StarRocks BE 节点异常，要求登录 172.16.113.225 恢复该节点。

## 诊断路径

- 读取 infra-diagnose skill 与 playbook，确认 Kata 只支持受控 SSH connectivity 检查，不执行远程命令。
- 运行 `kata config doctor --scope infra --exit-code`，确认 hosts.yaml 与 credentials.yaml 未配置。
- 运行 `kata infra inspect 172.16.113.225 --check connectivity --project dataAssets --slug sr-node-172-16-113-225 --dry-run`，因私有 infra 配置缺失而退出。
- 只读检查本机 SSH known_hosts、SSH config 和 ssh-agent，确认 known_hosts 有该主机记录，但没有已加载的 SSH 身份。

## 证据

- `kata config doctor --scope infra --exit-code` 退出码 1：hosts.yaml 未配置、credentials.yaml 未配置。
- `kata infra inspect ... --dry-run` 退出码 1：报告同样缺少 hosts.yaml 与 credentials.yaml。
- 数据源绑定存在：type=starrocks，host=172.16.113.225，port=19030，database=pw_test，credential_ref=data-source-default。
- 本机 `~/.ssh/known_hosts` 存在 172.16.113.225 记录，但 `~/.ssh` 没有可用私钥文件，`ssh-add -l` 无身份。

## 结论

- 事实：Kata 基础设施配置未完成，无法执行受控 SSH connectivity 检查。
- 事实：未取得 SSH 凭据，本机也没有已加载的 SSH 身份，无法登录目标服务器。
- 边界：即使配置完成，infra-diagnose 也只支持 connectivity 检查，不执行服务重启等远程变更。
- 因此节点恢复操作被阻断，不能声称已恢复 StarRocks BE。

## 变更计划与结果

- 本次未执行任何远程变更，也未修改私密基础设施配置。
- 恢复前需要用户提供 SSH 用户名与凭据录入方式，并明确授权远程服务恢复命令。

## 原始路径复测

- 未执行平台任务复测。
- 恢复后应先通过 `SHOW BACKENDS` 确认存活 BE 节点数量，再复跑原 StarRocks 任务。

## 知识回写

- 本次未自动写入知识库。
