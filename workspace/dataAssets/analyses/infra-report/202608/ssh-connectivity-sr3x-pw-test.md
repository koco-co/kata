# 基础设施连通性报告：ssh-connectivity-sr3x-pw-test

- 状态：diagnosed
- 目标：sr3x-pw-test

## 基本信息

- 生成时间：2026-08-07T07:50:02.577Z
- 目标：sr3x-pw-test

## 症状

- 请求：SSH connectivity 检查

## 诊断路径

- Kata CLI 读取本机 infra 配置并使用 SSH2 连接目标主机。

## 证据

- SSH result: ready
- SSH client completed the connectivity check.
- 观测到 host fingerprint：SHA256:KuHEOmcoZ0q9yL058OdUfpjWNLdu/coX56DmRJrtMo0

## 结论

- SSH connectivity succeeded; original business path was not tested.

## 变更计划与结果

- 本次未执行任何远程变更。

## 原始路径复测

- 本最小版本未执行原始业务路径复测。

## 知识回写

- 本次未自动写入知识库。
