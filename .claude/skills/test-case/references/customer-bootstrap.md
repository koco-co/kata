# 客户身份解析与知识注入

create/update 分支在**写 YAML 前**必须执行本例程。本文件是唯一规范源，create.md 与 update.md 均引用本文件，避免多处维护漂移。

## 识别客户编号

- 从需求标题/VCS 分支/feature 目录名识别客户编号（如 `ltqc`/`lzlj`/`zszq`）：
  - **高置信度**（需求标题含明确客户中文名、分支名含客户码、feature 目录含客户名）→ 自行确认客户编号，不过问用户
  - **低置信度**（标品、不确定所属客户、多客户共享）→ 向用户确认客户编号，**确认前先基于知识库/源码验证并给出推荐答案**

## 注入知识与规范

```bash
kata knowledge list --project <项目>
kata knowledge read --project <项目> --type standard --customer <客户编号>
kata knowledge read --project <项目> --module <模块>
```

（`--customer default` 只读公共基线；具体 code 读公共 + 客户专属）

## 无客户专属文件时补齐

无客户专属文件或文件落后时，**必须按此分支补齐再写用例**：

1) `customers/<code>.md` 缺环境地址或源码分支 → 向用户索要测试环境地址与源码仓库/分支
2) `kata repos prepare --project <项目> --module <模块> --customer <客户或标品>` 拉取源码；对测试环境做 DOM 探测
3) 按 [../templates/standard-template.md](../templates/standard-template.md) 结构初始化或更新 `standards/<customer>/` 文档
4) 向用户报备（写哪个文件、依据、影响），同意后 `kata knowledge write --type standard --customer <客户>` 落盘
5) 重新加载后再写用例

## 准备源码

```bash
kata repos prepare --project <项目> --module <模块> --customer <客户或标品>
```

（已在补齐分支执行过则跳过）

## 完成条件

客户身份确定，规范与知识已加载，客户专属文件存在且时效满足需求。
