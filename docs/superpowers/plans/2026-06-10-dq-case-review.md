# 数据质量 94 例逐条审查与调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对照源码 + 平台抽查，逐条审查并调整数据质量模块 94 例的标题/前置/步骤/预期，落回 `archive.md` 与 `cases.xmind`，全程 detached worktree 不合入 main。

**Architecture:** 设计 spec 见 [docs/superpowers/specs/2026-06-10-dq-case-review-design.md](../specs/2026-06-10-dq-case-review-design.md)。方案 A（subagent-driven 分批）：批次1 golden 47 → 批次2 报告15+配置10 → 批次3 规则库10+总览6+项目6。每批走「源码 reader 建基线 → implementer 改写 archive → spec review → quality review → 同步 xmind → 6维一致性 gate → commit」。`archive.md` 为编辑面，`cases.xmind` 定点打补丁。

**Tech Stack:** Python3（解析/审计/补丁 xmind）、git worktree、kata 源仓库（dt-insight-studio / dt-center-assets，只读）、Claude subagent 编排。

**这不是典型 TDD 代码计划**：核心产物是 QA 用例文本，不是可单测的函数。因此「测试」由两类 gate 替代——(a) Python 审计脚本做 archive↔xmind 6 维一致性校验；(b) spec review + quality review 两阶段人/agent 评审。工具脚本本身按 TDD 写。

---

## 文件结构

| 文件 | 责任 | 创建/修改 |
| --- | --- | --- |
| `.worktrees/dq-case-review/` | 隔离工作区（detached from main） | 创建 |
| `workspace/dataAssets/features/【v6411】…lindorm/archive.md` | 编辑面：DQ 段补三层结构并逐条调整 | 修改（仅 DQ 段） |
| `workspace/dataAssets/features/【v6411】…lindorm/cases.xmind` | 同步目标：定点打补丁 | 修改 |
| `workspace/dataAssets/features/【v6411】…lindorm/dq-review-change-summary.md` | 逐例变更摘要 + 重大增删清单 | 创建 |
| `workspace/dataAssets/features/【v6411】…lindorm/.process/tools/parse_xmind.py` | 解析 xmind → 用例模型 | 创建 |
| `workspace/dataAssets/features/【v6411】…lindorm/.process/tools/audit_sync.py` | archive↔xmind 6 维一致性审计 | 创建 |
| `workspace/dataAssets/features/【v6411】…lindorm/.process/tools/xmind_patch.py` | 按变更摘要定点回写 xmind | 创建 |
| `workspace/dataAssets/features/【v6411】…lindorm/.process/baselines/<batch>.md` | 各批源码字段基线 | 创建 |

约定：下文 `$FEAT` = `workspace/dataAssets/features/【v6411】【岚图汽车】【数据资产】数据资产适配lindorm`（含中文，命令中始终加引号）。`$WT` = worktree 根。所有源仓库（`workspace/dataAssets/.kata/repos/**`）只读，仅 read/grep/`git fetch`。

---

## Task 0：环境搭建（worktree + symlink + 取最新源码）

**Files:**
- Create: `.worktrees/dq-case-review/`（worktree）
- Modify: 主工作树 → pre-worktree 快照提交

- [ ] **Step 1: 主工作树打 pre-worktree 快照**

主工作树当前有 `archive.md`（已同步）与 `cases.xmind`（XMind 应用重存）未提交。按项目规则不做范围过滤，整体提交：

```bash
cd /Users/poco/Projects/kata
git add -A
git commit -m "chore: 🧹 save pre-worktree local changes"
```

Expected：提交成功；`git status --short` 干净。若提示 nothing to commit，说明已被并行会话快照，跳过即可。

- [ ] **Step 2: 创建 detached worktree 并记录基线 SHA**

```bash
cd /Users/poco/Projects/kata
git worktree add --detach .worktrees/dq-case-review main
git -C .worktrees/dq-case-review rev-parse HEAD
```

Expected：worktree 创建成功，打印基线 SHA（记下，最终交付时回报）。

- [ ] **Step 3: symlink `.kata` 以读源码 + session**

```bash
ROOT=/Users/poco/Projects/kata
W="$ROOT/.worktrees/dq-case-review"
mkdir -p "$W/workspace/dataAssets"
ln -s "$ROOT/workspace/dataAssets/.kata" "$W/workspace/dataAssets/.kata"
ls -la "$W/workspace/dataAssets/.kata/repos/customltem" | head -3
```

Expected：软链生效，能列出 `customltem` 下源仓库。

- [ ] **Step 4: 对三个源仓库目标分支只读取最新（最新代码纪律）**

```bash
R="$ROOT/workspace/dataAssets/.kata/repos/customltem"
git -C "$R/dt-insight-studio"   fetch origin dataAssets/release_6.3.x_ltqc
git -C "$R/dt-center-assets"    fetch origin release_6.3.x_ltqc
git -C "$R/dt-center-metadata"  fetch origin release_6.3.x_ltqc
for d in dt-insight-studio dt-center-assets dt-center-metadata; do
  echo "$d: $(git -C "$R/$d" rev-parse --short "origin/${d/dt-insight-studio/dataAssets\/release_6.3.x_ltqc}" 2>/dev/null || echo '见下')"
done
```

Expected：fetch 成功（只更新 remote-tracking，不动工作树）。reader agent 以 `origin/<branch>` 为准读代码，汇报标注 commit + 日期。若网络不可达，记录阻塞并在变更摘要声明「依据 X 时间快照」。

- [ ] **Step 5: 提示用户关闭 XMind 应用**

回写 `cases.xmind` 前，`cases.xmind` 不能被 XMind 桌面应用占用。在批次落盘前向用户确认应用已关闭（见各批 sync 步骤）。本步骤仅登记该约束，不阻塞前序工作。

---

## Task 1：工具链（解析 / 审计 / 补丁，TDD）

**Files:**
- Create: `$FEAT/.process/tools/parse_xmind.py`
- Create: `$FEAT/.process/tools/audit_sync.py`
- Create: `$FEAT/.process/tools/xmind_patch.py`

> 在 worktree 内操作；`$FEAT` 经 `.kata` 无关（feature 目录是 tracked 的，worktree 内直接可写）。

- [ ] **Step 1: 写 `parse_xmind.py`（xmind → 用例模型 JSON）**

```python
#!/usr/bin/env python3
"""解析 cases.xmind，输出用例模型：[{module, submodule, title, priority, notes, steps:[{step,expected}]}]"""
import zipfile, json, sys

def priority(markers):
    for m in markers:
        mid = m.get('markerId', '')
        if mid.startswith('priority-'):
            return 'P' + mid.split('-')[1]
    return None

def parse(path):
    with zipfile.ZipFile(path) as z:
        content = json.loads(z.read('content.json'))
    req = content[0]['rootTopic']['children']['attached'][0]
    cases = []
    def walk(node, module, submodule):
        if 'title' not in node:
            return
        p = priority(node.get('markers', []))
        if p:
            steps = []
            for s in node.get('children', {}).get('attached', []):
                if 'title' not in s:
                    continue
                exp = s.get('children', {}).get('attached', [])
                steps.append({'step': s['title'],
                              'expected': exp[0]['title'] if exp and 'title' in exp[0] else ''})
            cases.append({'module': module, 'submodule': submodule,
                          'title': node['title'], 'priority': p,
                          'notes': node.get('notes', {}).get('plain', {}).get('content', '').strip(),
                          'steps': steps})
        else:
            for c in node.get('children', {}).get('attached', []):
                walk(c, module, node['title'] if module else None)
    for mod in req.get('children', {}).get('attached', []):
        if 'title' in mod:
            for c in mod.get('children', {}).get('attached', []):
                walk(c, mod['title'], None if priority(c.get('markers', [])) else c.get('title'))
    return cases

if __name__ == '__main__':
    print(json.dumps(parse(sys.argv[1]), ensure_ascii=False, indent=2))
```

- [ ] **Step 2: 跑 `parse_xmind.py` 验证基线 525 例**

```bash
cd "$WT" && python3 "$FEAT/.process/tools/parse_xmind.py" "$FEAT/cases.xmind" | python3 -c "import json,sys; d=json.load(sys.stdin); print('total', len(d)); from collections import Counter; print(Counter(c['module'] for c in d))"
```

Expected：`total 525`，数据质量 94。与设计 spec 现状表一致即通过。

- [ ] **Step 3: 写 `audit_sync.py`（archive↔xmind 6 维一致性）**

```python
#!/usr/bin/env python3
"""archive.md 与 cases.xmind 6 维一致性审计：数量/优先级/标题/前置/步骤/预期。退出码 0=一致，1=不一致。"""
import re, sys, json
from parse_xmind import parse  # 同目录

def parse_archive(path):
    lines = open(path, encoding='utf-8').read().split('\n')
    cases, mod, sub = [], None, None
    i = 0
    while i < len(lines):
        l = lines[i].rstrip()
        m3 = re.match(r'^### (.+)', l)
        m4 = re.match(r'^#### (.+)', l)
        m5 = re.match(r'^##### 【(P\d)】(.+)', l)
        if m3: mod = m3.group(1).strip(); sub = None
        elif m4: sub = m4.group(1).strip()
        elif m5:
            p, title = m5.group(1), m5.group(2).strip()
            precond, steps, j = '', [], i + 1
            in_tbl = False
            while j < len(lines):
                ll = lines[j].rstrip()
                if ll.startswith(('##### ', '#### ', '### ')): break
                if ll.strip() == '> 前置条件':
                    k = j + 1
                    while k < len(lines) and not lines[k].strip().startswith('```'): k += 1
                    k += 1; buf = []
                    while k < len(lines) and not lines[k].strip().startswith('```'):
                        buf.append(lines[k].rstrip()); k += 1
                    precond = '\n'.join(buf)
                if ll.startswith('| 编号'): in_tbl = True; j += 2; continue
                if in_tbl and ll.startswith('|'):
                    parts = [x.strip() for x in ll.split('|')]
                    if len(parts) >= 4: steps.append({'step': parts[2], 'expected': parts[3]})
                elif in_tbl: in_tbl = False
                j += 1
            cases.append({'module': mod, 'submodule': sub, 'title': title,
                          'priority': p, 'notes': precond, 'steps': steps})
            i = j; continue
        i += 1
    return cases

def norm(s): return re.sub(r'\s+', ' ', (s or '').replace('<br>', '\n').strip())

def audit(archive_path, xmind_path, scope_module=None):
    a = parse_archive(archive_path)
    x = parse(xmind_path)
    if scope_module:
        a = [c for c in a if c['module'] == scope_module]
        x = [c for c in x if c['module'] == scope_module]
    errs = []
    if len(a) != len(x): errs.append(f'数量: archive={len(a)} xmind={len(x)}')
    ax = {(c['module'], c['title']): c for c in a}
    xx = {(c['module'], c['title']): c for c in x}
    for k in set(ax) ^ set(xx):
        errs.append(f'标题不匹配: {k}')
    for k in set(ax) & set(xx):
        ca, cx = ax[k], xx[k]
        if ca['priority'] != cx['priority']: errs.append(f'{k[1]}: 优先级 {ca["priority"]} vs {cx["priority"]}')
        if norm(ca['notes']) != norm(cx['notes']): errs.append(f'{k[1]}: 前置不一致')
        if len(ca['steps']) != len(cx['steps']): errs.append(f'{k[1]}: 步骤数 {len(ca["steps"])} vs {len(cx["steps"])}')
        else:
            for n, (sa, sx) in enumerate(zip(ca['steps'], cx['steps']), 1):
                if norm(sa['step']) != norm(sx['step']) or norm(sa['expected']) != norm(sx['expected']):
                    errs.append(f'{k[1]}: 步骤{n}不一致')
    return errs

if __name__ == '__main__':
    scope = sys.argv[3] if len(sys.argv) > 3 else None
    errs = audit(sys.argv[1], sys.argv[2], scope)
    if errs:
        print(f'FAIL ({len(errs)}):'); [print(' -', e) for e in errs[:50]]; sys.exit(1)
    print('PASS'); sys.exit(0)
```

- [ ] **Step 4: 跑 `audit_sync.py` 验证当前 archive↔xmind 一致**

```bash
cd "$WT/$FEAT/.process/tools" && python3 audit_sync.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind"
```

Expected：`PASS`（当前已同步）。若 FAIL，说明同步基线有漂移，先修 archive 再继续。

- [ ] **Step 5: 写 `xmind_patch.py`（以 archive 为准重建指定模块子树）**

只重建 archive 中指定模块（默认「数据质量」）的子树，**其余 6 模块 node 对象一字节不碰**（它们的 id/折叠/labels 自然全保留）。DQ 模块内全用新 id、不保 DQ 内折叠态——纯 cosmetic，内容由 `audit_sync` 兜底；避免按标题复用 id 导致重复步骤文案产生 id 冲突。

```python
#!/usr/bin/env python3
"""以 archive.md 为准，重建 cases.xmind 中指定模块(默认数据质量)的子树，其余模块原样保留。
用法: python3 xmind_patch.py <archive.md> <cases.xmind> [模块名=数据质量]"""
import zipfile, json, sys, os, hashlib
from collections import OrderedDict
sys.path.insert(0, os.path.dirname(__file__))
from audit_sync import parse_archive

_ctr = [0]
def new_id():
    _ctr[0] += 1
    return hashlib.md5(f'dqrev-{_ctr[0]}'.encode()).hexdigest()

def mk_case(case):
    node = {'id': new_id(), 'title': case['title'],
            'markers': [{'markerId': 'priority-' + case['priority'][1:]}]}
    if case['notes']:
        node['notes'] = {'plain': {'content': case['notes']},
                         'realHTML': {'content': '<div>' + case['notes'].replace('\n', '<br/>') + '</div>'}}
    steps = []
    for s in case['steps']:
        sn = {'id': new_id(), 'title': s['step']}
        if s['expected']:
            sn['children'] = {'attached': [{'id': new_id(), 'title': s['expected']}]}
        steps.append(sn)
    if steps:
        node['children'] = {'attached': steps}
    return node

def rebuild_module(module_node, archive_cases):
    """按 archive 的 子模块>用例 顺序重建该模块 children；无子模块的用例直接挂模块下。"""
    subs = OrderedDict()
    for c in archive_cases:
        subs.setdefault(c['submodule'], []).append(c)
    attached = []
    for sub, cases in subs.items():
        case_nodes = [mk_case(c) for c in cases]
        if sub:
            attached.append({'id': new_id(), 'title': sub, 'children': {'attached': case_nodes}})
        else:
            attached.extend(case_nodes)
    module_node['children'] = {'attached': attached}

def main(archive_path, xmind_path, module='数据质量'):
    cases = [c for c in parse_archive(archive_path) if c['module'] == module]
    with zipfile.ZipFile(xmind_path) as z:
        members = {n: z.read(n) for n in z.namelist() if not n.endswith('/')}
    content = json.loads(members['content.json'])
    req = content[0]['rootTopic']['children']['attached'][0]
    target = next(m for m in req['children']['attached'] if m.get('title') == module)
    rebuild_module(target, cases)
    members['content.json'] = json.dumps(content, ensure_ascii=False).encode('utf-8')
    with zipfile.ZipFile(xmind_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for n, data in members.items():
            z.writestr(n, data)
    print(f'patched module={module} cases={len(cases)}')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '数据质量')
```

> 关键不变量：只替换目标模块 node 的 `children`，其余模块 node 对象未触碰；新 id 经 `new_id()` 计数器保证全局唯一；`audit_sync` 是兜底 gate。批次1 sync 首次跑通后即可放量。

- [ ] **Step 6: 提交工具链**

```bash
cd "$WT"
git add "$FEAT/.process/tools/parse_xmind.py" "$FEAT/.process/tools/audit_sync.py" "$FEAT/.process/tools/xmind_patch.py"
git commit -m "chore: 🧹 add dq case-review tooling (parse/audit/patch)"
```

Expected：提交成功。`xmind_patch.py` 的完整回写逻辑在批次1 sync 步骤里跑通验证（gate = audit PASS）。

---

## Task 2：批次1 — golden 规则任务类 47 例（地基）

**Files:**
- Create: `$FEAT/.process/baselines/batch1-rule-task.md`（源码基线）
- Modify: `$FEAT/archive.md`（DQ「规则集管理&规则任务管理&校验结果查询」段，补 `#### 子模块` 并逐条调整）
- Modify: `$FEAT/cases.xmind`、`$FEAT/dq-review-change-summary.md`

范围：节点「规则集管理&规则任务管理&校验结果查询」47 例 = golden 45（空值数#3 ~ 多表字段值对比#47）+ 非 golden 2（运行超时、查看日志）。

- [ ] **Step 1: 派 reader agent 建源码字段基线**

用 Agent 工具（subagent_type: Explore 或 general-purpose），prompt：

```
只读分析，不改任何文件。先对源仓库取最新：
  git -C workspace/dataAssets/.kata/repos/customltem/dt-insight-studio fetch origin dataAssets/release_6.3.x_ltqc
  git -C workspace/dataAssets/.kata/repos/customltem/dt-center-assets fetch origin release_6.3.x_ltqc
以 origin/<branch> 为准读代码。目标：为「数据质量-规则集管理/规则任务管理/校验结果查询」建表单字段基线。
产出 markdown 写到 $FEAT/.process/baselines/batch1-rule-task.md，含：
1. 新建规则集向导各步表单字段/按钮逐字文案（数据源、数据库、数据表、规则集描述、规则包名称、下一步等）
2. 「新增规则包」「新增规则」入口按钮文案与位置
3. 各校验大类→子规则的枚举：完整性(字段级:空值数/空值率/空串数/空串率/字段取值/key范围；单表:表行数；多表:行数对比/内容对比)、有效性(数值取值范围/格式:身份证/手机号/邮箱/日期date/datetime/json/自定义正则；字符串长度;数据精度;枚举值)、唯一性(重复数/重复率/多表唯一性)、统计性(IQR离群点数量/占比;Z-score)、自定义SQL(7类)、一致性(多表比对)、时效性(周期性/及时性)、合理性(变化趋势单调增减;字段值计算对比;多表字段值对比)
4. 校验方法/运算符枚举（固定值/百分比;= != >= <= < > 包含/不包含/in/not in）、强弱规则、过滤条件、规则描述字段
5. 规则任务向导：监控对象(数据源/库/表/分区)、监控规则(引用规则包/规则类型)、调度属性(调度周期/规则拼接包/实例生成方式/超时时间/告警/报告配置)
6. 校验结果查询：实例详情字段（校验通过/不通过、实际值、期望值、不达标明细）
每条标注源码文件路径与所依据 commit + 日期。读 knowledge pitfalls（规则名50字限制/旧规则函数清单/规则类型前置）并纳入。
返回基线文件路径与关键约束摘要。
```

Expected：基线文件落盘，覆盖上述 6 类字段，每项有源码依据。

- [ ] **Step 2: 派 implementer agent 改写 47 例 archive 段**

用 Agent 工具（general-purpose），prompt（嵌入设计 spec 第 5/7 节标准）：

```
读 $FEAT/.process/baselines/batch1-rule-task.md（源码基线，唯一字段事实来源）、
设计 spec docs/superpowers/specs/2026-06-10-dq-case-review-design.md 第5节(7维标准)、第7节(分类调整规则)、
.claude/prompt/_shared/case-qa.md + case-format-sample.md(格式)。
任务：调整 archive.md 中 DQ「规则集管理&规则任务管理&校验结果查询」47 例。

结构：把该段整成 ### 数据质量 / #### 规则集管理&规则任务管理&校验结果查询 / ##### 用例 三层。

golden 45 重构（逐条甄别）：
- 默认：前置改为「已存在规则集（关联表: ${table_name}）」+ 保留该规则对应的建表/数据准备(pass与fail各自分区/数据)；
  步骤改为「进入该规则集→点『新增』加规则包→配置子规则(字段/统计函数/校验方法/期望值/强弱/规则描述)→保存→新建规则任务引入该子规则→执行→校验结果查询断言实际值/期望值/明细」。
- 例外（保留完整建表+数据，不可简化）：多表数据/内容对比、自定义SQL各类、时效性(周期性/及时性,时间窗)、合理性-数据变化趋势(多分区单调序列)。
- 非 golden 2 例（运行超时、查看日志）：按源码实际行为校正字段与预期。

7维硬约束：标题三段式;前置可执行可核对(SQL注释块+${SchemaA}/${table_name},不用SELECT 1/泛泛占位);步骤=单页面动作且按钮/字段/枚举逐字匹配基线;预期1)2)编号含保存+回显;规则描述必填;业务括号原样保留;SourceRef不入正文。

去重/合并/补漏：发现重复测试点或明显未覆盖核心规则类型时，重大增删先在 dq-review-change-summary.md 列「待用户点头」清单、本任务内不擅自删；小修直接做。

每条用例在 dq-review-change-summary.md 追加一行：用例名 | 改动类型 | 改了什么 | 为什么 | 源码依据(文件:commit)。
只改 archive.md 的该段 + change-summary，不碰 xmind。返回改动条数与 pending 清单。
```

Expected：archive.md 该段调整完成，change-summary 有 47 条记录 + pending 清单（若有）。

- [ ] **Step 3: spec review（主会话机械检查）**

读 `.claude/skills/case-draft/prompts/agent-spec-reviewer.md` 的机械检查口径，核对该 47 例：标题三段式、前置非占位、步骤单页面、枚举逐字匹配基线、优先级 marker 合法、业务括号保留、SourceRef 未泄漏。发现问题打回 Step 2 修复并重审，不跳过。

Expected：spec review 全过；记录核对项与结论。

- [ ] **Step 4: quality review（fresh subagent 内容审查）**

派新 subagent，prompt：

```
读 $FEAT/archive.md 的 DQ「规则集管理&规则任务管理&校验结果查询」47 例 + 基线 batch1-rule-task.md。
审查内容质量：前置是否可读可准备、步骤是否清晰可执行、预期是否明确可断言、pass/fail 数据是否自洽、
golden 例外是否误简化(多表/自定义SQL/时效性/趋势类必须保留完整准备)、与基线字段是否逐字一致。
列出每条不达标项与修复建议。不改文件，只返回审查清单。
```

发现问题打回 Step 2 修复并重审。

Expected：quality review 全过或问题已修复闭环。

- [ ] **Step 5: 同步 xmind + 6维 gate + commit**

先确认用户已关闭 XMind 应用（Task 0 Step 5 约束）。

```bash
cd "$WT/$FEAT/.process/tools"
python3 xmind_patch.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind"   # 定点回写
python3 audit_sync.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind" 数据质量   # 6维一致性 gate
```

Expected：audit `PASS`。若 FAIL：把 archive 回滚到本批前状态（`git checkout -- archive.md` 或临时副本），在 change-summary 标 `failed_xmind_sync`，修 patch 后重跑，不带病落盘。更新 frontmatter `case_count`。

```bash
cd "$WT"
git add "$FEAT/archive.md" "$FEAT/cases.xmind" "$FEAT/dq-review-change-summary.md" "$FEAT/.process/baselines/batch1-rule-task.md"
git commit -m "refactor: ✨ review and adjust DQ rule-task cases (batch 1/3)"
```

---

## Task 3：批次2 — 数据质量报告 15 + 通用配置 10（复用批次1数据）

**Files:**
- Create: `$FEAT/.process/baselines/batch2-report-config.md`
- Modify: `$FEAT/archive.md`（报告/通用配置段）、`cases.xmind`、`dq-review-change-summary.md`

- [ ] **Step 1: 派 reader agent 建基线**

prompt 同 Task 2 Step 1 的取最新+只读约束，目标改为：
```
为「数据质量-数据质量报告」「数据质量-通用配置(含报告关联维表设置)」建表单字段基线，写到
$FEAT/.process/baselines/batch2-report-config.md。含：报告列表/详情/生成/订阅字段；维表设置(车辆数统计字段/车系/车型/动力类型关联字段等)表单文案；
与「规则集/规则任务/校验结果」联动的数据入口(报告数据来源=已执行的规则任务实例)。每项标源码路径+commit。
```

- [ ] **Step 2: 派 implementer agent 改写 25 例**

prompt 同 Task 2 Step 2 的标准(7维+spec)，差异点：
```
范围：archive.md DQ「数据质量报告」15 + 「通用配置」10，整成三层结构。
复用约束（设计 spec 第7节）：前置直接引用批次1产出的规则任务名/校验实例/结果数据作为测试数据，不另造表/规则任务；
报告关联维表设置直接引用已有数据作步骤。批次1的具体表名/任务名以 batch1 change-summary 记录为准，保持一致。
每条记入 dq-review-change-summary.md。只改对应段 + change-summary。
```

- [ ] **Step 3: spec review** — 同 Task 2 Step 3，范围 25 例；额外核对前置确实复用批次1数据（无新造表/任务）。

- [ ] **Step 4: quality review** — 同 Task 2 Step 4 fresh subagent，范围 25 例；额外核对报告/配置与批次1数据联动自洽。

- [ ] **Step 5: 同步 xmind + 6维 gate + commit**

```bash
cd "$WT/$FEAT/.process/tools"
python3 xmind_patch.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind"
python3 audit_sync.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind" 数据质量
cd "$WT" && git add "$FEAT/archive.md" "$FEAT/cases.xmind" "$FEAT/dq-review-change-summary.md" "$FEAT/.process/baselines/batch2-report-config.md"
git commit -m "refactor: ✨ review and adjust DQ report & config cases (batch 2/3)"
```

Expected：audit `PASS` 后提交。

---

## Task 4：批次3 — 规则库配置 10 + 总览 6 + 项目管理 6（独立）

**Files:**
- Create: `$FEAT/.process/baselines/batch3-misc.md`
- Modify: `$FEAT/archive.md`（规则库/总览/项目段）、`cases.xmind`、`dq-review-change-summary.md`

- [ ] **Step 1: 派 reader agent 建基线**

prompt 同 Task 2 Step 1 约束，目标：
```
为「数据质量-规则库配置」「数据质量-总览」「数据质量-项目管理」建基线，写到
$FEAT/.process/baselines/batch3-misc.md。含：规则库配置字段/规则分类/权限控制;总览各统计卡片口径(概览统计/校验异常top/规则库分布/近7日分析/有效性统计);项目管理字段/权限。
重点标注总览统计来源(与规则任务/校验结果的联动口径)。每项标源码路径+commit。
```

- [ ] **Step 2: 派 implementer agent 改写 22 例**

prompt 同 Task 2 Step 2 标准，差异点：
```
范围：archive.md DQ「规则库配置」10 +「总览」6 +「项目管理」6，整成三层结构。
重点：总览统计类用例的预期需与规则任务产生的数据联动一致(口径引基线);规则库/项目管理按源码校正字段/权限。
每条记入 dq-review-change-summary.md。只改对应段 + change-summary。
```

- [ ] **Step 3: spec review** — 同 Task 2 Step 3，范围 22 例。
- [ ] **Step 4: quality review** — 同 Task 2 Step 4 fresh subagent，范围 22 例；额外核对总览统计口径与上游数据一致。
- [ ] **Step 5: 同步 xmind + 6维 gate + commit**

```bash
cd "$WT/$FEAT/.process/tools"
python3 xmind_patch.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind"
python3 audit_sync.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind" 数据质量
cd "$WT" && git add "$FEAT/archive.md" "$FEAT/cases.xmind" "$FEAT/dq-review-change-summary.md" "$FEAT/.process/baselines/batch3-misc.md"
git commit -m "refactor: ✨ review and adjust DQ rule-lib/overview/project cases (batch 3/3)"
```

---

## Task 5：全量自检与交付（不合入 main）

- [ ] **Step 1: DQ 全模块 6维一致性终检**

```bash
cd "$WT/$FEAT/.process/tools"
python3 audit_sync.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind" 数据质量
python3 audit_sync.py "$WT/$FEAT/archive.md" "$WT/$FEAT/cases.xmind"   # 全 525 例不退化
```

Expected：两次均 `PASS`；其余 6 模块（431 例）未被误改。frontmatter `case_count` 与实际一致。

- [ ] **Step 2: 复核 change-summary 与 pending 清单**

确认 `dq-review-change-summary.md` 覆盖本轮所有改动条目，「重大增删待用户点头」清单完整、未擅自执行。

- [ ] **Step 3: 交付（停在此，不 merge / 不 push）**

记下 worktree HEAD SHA。向用户回报：worktree 路径、三批 commit SHA、改动统计、pending 清单、未经平台核对项（若有）、archive/xmind/change-summary 路径。**明确不 merge、不 push，等用户确认。**

```bash
cd "$WT" && git log --oneline main..HEAD
git -C "$WT" rev-parse HEAD
```

- [ ] **Step 4:（用户确认后才执行）合入 main + 清理**

> 此步骤需用户在交付后明确说「合入」才执行，不在本轮自动进行。

```bash
cd /Users/poco/Projects/kata
git merge --no-ff <worktree-HEAD-sha>
python3 ".../audit_sync.py" ...   # 合并后复检
git push origin main
git worktree remove .worktrees/dq-case-review
```

---

## 验证清单（每批 gate 汇总）

- archive↔xmind 6维一致性：`audit_sync.py … 数据质量` 必 `PASS`
- 全量不退化：`audit_sync.py …`（525）必 `PASS`
- spec review（机械）+ quality review（内容）两阶段均过
- 字段/枚举/按钮逐字匹配该批源码基线
- golden 例外未被误简化（多表/自定义SQL/时效性/趋势类保留完整准备）
- 重大增删进 pending 清单待用户点头，未擅自执行
- 全程 detached worktree，不 merge / 不 push（除非用户确认）

