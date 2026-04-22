# 岚图主流程用例可读性 / 数据质量刷新设计

**Date:** 2026-05-18
**Scope:** `workspace/dataAssets/features/2099-01-lt-dq-smoke/` 下四个交付物：
- `岚图主流程用例整理.md` / `.xmind`（A 文件）
- `岚图已上线需求主流程用例.md` / `.xmind`（B 文件）

## 背景

上一轮 plan（`2026-05-18-lt-cases-plan.md`）已经把岚图 v6.4.3–v6.4.10 已上线需求的 P1 主流程用例从 ltqc CSV 抽出来落到 B 文件，并按需求维度桶入 A 文件的 9 个空叶子。

本次任务不再做"抽取/桶分"，专门修两件事：

1. **可读性**：表格单元格内 `1)2)3)…` 多条目挤一格、前置条件缺 SQL/账号上下文、步骤过于潦草、xmind 节点内换行符未处理 —— 给人读都很懵，更别说脚本化。
2. **数据质量内容刷新**：岚图迭代过 v6.4.3–v6.4.10，**v6.4.8 #10193** 改了"规则任务直接建规则"为"规则集→规则任务引规则集"的强依赖；**v6.4.8 #10221** 改了菜单名。早于 v6.4.8 的用例沿用旧菜单/旧流程，必须按"版本号越大越新"原则更新。

## 真理源

- **B 文件大体可用，仅 v6.4.3–v6.4.6 数据质量段需按 #10193 / #10221 改写。**
- **A 文件其它模块（元数据/数据标准/…）只需可读性优化，无内容刷新需求。**
- **数据质量关键路径**：v6.4.3–v6.4.6 改写后的用例需登录测试环境 `http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/` 对菜单/按钮/字段名做最后一道核对，不一致就改，查不到的标 `[需复核]`。

## 工具约束

- **不动 `engine/`** 的 kata CLI 源码。所有确定性脚本写到 `workspace/.../2099-01-lt-dq-smoke/tmp/*.py`。
- xmind 生成复用现有 `kata xmind-gen` 命令，节点内换行符做后处理。

---

## §1 交付物 & 总体流

### 1.1 改写/重生成的最终文件

| 文件 | 操作 | 说明 |
|---|---|---|
| `workspace/.../岚图主流程用例整理.md` | 改写 | A 文件，10 个非数据质量模块编辑 + 数据质量段从 B 重桶 |
| `workspace/.../岚图主流程用例整理.xmind` | 重生成 | 来源：上述 A.md |
| `workspace/.../岚图已上线需求主流程用例.md` | 改写 | B 文件，按 6 个版本编辑 |
| `workspace/.../岚图已上线需求主流程用例.xmind` | 重生成 | 来源：上述 B.md |
| `workspace/.../manifest.json` | 局部更新 | `case_count`、`updated_at` |

### 1.2 tmp 工件（不进 git）

| 文件 | 用途 |
|---|---|
| `tmp/style-guide.md` | 风格指南，所有编辑 subagent 强制对照 |
| `tmp/menu-rename-map.md` | #10221 菜单映射表 |
| `tmp/ruleset-prerequisite.md` | #10193 规则集前置流程 |
| `tmp/normalize-format.py` | Phase 1 机械格式化 |
| `tmp/staging/B_v6.4.3.md ~ B_v6.4.10.md` | 6 个 B 版本块 subagent 输出 |
| `tmp/staging/A_<module>.md` ×10 | 10 个 A 非数据质量模块 subagent 输出 |
| `tmp/staging/*.report.md` | 每个编辑 subagent 的改动报告 |
| `tmp/merge.py` | staging 拼回 A.md / B.md |
| `tmp/fill-mainflow-v2.py` | Phase 4，B 数据质量桶进 A 的 9 个空叶子 |
| `tmp/normalize-final-xmind.py` | xmind 节点 `<br>` → 原生换行 |
| `tmp/edit-report.md` | 汇总所有编辑 subagent 报告 |
| `tmp/probe-report.md` | Phase 5 测试环境核对结果 |

---

## §2 风格指南（`tmp/style-guide.md` 内容）

### 2.1 用例骨架

层级保持现状（B 用 `## v6.4.X / ### 需求 / ##### 【Px】用例`；A 用 `## 模块 / ### 子模块 / #### 叶子 / ##### 【Px】用例`），仅锁住单用例内部模板：

```
##### 【P1】用例标题

> 前置条件

​```
说明文字...
SQL 语句 (DDL/DML)...
账号角色: 管理员
依赖资源: 已存在数据源 doris_test_ds
​```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | … | … |
```

### 2.2 前置条件

- **单个 ``` 块（无语言标签）**，SQL、账号、依赖、配置全塞进同一个块。
- 必含项（不适用就写"无"）：
  - 测试账号 / 角色（管理员 / 普通用户 / 自定义角色名）
  - 数据资源：数据源（含类型、连接别名）/ 数据库 / 数据表 — DDL/DML 必须给全
  - 上游依赖：具名规则集 / 规则任务 / 实例
  - 系统配置：菜单权限 / 全局水印 / 调度参数等开关

### 2.3 步骤列

- 一行 = 一个原子动作（可独立断言后再下一步）。
- **菜单路径统一**：`【数据资产】→【数据质量】→【规则集管理】`（中文方括号 + 全角箭头 →）。
- **控件类型 + 文本**：`点击【新建规则集】按钮` / `在"规则集描述"输入框输入 "${desc}"`。
- 占位符约定：`${tableName}` / `${user}` 等花括号变量。

### 2.4 预期列

- **每个观察项一行**，多项用 `<br>1) … <br>2) … <br>3) …`，**禁止**把 `1)2)3)` 挤一格。
- 文案断言放双引号：`提示信息显示"任务已提交执行"`。
- UI 元素列举用列表式：`<br>· "表名"列<br>· "所属数据源"列…`。

### 2.5 BEFORE / AFTER 实例

**BEFORE**（B line 3082 当前）：
```
| 3 | 基础信息UICHECK | 支持配置选择数据表、规则包:1) 选择数据表: 选择数据源(必填)、选择数据库(必填)、选择数据表(必填)、规则集描述2) 规则包: 支持对规则包名称进行增删改, 必填3) 按钮: 取消/下一步 |
```

**AFTER**：
```
| 3 | 检查【新建规则集 ❯ 基础信息】页面 UI 元素 | 页面包含两个区块：<br>1) "选择数据表"：数据源（必填）/ 数据库（必填）/ 数据表（必填）/ 规则集描述（选填）<br>2) "规则包"：规则包名称列表，支持增删改重命名，名称必填<br>3) 页面底部按钮：【取消】、【下一步】 |
```

### 2.6 数据质量专属改写规则（仅 v6.4.3–v6.4.6）

**菜单名映射**（按 v6.4.8 #10221，写入 `tmp/menu-rename-map.md`）：

| 旧名 | 新名 |
|---|---|
| 概览 | 总览 |
| 规则任务配置 | 规则任务管理 |
| 任务实例查询 | 校验结果查询 |
| 质量报告 | 数据质量报告 |
| —（新增） | 规则集管理 |

**规则集流程升级**（按 v6.4.8 #10193，写入 `tmp/ruleset-prerequisite.md`）：

凡步骤里"创建规则 / 新建监控规则"且没有"导入规则包"环节的，subagent 强制做两件事：

1. **前置条件追加**：已在【规则集管理】创建规则集 `${rs_name}`，规则包 `${pkg_name}` 含若干校验规则。给出对应 DDL/DML 和规则集配置说明（塞进同一个 ``` 块）。
2. **步骤改写**：进入【规则任务管理】→【新建监控规则】→ Step 1 基础信息 →【下一步】→ Step 2 监控规则中点【导入规则包】导入 `${pkg_name}` →【下一步】→ Step 3 调度属性 →【保存】。

---

## §3 subagent 契约（编辑型）

### 3.1 输入

```
你是 LTQC 主流程用例编辑 subagent。任务：把 <FILE>:<SECTION-RANGE> 内所有用例
按风格指南改写。

参考文件：
- tmp/style-guide.md   (强制对照)
- workspace/.../<原 md 文件路径>  (只读输入)
{仅 v6.4.3–v6.4.6 数据质量 subagent}:
- tmp/menu-rename-map.md       (#10221, 强制套用)
- tmp/ruleset-prerequisite.md  (#10193, 强制套用)

输出：
- tmp/staging/<staging-name>.md         (改写后的完整段)
- tmp/staging/<staging-name>.report.md  (每个用例改了什么 + 不确定项)

不变量：
- 用例标题 (##### 【Px】XXX) 保持不变, 不能删/合并/拆分用例
- 用例数与原段一致
- ##### 之外的 ## / ### / #### 层级也不动
- 表格列必须保持 | 编号 | 步骤 | 预期 | 三列
- 不引入 "TODO / 待补充 / 待确认" 类占位
```

### 3.2 staging 文件命名

| Subagent | 输入段 | staging 文件 |
|---|---|---|
| B1 | B.md `## v6.4.3` 整段 | `tmp/staging/B_v6.4.3.md` |
| B2 | B.md `## v6.4.4` 整段 | `tmp/staging/B_v6.4.4.md` |
| B3 | B.md `## v6.4.5` 整段 | `tmp/staging/B_v6.4.5.md` |
| B4 | B.md `## v6.4.6` 整段 | `tmp/staging/B_v6.4.6.md` |
| B5 | B.md `## v6.4.8` 整段 | `tmp/staging/B_v6.4.8.md` |
| B6 | B.md `## v6.4.10` 整段 | `tmp/staging/B_v6.4.10.md` |
| A1 | A.md `## 元数据` 整段 | `tmp/staging/A_元数据.md` |
| A2 | A.md `## 数据标准` | `tmp/staging/A_数据标准.md` |
| A3 | A.md `## 数据模型` | `tmp/staging/A_数据模型.md` |
| A4 | A.md `## 数据治理` | `tmp/staging/A_数据治理.md` |
| A5 | A.md `## 数据安全` | `tmp/staging/A_数据安全.md` |
| A6 | A.md `## 数据源管理` | `tmp/staging/A_数据源管理.md` |
| A7 | A.md `## 用户角色管理` | `tmp/staging/A_用户角色管理.md` |
| A8 | A.md `## 通知中心` | `tmp/staging/A_通知中心.md` |
| A9 | A.md `## 资产盘点` | `tmp/staging/A_资产盘点.md` |
| A10 | A.md `## 岚图定制模块` | `tmp/staging/A_岚图定制模块.md` |

B1–B4 携带"菜单映射 + 规则集前置"指令。B5–B6 仅做风格指南对照。

### 3.3 不分配 subagent 的边界

- 全局 YAML frontmatter + `## 通用前置条件`：由 `tmp/merge.py` 注入。
- A 的 `## 数据质量` 段：留空占位给 Phase 4 `tmp/fill-mainflow-v2.py` 处理，**不分 subagent**。

### 3.4 报告字段

每个 subagent 必须输出 `tmp/staging/<name>.report.md`：

```
| 用例 | 改动类型 | 改动摘要 | 不确定项 |
| --- | --- | --- | --- |
| 【P1】验证XXX | 步骤详化 + SQL 补全 | … | 字段名 "${unsure}" 需测试环境核对 |
| 【P1】验证YYY | 菜单名映射 (规则任务配置→规则任务管理) | … | 无 |
```

`tmp/merge.py` 会把所有 report 汇总成 `tmp/edit-report.md`。

---

## §4 tmp 确定性脚本

### 4.1 `tmp/normalize-format.py`（Phase 1）

**输入**：A.md / B.md
**输出**：原地修改
**处理**：
1. 表格单元格内 `1)2)3)…` → `<br>1) … <br>2) … <br>3) …`
2. 表格单元格内裸换行 → `<br>`
3. 单元格内 `\n` literal → `<br>`
4. 前置条件区块：` ```sql ` 改成无标签 ``` ```；裸 bullet `- …` 列表包成单个 ``` ``` 块
5. 全角空格 `　`、CRLF 归一
6. Idempotent：跑两次结果相同

Phase 1 跑完单独 commit，让 subagent 拿到干净起点。

### 4.2 `tmp/fill-mainflow-v2.py`（Phase 4）

**输入**：
- Phase 2 合并后的 B.md（数据质量段已用新版改写）
- A.md（merge 完非数据质量模块后，数据质量段为占位空壳）
- 沿用上一轮的 9 叶子映射（从 `tmp/fill-mainflow.py` 直接搬 `BUCKETS` 字典）

**输出**：A.md 的 `## 数据质量` 段被填满，其它模块不动。

### 4.3 `tmp/normalize-final-xmind.py`（Phase 6）

**输入**：`kata xmind-gen` 生成的 A.xmind / B.xmind
**输出**：原地改写 `content.json`
**处理**：
1. 节点 `title` 内 `<br>` → xmind 原生换行（`\n`）
2. 沿用上一轮 `tmp/normalize-online-xmind.py` 的根节点 flatten 逻辑：`project → suite → versions` 压成 `suite → versions`，保留 children 和 notes（这一步直接合进新脚本，不保留两个文件）

跑顺序：
```sh
kata xmind-gen --input A.md --output A.xmind --mode replace
kata xmind-gen --input B.md --output B.xmind --mode replace
python tmp/normalize-final-xmind.py
```

### 4.4 `tmp/merge.py`

**输入**：所有 `tmp/staging/*.md` + 原 A.md / B.md 的不动部分（YAML、通用前置条件、A 的数据质量占位）
**输出**：A.md / B.md 最终态
**逻辑**：
- 按预定义 section 顺序，逐段从 staging 文件读入。
- 缺失 staging 文件报错退出。
- 写完后跑一次 `tmp/normalize-format.py` 做幂等校验。

---

## §5 流水线执行顺序 + 检查点

```
Phase 0  写风格指南、菜单映射、规则集前置 三份说明
         tmp/style-guide.md
         tmp/menu-rename-map.md
         tmp/ruleset-prerequisite.md
         ──────────────────────────────
         [CHECKPOINT 0] 三份说明草稿给用户审

Phase 1  跑 tmp/normalize-format.py
         A.md / B.md 原地机械格式化
         git commit -m "chore: normalize ltqc md formatting"
         ──────────────────────────────
         [CHECKPOINT 1] diff 给用户扫一眼

Phase 2  fanout 6 个 subagent 改 B
         B1 v6.4.3  B2 v6.4.4  B3 v6.4.5
         B4 v6.4.6  B5 v6.4.8  B6 v6.4.10
         (B1–B4 携带菜单映射 + 规则集前置)
         ──────────────────────────────
         [CHECKPOINT 2] 6 份 staging + report 给用户过

Phase 3  fanout 10 个 subagent 改 A 非数据质量
         A1–A10 元数据/数据标准/数据模型/数据治理/数据安全/
                数据源管理/用户角色管理/通知中心/资产盘点/岚图定制模块
         ──────────────────────────────
         [CHECKPOINT 3] 10 份 staging + report 给用户过

Phase 4  tmp/merge.py 合并 staging → B.md
         tmp/merge.py 合并 staging → A.md (数据质量段留空)
         tmp/fill-mainflow-v2.py 桶 B 数据质量 → A
         git commit -m "feat: refresh ltqc cases per style guide"
         ──────────────────────────────
         [CHECKPOINT 4] 最终 md diff 给用户过

Phase 5  1 个 subagent，对 v6.4.3–v6.4.6 数据质量改写过的用例做测试环境核对
         登录 http://shuzhan63-test-ltqc.k8s.dtstack.cn/dataAssets/#/
         (优先复用 .auth/ 已有 session 文件)
         一致→不动；不一致→改 A/B.md；查不到→标 [需复核] 列入 tmp/probe-report.md
         ──────────────────────────────
         [CHECKPOINT 5] 复核报告 + diff 给用户过

Phase 6  kata xmind-gen 重生成两个 .xmind
         tmp/normalize-final-xmind.py 处理换行符 + flatten 根节点
         manifest.json 更新 (case_count, xmind_path, updated_at)
         git commit -m "feat: regenerate ltqc xmind + bump manifest"
         ──────────────────────────────
         [FINAL] 4 个文件全交付
```

**回滚策略**：每个 Phase 单独 commit；中途出错可 `git checkout` 回上一个 checkpoint，不影响其它 Phase。

**预估成本**：16 个编辑 subagent + 1 复核 subagent = 17 次 subagent 调用，每次约 1-2 万 token 输入 + 1-2 万输出。

---

## 不在本设计范围

- 不再做 CSV 抽取 / 候选筛选（上一轮已完成）。
- 不调整 A / B 的层级结构、用例数、模块划分。
- 不动 `engine/` 下 kata CLI 源码。
- 不为 xmind 文件单独做内容编辑（一律 md 改完重生成）。
- 不更新 metadata.yaml 的 modules/customers/versions 字段。
