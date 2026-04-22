# 岚图测试用例整理 实施计划

> **For agentic workers:** 任务按步骤用 checkbox 追踪。

**目标：** 完成两个任务——(1) 从历史迭代 CSV 中提取岚图 L1 一级用例并输出 md+xmind；(2) 补充现有 xmind 主流程用例中数据质量和落标检查的空白区域。

**策略：** 先从语义模型中提取 L1 用例详情，理解每条用例的标题/步骤/预期，再按模块分类输出。xmind 补充部分直接利用 L1 中相关模块的内容。

**Tech Stack:** Python (CSV解析+xmind生成), xmind (output)

---

### 任务 1: 提取并整理岚图L1一级用例

**文件:**
- 读取: `workspace/dataAssets/_shared/archive/history/ltqc/lantu_l1_cases.json`
- 读取: `workspace/dataAssets/_shared/archive/history/ltqc/lantu_all_cases.json` (包含L2/L3参考)
- 输出: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.md`
- 输出: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图已上线需求一级用例.xmind`

- [ ] **Step 1: 读取 L1 用例 JSON 并提取完整详情（标题/步骤/预期）**
  - 从 `lantu_all_cases.json` 按 case_id 匹配回原始 CSV 读取完整行数据
  - 对每条 L1 用例，提取：用例编号、所属模块、相关需求、用例标题、前置条件、步骤、预期
  - 按语义模块分类（已完成初步分类：完整性校验、规则校验、质量报告等 20+ 类）

- [ ] **Step 2: 按模块组织并编写 md 输出**
  - 输出文件: `岚图已上线需求一级用例.md`
  - 结构: 按版本（v6.4.3 ~ v6.4.10）组织，每个版本下列出需求模块，每个需求下列 L1 用例
  - 每条用例包含: 用例标题、前置条件（简明）、步骤、预期结果
  - 去重：跨版本重复的用例只保留最新版本

- [ ] **Step 3: 生成对应的 xmind 文件**
  - 输出文件: `岚图已上线需求一级用例.xmind`
  - 结构: 版本 → 需求模块 → 用例标题（步骤/预期作为子节点）
  - 使用与现有 xmind 一致的格式风格

- [ ] **Step 4: 自我检查**
  - 确认所有 233 条 L1 用例都已包含
  - 确认步骤和预期完整
  - 确认无重复条目

---

### 任务 2: 补充主流程 xmind 中数据质量和落标检查

**文件:**
- 读取: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理.xmind`
- 读取: `workspace/dataAssets/_shared/archive/history/ltqc/lantu_l1_cases.json`
- 输出: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理（增强版）.xmind`
- 输出: `workspace/dataAssets/features/2099-01-lt-dq-smoke/岚图主流程用例整理（增强版）.md`

- [ ] **Step 5: 解析现有 xmind 结构并定位补充点**
  - 数据质量目前只有: 概览、项目管理 → 需补充完整的数据质量主流程
  - 落标检查完全空白 → 需新增到数据标准模块下
  
- [ ] **Step 6: 编写数据质量补充用例**
  - 从 L1 用例中提取数据质量相关模块：
    - 规则配置（含自定义规则、中间态保存）
    - 规则集管理（按数据表管理）
    - 规则任务管理（编辑分区、多任务）
    - 质量报告管理/查看/下载
    - 规则库管理（内置规则库、增加规则项）
    - 抽样检查
    - 明细数据下载
    - 分区设置
    - 调度设置（跟随离线调度、cron表达式、spark调参、时长限制）
    - 内置规则（完整性/有效性/一致性/合理性/时效性）
    - 关联离线任务
  - 每个模块写 3-8 条主流程用例（精选，不冗余）

- [ ] **Step 7: 编写落标检查补充用例**
  - 在数据标准下新增「落标检查」子模块
  - 从 L1 用例提取关键场景：
    - 标准定义扩充配置字段
    - 标准映射支持选择到具体数据表
    - 以数据表形式查询映射结果
    - 标准落标检查执行与结果查看
  - 写 5-10 条主流程用例

- [ ] **Step 8: 生成增强版 xmind**
  - 基于现有 xmind + 新增的数据质量和落标检查内容
  - 保持原有结构和风格

- [ ] **Step 9: 生成增强版 md 文档**
  - 完整输出增强后的主流程用例
  - md 格式便于后续转换为 playwright 脚本

- [ ] **Step 10: 最终检查**
  - 确认 4 个输出产物全部在 `workspace/dataAssets/features/2099-01-lt-dq-smoke/`
  - 确认 md 和 xmind 内容一致
  - 数据质量主流程覆盖率达到 80%+
  - 落标检查主流程覆盖到位
