<!--
XMind 用例 topic 与 Markdown 用例的映射示意（ASCII 树状）
格式规范以 .claude/prompt/_shared/case-qa.md、.claude/prompt/_shared/output-artifacts.md 与本 fewshot 为准。
配套的 md fewshot 见 ./case-format-sample.md。

为何用 ASCII 树状而非真 .xmind：
- 真 .xmind 是 zip + JSON，模型只能看到压缩后的 JSON 文本，结构反而被掩盖；
- ASCII 树状可直观展示「md 表格 → xmind topic 父子链」「priority marker」「notes 与裸 SQL」三套映射规则。
-->

## frontmatter 事实字段 → xmind 节点 → 来源（严禁编造）

下表字段会渲染进 xmind **可见节点**，是 case-draft 最易被「当格式字段随手填」而出错的地方。每个字段都是需向用户/ZenTao 确认的**外部事实**，不是可自由编的格式占位——无证据时必须 `AskUserQuestion` 索要，严禁编造编号、自创需求名或拿默认值兜底。映射依据见 `.claude/scripts/_shared/cli/xmind-gen/archive.ts` 与 `render.ts`。

| frontmatter 字段 | 语义 | xmind 渲染目标 | 来源 / 能否自填 | 取不到时动作 |
| --- | --- | --- | --- | --- |
| `product_line` | 产品线名（固定，如 `数据资产`） | 根节点产品线段（模板 `{product_line}v{prd_version}迭代用例(#{iteration_id})`） | workspace 固定产品线名（dataAssets=数据资产）；缺省回退 CLI `--project` | 用项目产品线名 |
| `suite_name` | 真实需求名 | 二级(L1)节点标题（自动去尾部 `(#数字)`） | ZenTao 需求名原文 / 用户；**禁自创、禁加客户前缀、禁改大小写与语序** | AskUserQuestion |
| `case_id`（或 `prd_id`） | 真实 ZenTao 需求 id（数字） | 二级节点 label `(#N)` | ZenTao / 用户；**禁编号、禁顺手填序号** | AskUserQuestion |
| `prd_version` | lanhu-prd 迭代版本（如 `7.0.0`，与 feature 目录版本一致） | 根节点版本段（模板 `{product_line}v{prd_version}迭代用例(#{iteration_id})`） | lanhu-prd 版本 / 用户；**禁拿开发分支版本（如 6.0_浙商证券）充数** | AskUserQuestion |
| `root_name`（可选） | 根节点标题整体覆盖 | 给出即**整串**作根标题（不再套模板） | 仅用户显式要求覆盖时填 | 留空走默认模板 |
| `iteration_id` | 迭代号（固定） | 根节点 `(#N)` 段 | 来自 `.claude/scripts/_shared/lib/rules.ts`，**模型不得改** | 用 rules 默认值 |

> 版本概念：`prd_version`（xmind 根节点版本段）= feature 目录版本 = **lanhu-prd 迭代版本**（如 `7.0.0` / 目录 `v7.0.0`），两处同源一致。开发分支/客户平台版本（如 `6.0_浙商证券`）只是环境信息（写前置条件、metadata），**不进根节点、不进目录**。sheet 名（XMind 左下角画布标签）由 `kata xmind-gen` 自动取根节点标题，无需手填。详见 `.claude/skills/case-draft/rules/naming-convention.md`。

## 映射对照表

| Markdown 元素 | XMind topic 对应 |
| --- | --- |
| `##### 【Pn】<标题>` | 用例 topic：title=`【Pn】<标题>` + `markers=[priority-N]` |
| `> 前置条件` 后的 ```sql 块 | 用例 topic 的 `notes.plain.content`，裸内容（不带 ```sql 围栏） |
| 表格的每一行「步骤」单元格 | 用例 topic 下的 step child topic：title=步骤文本（`<br>` 还原为换行） |
| 表格同一行的「预期」单元格 | step child 下的 expected grandchild topic：title=预期文本（`<br>` 还原为换行） |

priority marker 对照：

| Markdown 标题前缀 | XMind markerId |
| --- | --- |
| `【P0】` | `priority-1` |
| `【P1】` | `priority-2` |
| `【P2】` | `priority-3` |
| `【P3】` | `priority-4` |

## 完整结构示意（基于同目录 case-format-sample.md）

```
画布 1 (sheet)
└── 岚图主流程用例集合-样例 (rootTopic)
    └── 数据质量                              [一级模块 H3]
        └── 规则任务管理                       [二级模块 H4]
            └── 【P0】验证【完整性校验-字段级-空值数】质量规则任务校验正常
                │   [markers: priority-1]
                │   [notes.plain.content =
                │     /*
                │     1. 已引入 SparkThrift2.x 数据源，数据库 ${SchemaA}。
                │     2. 已在【数据质量 → 通用配置 → 报告关联维表设置】中为表 dwd_voyah_dq_vehicle_null_cnt 设置：
                │     -- 车辆数统计字段：vehicle_count
                │     ...
                │     3. 执行以下 SparkThrift2.x 前置 SQL，准备分区表和测试数据。
                │     */
                │     USE ${SchemaA};
                │     DROP TABLE IF EXISTS dwd_voyah_dq_vehicle_null_cnt;
                │     CREATE TABLE dwd_voyah_dq_vehicle_null_cnt (...)
                │     ...
                │     SELECT COUNT(1) AS car_model_name_null_cnt
                │     FROM dwd_voyah_dq_vehicle_null_cnt
                │     WHERE stat_date='20260115' AND car_model_name IS NULL;
                │     -- 预期结果：1
                │     ...
                │   ]
                │
                ├── 进入【数据质量 → 规则集管理】, 点击「新建规则集」:    [step child topic — title 真实换行]
                │       - 选择数据源: SparkThrift2.x
                │       - 选择数据库: ${SchemaA}
                │       - 选择数据表: dwd_voyah_dq_vehicle_null_cnt
                │       - 规则集描述: 完整性字段级空值数校验
                │       - 新增规则包名称: 字段空值数规则包
                │       点击「下一步」
                │   └── 1)规则集基础信息保存成功               [expected grandchild — 真实换行]
                │       2)规则包创建成功
                │
                ├── 选择规则包(字段空值数规则包), 新增「完整性校验」规则:
                │       - 生效范围: 字段级
                │       - 字段: car_model_name
                │       - 统计函数: 空值数
                │       - 过滤条件: 无
                │       - 校验方法: 固定值
                │       - 期望值: = 0
                │       - 强弱规则: 强规则
                │       - 规则描述: 校验指定分区内车型名称空值数为0
                │       点击「保存」并保存规则集
                │   └── 1)规则保存成功
                │       2)规则集详情中展示 car_model_name 空值数规则
                │       3)期望值为固定值 = 0
                │       4)规则描述展示为「校验指定分区内车型名称空值数为0」
                │
                ├── 进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:
                │       - 规则名称: SparkThrift2.x+完整性校验+字段级+空值数
                │       - 选择数据源: SparkThrift2.x
                │       - 选择数据库: ${SchemaA}
                │       - 选择数据表: dwd_voyah_dq_vehicle_null_cnt
                │       - 选择已有分区: stat_date='20260116'
                │       点击「下一步」
                │   └── 1)监控对象配置成功
                │       2)进入监控规则页面
                │
                ├── 在「监控规则」中引用质量规则:
                │       - 规则包: 字段空值数规则包
                │       - 规则类型: 完整性校验
                │       点击「下一步」
                │   └── 1)监控规则配置成功
                │       2)进入调度属性页面
                │
                ├── 在「调度属性」中配置:
                │       1)调度配置:
                │       - 调度周期: 手动触发
                │       - 规则拼接包: 1
                │       - 实例生成方式: 立即生成
                │       - 超时时间: 不限制
                │       2)告警配置: 无
                │       3)报告配置: 无需生成报告
                │       点击保存, 进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页, 点击「立即执行」
                │   └── 1)调度属性配置成功
                │       2)规则任务保存成功
                │       3)进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页
                │       4)任务提交执行成功
                │
                ├── 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情
                │   └── 1)最新实例为「校验通过」
                │       2)car_model_name 空值数实际值为 0
                │       3)期望值为 0
                │       4)明细仅统计 stat_date='20260116' 分区
                │
                ├── 进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+完整性校验+字段级+空值数), 仅变更选择分区:
                │       - 选择已有分区: stat_date='20260116' -> stat_date='20260115'
                │       保存后再次点击「立即执行」
                │   └── 1)规则集和规则包内容未改动
                │       2)任务分区保存成功
                │       3)任务提交执行成功
                │
                └── 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情
                    └── 1)最新实例为「校验不通过」
                        2)car_model_name 空值数实际值为 1
                        3)期望值为 0
                        4)不通过明细包含 order_id=ORD_NULL_003
                        5)明细仅统计 stat_date='20260115' 分区
```

## 易错点（违例示例 → 正确写法）

1. 把 `<br>` 留在 xmind topic title 中
   - ❌ `选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}`
   - ✅ topic title 内换行用真实 `\n`，`<br>` 仅在 md 表格单元格内出现。

2. 单 topic title 堆叠 3+ 个 「...」 引号项
   - ❌ `校验「字段」「统计函数」「过滤条件」`
   - ✅ 拆成多行或拆 child topic。

3. priority marker 漏挂或挂错
   - ❌ 用例 topic 无 markers，靠 title 的 `【P0】` 文本表示优先级
   - ✅ 同时挂 `markers: [{markerId: "priority-1"}]`；marker 与标题前缀对照表必须一致。

4. 前置条件 SQL 塞到 step child 而非 notes
   - ❌ 在用例 topic 下挂一个 "前置 SQL" child topic
   - ✅ 前置条件代码块的**裸内容**写到用例 topic 的 `notes.plain.content`。

5. 步骤跨页面合并
   - ❌ 一个 step child 同时写「在『监控规则』引用规则包」+「在『调度属性』配置调度周期」
   - ✅ 拆成两个 step child，预期编号顺序与发生顺序一致。
