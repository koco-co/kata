---
title: 泸州老窖
type: customer
tags: [customer:lzlj]
status: verified
source: "用户确认、泸州老窖定制环境与当前定制源码，2026-08-05"
updated: 2026-08-05
---

# 泸州老窖

客户编号：`lzlj`

平台环境：http://shuzhan63-dev-lzlj.k8s.dtstack.cn

当前数据资产定制前端：`customltem/dt-insight-studio`，分支 `dataAssets/feat_6.3.x_15911_debug`。

用例账号统一使用抽象名：

- `UserA`：管理员主流程账号。具备当前用例所需页面、操作、导入和导出权限；同时属于 root、tenantAdmin、tenantOwner 或 assetAdmin 之一，可执行目录行拖拽。
- `UserB`：权限验证账号。每条权限用例必须在前置条件中写明已授予和未授予的具体权限，不记录真实账号、密码或 Cookie。

需求 #15911 只覆盖泸州老窖定制能力；历史 CSV 仅用于查漏，不继承历史执行结果。
