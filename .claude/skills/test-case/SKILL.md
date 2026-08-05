---
name: test-case
description: 编写、更新、导入、同步或标准化 Kata 测试用例。Lanhu/Axure URL、PRD、截图和功能描述等需求源走 create；既有 .yaml、.csv、.xlsx、.md、.xmind 或明确更新诉求走 update。只发 feature 目录且要求 UI 自动化时转 ui-automation；ZenTao hotfix 回归转 defect-analyze。
---

# Outcome

建立或更新可追溯的需求、测试点和 YAML 用例权威，只通过 `kata cases build` 生成派生格式。

## Routing

- 新需求、PRD、设计稿、截图或功能描述：执行 [workflows/create.md](workflows/create.md)。
- 既有 YAML 或 CSV、XLSX、Markdown、XMind、标题同步、格式标准化：执行 [workflows/update.md](workflows/update.md)。
- 只给 feature 目录并要求生成、修复或验证 UI 自动化：转 `ui-automation`。
- ZenTao Bug ID/URL 的 hotfix 回归报告：转 `defect-analyze`；需要正式 YAML 回归用例时返回本 Skill。

## Steps

1. 查明事实
   - 读取需求源、用户指定 feature、已有 `prd/prd.md`、`cases/test-points.md`、`cases/需求名.yaml` 及相关知识和 CLI 状态。
   - 不向用户询问可从需求源、路径、CLI 或已有文件查明的事实。
   - 完成条件：项目和 `<项目>:<版本目录>/<需求目录名>` 唯一，create/update 分支和证据缺口明确。
2. 确认关键决策
   - 只询问需求语义、覆盖取舍、最终发布或不可恢复删除等无法从证据确定且会改变结果的决策。
   - 无业务证据的步骤保持待确认，不把历史用例或当前 UI 猜成需求事实。
   - 完成条件：PRD、测试点、YAML 权威链的变更范围和排除项明确。
3. 执行
   - **写 YAML 前解析客户身份并注入知识与规范**：
     - 从需求标题/VCS 分支/feature 目录名识别客户编号(如 `ltqc`/`lzlj`/`zszq`)：
       - **高置信度**(需求标题含明确客户中文名、分支名含客户码、feature 目录含客户名) → 自行确认客户编号，不过问用户
       - **低置信度**(标品、不确定所属客户、多客户共享) → 向用户确认客户编号，**确认前先基于知识库/源码验证并给出推荐答案**
     - 列出可用客户：`kata knowledge list --project <项目>`
     - 加载用例公共规范与客户专属规范：
       ```bash
       kata knowledge read --project <项目> --type standard --customer <客户编号>
       ```
       （`--customer default` 只读公共基线；具体 code 读公共 + 客户专属）
     - 加载项目业务知识：`kata knowledge read --project <项目> --module <模块>`
     - 无客户专属文件或文件落后时，**必须按此分支补齐再写用例**：
       1) `customers/<code>.md` 缺环境地址或源码分支 → 向用户索要测试环境地址与源码仓库/分支
       2) `kata repos prepare --project <项目> --module <模块> --customer <客户>` 拉取源码；对测试环境做 DOM 探测
       3) 按 [templates/standard-template.md](templates/standard-template.md) 结构初始化或更新 `standards/<customer>/` 文档
       4) 向用户报备（写哪个文件、依据、影响），同意后 `kata knowledge write --type standard --customer <客户>` 落盘
       5) 重新加载后写用例
     - 完成条件：客户身份确定，规范与知识已加载，客户专属文件存在且时效满足需求
   - create/update workflow 按确认范围维护 PRD、测试点和 YAML；派生产物仅由 `kata cases build` 生成。
   - **写 YAML 必须严格遵循 [examples/cases.yaml](examples/cases.yaml) 及 [examples/best-practices.md](examples/best-practices.md)。超出两份文件明确范围的禁止自行创建规范，必须给出建议并取得用户确认。** cases.yaml 是用例编写框架，best-practices.md 是各字段值通用填写规范；客户专属表单配置细节从 `kata knowledge read --type standard --customer` 加载，无客户文件时按 [templates/standard-template.md](templates/standard-template.md) 结构先创建再写用例。
   - **前置条件只声明环境与数据准备（数据源授权、建表、插数、账号、已存在对象）；任何配置操作（配置监控对象/监控规则、新建规则集/规则任务、点击保存、立即执行等）必须写进 `steps[].action`。**
   - **表单配置通用规则：每条规则/表单一个完整 action，按前端表单顺序逐行列出全部配置项（必填项带 `*`，可空项如过滤条件/维度字段也占位列出值为「空」）；不得省略、概括、改字段名。具体配置项、顺序、级联以客户专属 `standards/<customer>/` 文件为准。**
   - **分区数据一正一异：前置分区表插入两个分区，一个分区全部为可校验通过的正确数据，另一个分区全部为校验不通过的异常数据；用例「选择分区」值指向与预期结果一致的分区（预期达标选正确数据分区，预期校验不通过选异常数据分区），并写分区字段=具体值。**
   - **明细数据=脏数据：规则包/规则集的规则靠校验SQL定义违规明细行；查看明细用例在前置建表插数中构造违规数据，expected 同时给出校验SQL（SELECT 列 FROM 表 WHERE 违规条件）及返回记录。**
   - **tags 平级模块：数据质量下的规则库配置/规则集管理/规则任务管理/校验结果查询/数据质量报告 是同一级别平级菜单；tags 只保留一个核心操作模块（如 [数据质量, 规则任务管理]），不得把流程中经过的多个平级模块串成层级链（如 [数据质量, 规则集管理, 规则任务管理, 校验结果查询] 是错误写法）。**
   - **用例规范变更分流：收到格式/内容调整诉求时先判公共/专属——高置信度自行处理，低置信度先基于知识库/源码验证并给出推荐答案再向用户确认。公共范改写 skill 文件（须经确认），专属范写 `standards/<customer>/` 知识（须经确认）。**
   - 完成条件：每个测试点可追溯到 PRD，每条用例可追溯到测试点，不得伪造自动化映射或占位脚本。
4. 验证
   - 运行 `kata prd lint`、`kata cases build`、`kata cases lint --exit-code`。
   - 完成条件：机械校验成功，逐项标明已验证、缺业务证据未验证和明确排除项。

## Delivery

- 返回 feature 路径、PRD、测试点、YAML 和实际生成的 exports。
- 逐项说明已验证、缺少业务证据保持不变、以及被明确排除的覆盖。
- 导入原件归档 `cases/imports/`；默认只导出 YAML 同名 `需求名.xmind`，其他格式由 `meta.exports` 声明。

## Guardrails

- 模型不得直接读取 `config/`；机械硬规则通过 `kata cases lint`/`kata cases build` 执行。
- 需求事实不足时不猜菜单、字段、枚举、步骤或预期。
- create 流程在发布确认前不写 `prd/prd.md`。
- YAML 是唯一用例源；不为缺失自动化伪造 `spec_file` 或占位脚本。纯接口用例不纳入功能用例集。
- 环境与业务实例使用语义占位符，不写真实凭据、Cookie 或私密配置。

## References

- create 分支：完整读取 [workflows/create.md](workflows/create.md)。
- update 分支：完整读取 [workflows/update.md](workflows/update.md)。
- 写 YAML：按 [examples/cases.yaml](examples/cases.yaml) 顶部索引按需读取 [examples/best-practices.md](examples/best-practices.md) 对应章节。
- 客户专属表单配置模板：[templates/standard-template.md](templates/standard-template.md)。
- 交付前自审：[checklists/review.md](checklists/review.md)。
