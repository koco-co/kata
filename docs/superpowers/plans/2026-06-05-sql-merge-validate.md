# sql-merge-validate skill 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个一次性 skill，输入质量任务标识 + 预期描述，自动校验该任务所有规则包生成 SQL 的合并正确性，终端逐包给结论，失败可联动 defect-analyze。

**Architecture:** 自包含 Python 脚本流水线（fetch → db_metadata → sql_extractor → expectation → comparator → run 编排），确定性提取 SQL 结构事实并三方比对（期望分组 vs DB merge_group_key vs 实际 SQL）；SKILL.md 驱动 AskUser 取参、跑脚本、模型读 verdict 做语义复核与终端报告。不产出文件，脚本只读、中间产物落 /tmp。

**Tech Stack:** Python 3（stdlib：`urllib`/`json`/`re`）+ `pymysql`（连库，已实测可过 `mysql_native_password`）。**不加任何项目 Bun 依赖**；测试用纯 assert Python 文件，`python3` 直接跑。

参考 spec：[docs/superpowers/specs/2026-06-05-sql-merge-validate-design.md](../specs/2026-06-05-sql-merge-validate-design.md)

---

## 文件结构

```
.claude/skills/sql-merge-validate/
  SKILL.md                       # 驱动：AskUser 取参 → 跑 run.py → 模型读 verdict 报告 + bug 联动
  scripts/
    fetch_dq.py                  # dq: packagelist + 逐包 packagesql → packages.json
    db_metadata.py               # dq: assets_dq_monitor_rule；std: metadata_standard_table_check_package
    sql_extractor.py             # 解析单包 SQL 字符串 → 结构事实
    expectation.py               # 按合并键算期望分组
    comparator.py                # 三方比对 → 逐包 7 维 verdict + 子检查 + finding
    run.py                       # 编排：组装所有输入 → 打印 verdict JSON 到 stdout
    common.py                    # 共享：JSON IO、DB 连接、function 字典常量
    tests/
      fixtures/
        pkg_4622.sql             # 真实：合并组(弱)+抽样+脏数据，含 have_dirty=0 的 fn12
        pkg_4623.sql             # 真实：合并组(强)
        pkg_4624.sql             # 真实：不可合并对(fn34/fn47)走 union 段
      test_sql_extractor.py
      test_expectation.py
      test_comparator.py
  references/
    rule-dictionary.md           # function_id → 名称/类型/have_dirty/可合并/占比 语义
    merge-rules.md               # 合并键、白名单、分包算法、STACK/explode/抽样范式
    std-check-merge.md           # 落标校验项白名单 + 多车型 OR + check_columns 结构
```

## 数据契约（脚本间 JSON）

**packages.json**（fetch 输出）
```json
{"mode":"dq","taskId":"4471",
 "packages":[{"packageId":4622,"packageName":"规则包1","sql":"<整段SQL>"}]}
```

**metadata.json**（db_metadata 输出）
```json
{"rules":[{"ruleId":13019,"functionId":4,"strength":2,"column":"id,age",
           "filter":"{...}","mergeGroupKey":"eUvlyF1G","isPercentage":1,
           "packageId":4622,"haveDirty":1,"mergeable":true}],
 "functions":{"4":{"nameEn":"null_percent","type":1,"haveDirty":1,"mergeable":true}}}
```

**facts.json**（sql_extractor 输出，单包）
```json
{"packageId":4622,
 "hasRand":true,"sampleBaseTable":"test_info_1","partitionPred":"dt='2026-06-04'",
 "mergeBlocks":[{"fromTable":"test_info_1_temp_sample_table_#{jobId}","fromCount":1,
                 "whereFilter":"id <= 100",
                 "sumRuleIds":[13036,13035,13034,13020,13019],
                 "stackArity":5,"stackRuleIds":[13036,13035,13034,13020,13019]}],
 "unionSegments":[{"ruleId":13032,"fromTable":"...","dirtyTable":"dq_monitor_#{jobId}_13032"}],
 "dirtyExplodeRuleIds":[13036,13034,13020,13019],
 "dirtyTables":["dq_monitor_#{jobId}_13036","dq_monitor_#{jobId}_13034",
                "dq_monitor_#{jobId}_13020","dq_monitor_#{jobId}_13019"]}
```

**verdict.json**（comparator 输出）
```json
{"taskId":"4471","mode":"dq","packageCount":9,"ruleCount":42,
 "packages":[{"packageId":4622,
   "checks":{"mergeable_merged":"PASS","unmergeable_unmerged":"PASS","strength_split":"PASS",
             "sampling":"PASS","partition":"PASS","filter_boundary":"PASS","packaging":"PASS"},
   "subchecks":{"have_dirty_excluded":"PASS","percentage_semantics":"NA"},
   "findings":[],
   "evidence":[{"check":"...","ruleId":...,"expected":"...","actual":"...","sqlSnippet":"..."}]}],
 "globalFindings":[{"type":"whitelist_divergence","functionId":26,"note":"fn26 实际合并但不在文档白名单"}]}
```

---

### Task 0: 脚手架 + 真实 fixture + 知识库

**Files:**
- Create: `.claude/skills/sql-merge-validate/scripts/common.py`
- Create: `.claude/skills/sql-merge-validate/scripts/tests/fixtures/pkg_4622.sql`, `pkg_4623.sql`, `pkg_4624.sql`
- Create: `.claude/skills/sql-merge-validate/references/rule-dictionary.md`, `merge-rules.md`, `std-check-merge.md`

- [ ] **Step 1: 建目录**

Run:
```bash
mkdir -p .claude/skills/sql-merge-validate/scripts/tests/fixtures
mkdir -p .claude/skills/sql-merge-validate/references
```

- [ ] **Step 2: 落真实 fixture（从今天已抓的 /tmp 捕获提取 data 字段）**

Run:
```bash
cd .claude/skills/sql-merge-validate/scripts/tests/fixtures
for p in 4622 4623 4624; do
  python3 -c "import json;open('pkg_$p.sql','w').write(json.load(open('/tmp/pkgsql_$p.json'))['data'])"
done
wc -l pkg_4622.sql pkg_4623.sql pkg_4624.sql
```
Expected: 三个文件非空。若 /tmp 捕获已不在，用 spec §5.1 的 curl 重抓 `packagesql`（packageId 4622/4623/4624）再提取。

- [ ] **Step 3: 写 common.py（DB 连接 + function 字典常量 + JSON IO）**

```python
"""共享工具：DB 连接、function 字典、JSON 读写。一次性 skill，自包含无共享依赖。"""
import json, sys

# function_id → 元信息。mergeable 取「文档白名单 ∪ 实测经验集」，type 注释见 references/rule-dictionary.md
# 文档白名单: {1,3,4,5,6,11,12,13,14,15,16,17,20,21,25,30,49}；实测另见 fn26 合并（白名单分歧，作 finding）
DOC_WHITELIST = {1, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16, 17, 20, 21, 25, 30, 49}
# have_dirty=0 的函数（合并算 val 但不进脏数据）：实测 fn1/12/20/21
NO_DIRTY_FUNCTIONS = {1, 12, 20, 21}

def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def dump_json(obj):
    json.dump(obj, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")

def connect_db(host, port, user, password, database="assets"):
    import pymysql  # 需 `pip install pymysql`（纯 Python，支持 mysql_native_password）
    return pymysql.connect(host=host, port=int(port), user=user,
                           password=password, database=database, connect_timeout=8)
```

- [ ] **Step 4: 写 references/rule-dictionary.md**

内容：从 `assets_dq_function`（id/name_en/type/have_dirty）+ 方案第 7 节规则表，整理成
表格：`function_id | 中文名 | 英文名 | type | have_dirty | 可合并 | 占比 | 模板SQL要点`。
覆盖 fn1–fn51。标注 have_dirty=0 的 1/12/20/21；标注占比类 4/6/13/14/15/49 等。

- [ ] **Step 5: 写 references/merge-rules.md**

内容：合并键定义（同源表+同标准化filter+同强弱+function∈白名单，与字段无关，组内≥2）；
可合并白名单 + fn26 分歧说明；分包算法（packageCount=1/2/total 特殊处理 + merge 优先 unable 补）；
合并 SQL 范式（`SUM(CASE WHEN) → STACK(N,...) → val,rule_id,expansion`）；脏数据 explode 范式；
抽样范式（`_temp_sample_table_#{jobId}` + `ROW_NUMBER() OVER(... ORDER BY rand()) rn<=N`）；
占比 expansion = `CONCAT(hit,'/',total)`。

- [ ] **Step 6: 写 references/std-check-merge.md**

内容：落标校验项白名单（数据长度/精度/空值/取值范围 可合并；是否重复 不可）；多车型 OR
分支 `(cond AND 车型1) OR (cond AND 车型2)`；`check_columns` JSON 结构；落标 SQL 存
`metadata_standard_table_check_package.sql_text`，无 merge_group_key。

- [ ] **Step 7: 提交**

```bash
git add .claude/skills/sql-merge-validate
git commit -m "chore: 🧹 scaffold sql-merge-validate skill with fixtures and references"
```

---

### Task 1: sql_extractor.py（核心，TDD）

**Files:**
- Create: `.claude/skills/sql-merge-validate/scripts/sql_extractor.py`
- Test: `.claude/skills/sql-merge-validate/scripts/tests/test_sql_extractor.py`

- [ ] **Step 1: 写失败测试（断真实 fixture 4622 的已知结构事实）**

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from sql_extractor import extract_facts

HERE = os.path.dirname(__file__)
def sql(name): return open(os.path.join(HERE, "fixtures", name), encoding="utf-8").read()

def test_4622_sampling_and_merge():
    f = extract_facts(sql("pkg_4622.sql"), package_id=4622)
    assert f["hasRand"] is True
    assert f["sampleBaseTable"] == "test_info_1"
    assert "dt='2026-06-04'" in f["partitionPred"]
    assert len(f["mergeBlocks"]) == 1
    b = f["mergeBlocks"][0]
    assert b["fromCount"] == 1
    assert sorted(b["stackRuleIds"]) == [13019, 13020, 13034, 13035, 13036]
    assert b["stackArity"] == 5
    # have_dirty=0 的 fn12(rule 13035) 不进脏数据
    assert sorted(f["dirtyExplodeRuleIds"]) == [13019, 13020, 13034, 13036]

def test_4624_unmergeable_union_segments():
    f = extract_facts(sql("pkg_4624.sql"), package_id=4624)
    seg_rule_ids = sorted(s["ruleId"] for s in f["unionSegments"])
    assert 13032 in seg_rule_ids and 13025 in seg_rule_ids
    assert f["mergeBlocks"] == []  # 无合并块

if __name__ == "__main__":
    test_4622_sampling_and_merge(); test_4624_unmergeable_union_segments()
    print("OK test_sql_extractor")
```

- [ ] **Step 2: 跑测试验证失败**

Run: `python3 .claude/skills/sql-merge-validate/scripts/tests/test_sql_extractor.py`
Expected: FAIL（`ModuleNotFoundError: sql_extractor` 或 `extract_facts` 未定义）。

- [ ] **Step 3: 写 sql_extractor.py（正则确定性解析）**

```python
"""把单包合并 SQL 字符串解析成结构事实。纯正则，确定性，无副作用。"""
import re

def extract_facts(sql_text, package_id):
    s = sql_text
    facts = {"packageId": package_id, "hasRand": bool(re.search(r"\brand\s*\(", s, re.I)),
             "sampleBaseTable": None, "partitionPred": "", "mergeBlocks": [],
             "unionSegments": [], "dirtyExplodeRuleIds": [], "dirtyTables": []}

    # 抽样表：<base>_temp_sample_table_#{jobId}
    m = re.search(r"`?(\w+?)_temp_sample_table_#\{jobId\}", s)
    if m:
        facts["sampleBaseTable"] = m.group(1)
        # 抽样表灌数的分区谓词：insert ... select ... from <base> where 1=1 <pred> ;
        fill = re.search(r"_temp_sample_table_#\{jobId\}`?\s+select.+?where\s+1=1\s*(.+?);", s, re.I | re.S)
        if fill:
            facts["partitionPred"] = fill.group(1).strip()

    # 合并块：含 hit_cnt_rule_<id> 聚合列 + 紧随的 LATERAL VIEW STACK(N, ...)
    for stack in re.finditer(r"LATERAL\s+VIEW\s+STACK\(\s*(\d+)\s*,(.+?)\)\s*stack_t", s, re.I | re.S):
        arity = int(stack.group(1))
        rule_ids = [int(x) for x in re.findall(r"hit_cnt_rule_(\d+)", stack.group(2))]
        # 该块的 from 表与 where：在 STACK 之前的文本里取最近一个 `from <表> where 1=1 ...`
        head = s[:stack.start()]
        from_table = ""
        where_filter = ""
        fr = list(re.finditer(r"from\s+`?(?:\w+`?\.`?)?([\w]+(?:_temp_sample_table_#\{jobId\})?)`?\s+where\s+1\s*=\s*1\s*(?:and)?\s*([^)]*)", head, re.I | re.S))
        if fr:
            from_table = fr[-1].group(1)
            where_filter = re.sub(r"\s+", " ", fr[-1].group(2)).strip().strip("()").strip()
        facts["mergeBlocks"].append({
            "fromTable": from_table, "fromCount": 1, "whereFilter": where_filter,
            "sumRuleIds": rule_ids, "stackArity": arity, "stackRuleIds": rule_ids})

    # 脏数据 explode：if(<cond>, '<id>', NULL) in array(...)
    for arr in re.finditer(r"explode\(\s*filter\(\s*array\((.+?)\)\s*,", s, re.I | re.S):
        facts["dirtyExplodeRuleIds"] += [int(x) for x in re.findall(r"if\(.+?,\s*'(\d+)'", arr.group(1))]
    facts["dirtyExplodeRuleIds"] = sorted(set(facts["dirtyExplodeRuleIds"]))

    # 脏表名 dq_monitor_#{jobId}_<key|id>
    facts["dirtyTables"] = sorted(set(re.findall(r"dq_monitor_#\{jobId\}_(\w+)", s)))

    # 不可合并 union 段：select ... <id> as rule_id ... FROM <table> WHERE <cond>，且不在 STACK 块内
    merged = set()
    for b in facts["mergeBlocks"]:
        merged |= set(b["stackRuleIds"])
    for seg in re.finditer(r"select\s+[^;]*?(\d+)\s+as\s+rule_id[^;]*?from\s+`?(?:\w+`?\.`?)?([\w#{}]+)`?\s+where", s, re.I | re.S):
        rid = int(seg.group(1))
        if rid not in merged:
            facts["unionSegments"].append({"ruleId": rid, "fromTable": seg.group(2),
                                           "dirtyTable": "dq_monitor_#{jobId}_%d" % rid})
    return facts
```

- [ ] **Step 4: 跑测试验证通过**

Run: `python3 .claude/skills/sql-merge-validate/scripts/tests/test_sql_extractor.py`
Expected: `OK test_sql_extractor`。若失败，按真实 fixture 调正则（fixture 是真值，不要改断言去迁就 bug）。

- [ ] **Step 5: 加 4623（强合并组）断言并复跑**

在测试加：
```python
def test_4623_strong_merge_block():
    f = extract_facts(sql("pkg_4623.sql"), package_id=4623)
    assert len(f["mergeBlocks"]) >= 1
    assert len(f["mergeBlocks"][0]["stackRuleIds"]) >= 2
```
在 `__main__` 追加调用。Run 同上，Expected PASS。

- [ ] **Step 6: 提交**

```bash
git add .claude/skills/sql-merge-validate/scripts/sql_extractor.py .claude/skills/sql-merge-validate/scripts/tests/test_sql_extractor.py
git commit -m "feat: 🧩 add deterministic SQL structure extractor with real fixtures"
```

---

### Task 2: db_metadata.py（取规则真值）

**Files:**
- Create: `.claude/skills/sql-merge-validate/scripts/db_metadata.py`
- Test: `.claude/skills/sql-merge-validate/scripts/tests/test_db_metadata.py`（连库冒烟，标注需网络）

- [ ] **Step 1: 写 db_metadata.py**

```python
"""取规则真值。dq: assets_dq_monitor_rule + assets_dq_function；std: metadata_standard_table_check_package。"""
import argparse, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import connect_db, dump_json, DOC_WHITELIST, NO_DIRTY_FUNCTIONS

def fetch_dq(conn, monitor_id, package_ids):
    cur = conn.cursor()
    cur.execute("""SELECT id, function_id, rule_strength, column_name, COALESCE(filter,''),
        COALESCE(merge_group_key,''), is_percentage, package_id
        FROM assets_dq_monitor_rule
        WHERE monitor_id=%s AND (is_deleted=0 OR is_deleted IS NULL)""", (monitor_id,))
    pid_set = set(int(p) for p in package_ids) if package_ids else None
    rules = []
    for rid, fn, strength, col, filt, mk, pct, pid in cur.fetchall():
        if pid_set is not None and pid not in pid_set:
            continue
        rules.append({"ruleId": rid, "functionId": fn, "strength": strength, "column": col,
                      "filter": filt, "mergeGroupKey": mk, "isPercentage": pct, "packageId": pid,
                      "haveDirty": 0 if fn in NO_DIRTY_FUNCTIONS else 1,
                      "mergeable": fn in DOC_WHITELIST})
    cur.execute("SELECT id, name_en, type, have_dirty FROM assets_dq_function")
    functions = {str(i): {"nameEn": n, "type": t, "haveDirty": hd,
                          "mergeable": i in DOC_WHITELIST} for i, n, t, hd in cur.fetchall()}
    return {"rules": rules, "functions": functions}

def fetch_std(conn, check_id):
    cur = conn.cursor()
    cur.execute("""SELECT id, package_name, COALESCE(sql_text,''), COALESCE(check_columns,'')
        FROM metadata_standard_table_check_package
        WHERE standard_table_check_id=%s AND (is_deleted=0 OR is_deleted IS NULL)""", (check_id,))
    packages = [{"packageId": pid, "packageName": name, "sql": sql, "checkColumns": cc}
                for pid, name, sql, cc in cur.fetchall()]
    return {"packages": packages}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["dq", "std"])
    ap.add_argument("--task-id", required=True)
    ap.add_argument("--package-ids", default="")  # 逗号分隔，dq 用
    ap.add_argument("--host", required=True); ap.add_argument("--port", default="30882")
    ap.add_argument("--user", default="root"); ap.add_argument("--password", required=True)
    a = ap.parse_args()
    conn = connect_db(a.host, a.port, a.user, a.password)
    pids = [p for p in a.package_ids.split(",") if p]
    out = fetch_dq(conn, a.task_id, pids) if a.mode == "dq" else fetch_std(conn, a.task_id)
    conn.close(); dump_json(out)
```

- [ ] **Step 2: 连库冒烟（需网络到 172.16.124.100:30882）**

Run:
```bash
python3 .claude/skills/sql-merge-validate/scripts/db_metadata.py --mode dq --task-id 4471 \
  --package-ids 4622,4623,4624 --host 172.16.124.100 --password '<DB_PASSWORD>' | python3 -c "import json,sys;d=json.load(sys.stdin);print('rules',len(d['rules']),'fn',len(d['functions']))"
```
Expected: 打印 `rules 17 fn 50`（4622+4623+4624 三包规则数）左右；fn 字典含 fn26 `mergeable:false`。
若网络不可达：跳过冒烟，标注「db_metadata 未连库验证」，由 run.py 的降级路径兜底。

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/sql-merge-validate/scripts/db_metadata.py .claude/skills/sql-merge-validate/scripts/common.py
git commit -m "feat: 🧩 add db metadata fetch for dq/std merge truth"
```

---

### Task 3: fetch_dq.py（dq 取合并 SQL）

**Files:**
- Create: `.claude/skills/sql-merge-validate/scripts/fetch_dq.py`

- [ ] **Step 1: 写 fetch_dq.py（stdlib urllib，无第三方依赖）**

```python
"""dq 模式：调 packagelist + 逐包 packagesql，输出 packages.json 到 stdout。"""
import argparse, json, ssl, sys, os, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from common import dump_json

def _post(base, path, cookie, project_id, body):
    req = urllib.request.Request(
        base.rstrip("/") + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json;charset=UTF-8", "Accept": "*/*",
                 "Accept-Language": "zh", "Cookie": cookie, "X-Valid-Project-ID": str(project_id)})
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return json.loads(r.read().decode())

def fetch(base, cookie, project_id, monitor_id):
    pl = _post(base, "/dassets/v1/valid/monitor/packagelist", cookie, project_id, {"monitorId": str(monitor_id)})
    if not pl.get("success"):
        raise SystemExit("packagelist 失败（cookie 失效？）: %s" % pl.get("message"))
    packages = []
    for p in pl["data"]:
        ps = _post(base, "/dassets/v1/valid/monitor/packagesql", cookie, project_id, {"packageId": str(p["packageId"])})
        packages.append({"packageId": int(p["packageId"]), "packageName": p.get("packageName", ""),
                         "sql": ps.get("data", "")})
    return {"mode": "dq", "taskId": str(monitor_id), "packages": packages}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True); ap.add_argument("--cookie", required=True)
    ap.add_argument("--project-id", required=True); ap.add_argument("--monitor-id", required=True)
    a = ap.parse_args()
    dump_json(fetch(a.base, a.cookie, a.project_id, a.monitor_id))
```

- [ ] **Step 2: 冒烟（cookie 来自用户，可能已失效）**

Run:
```bash
python3 .claude/skills/sql-merge-validate/scripts/fetch_dq.py --base http://shuzhan63-test-ltqc.k8s.dtstack.cn \
  --cookie "<用户 cookie>" --project-id 92 --monitor-id 4471 | python3 -c "import json,sys;d=json.load(sys.stdin);print('packages',len(d['packages']))"
```
Expected: `packages 9`。401/空 → 提示重取 cookie（spec §9）。

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/sql-merge-validate/scripts/fetch_dq.py
git commit -m "feat: 🧩 add dq packagelist/packagesql fetch via stdlib"
```

---

### Task 4: expectation.py（按合并键算期望分组）

**Files:**
- Create: `.claude/skills/sql-merge-validate/scripts/expectation.py`
- Test: `.claude/skills/sql-merge-validate/scripts/tests/test_expectation.py`

- [ ] **Step 1: 写失败测试**

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from expectation import normalize_filter, compute_expected

def test_normalize_filter_same_semantics():
    a = '{"conditionType":1,"conditions":[{"columnName":"id","operator":8,"threshold":"100"}]}'
    b = '{"conditions":[{"operator":8,"threshold":"100","columnName":"id"}],"conditionType":1}'
    assert normalize_filter(a) == normalize_filter(b)
    assert normalize_filter("") == normalize_filter(None) == ""

def test_compute_expected_groups_by_strength_filter_not_column():
    rules = [  # 同 filter F、同弱、不同字段 → 应合并；fn39 不可合并 → standalone
        {"ruleId": 1, "functionId": 5, "strength": 2, "filter": "F", "packageId": 10, "mergeable": True},
        {"ruleId": 2, "functionId": 30, "strength": 2, "filter": "F", "packageId": 10, "mergeable": True},
        {"ruleId": 3, "functionId": 39, "strength": 2, "filter": "F", "packageId": 10, "mergeable": False},
        {"ruleId": 4, "functionId": 5, "strength": 1, "filter": "F", "packageId": 10, "mergeable": True},  # 强，独一份
    ]
    exp = compute_expected(rules)
    g = exp[10]
    assert sorted(g["mergeGroups"][0]) == [1, 2]
    assert sorted(g["standalone"]) == [3, 4]  # fn39 不可合并 + 规则4 强规则独一份

if __name__ == "__main__":
    test_normalize_filter_same_semantics(); test_compute_expected_groups_by_strength_filter_not_column()
    print("OK test_expectation")
```

- [ ] **Step 2: 跑测试验证失败**

Run: `python3 .claude/skills/sql-merge-validate/scripts/tests/test_expectation.py`
Expected: FAIL（模块/函数未定义）。

- [ ] **Step 3: 写 expectation.py**

```python
"""按合并键（同源表[同包内]+同标准化filter+同强弱+function可合并，组内≥2）算每包期望分组。与字段无关。"""
import json

def normalize_filter(filt):
    if not filt:
        return ""
    try:
        return json.dumps(json.loads(filt), sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    except (ValueError, TypeError):
        return " ".join(str(filt).split())

def compute_expected(rules):
    """rules: db_metadata 的 rule 列表。返回 {packageId: {"mergeGroups":[[rid]], "standalone":[rid]}}"""
    by_pkg = {}
    for r in rules:
        by_pkg.setdefault(r["packageId"], []).append(r)
    out = {}
    for pid, rs in by_pkg.items():
        buckets = {}
        standalone = []
        for r in rs:
            if not r.get("mergeable"):
                standalone.append(r["ruleId"]); continue
            key = (r["strength"], normalize_filter(r.get("filter")))
            buckets.setdefault(key, []).append(r["ruleId"])
        merge_groups = []
        for rids in buckets.values():
            if len(rids) >= 2:
                merge_groups.append(sorted(rids))
            else:
                standalone.extend(rids)  # 桶内独一份退回不合并
        out[pid] = {"mergeGroups": merge_groups, "standalone": sorted(standalone)}
    return out
```

- [ ] **Step 4: 跑测试验证通过**

Run: `python3 .claude/skills/sql-merge-validate/scripts/tests/test_expectation.py`
Expected: `OK test_expectation`。

- [ ] **Step 5: 提交**

```bash
git add .claude/skills/sql-merge-validate/scripts/expectation.py .claude/skills/sql-merge-validate/scripts/tests/test_expectation.py
git commit -m "feat: 🧩 add expected merge grouping by strength+filter (column-independent)"
```

---

### Task 5: comparator.py（三方比对 → 7 维 verdict）

> **修正（用户选项 A，最终实现以 `scripts/comparator.py` 为准）**：①② 的分组真值改用 DB
> `merge_group_key`（非空且组内≥2=应合并；空 key=应独立），**不再用文档白名单 `compute_expected`
> 驱动 ①②**。fn26 这类「key 非空被合并」的规则：① 整组进块判 PASS，②（本包若无空 key 规则）判
> NA，**不误判 ②FAIL**；白名单分歧只走 globalFindings。③ 抽样：「扫抽样表」与「脏数据 rand()」是
> 独立信号，不可合并包（如 4624）扫抽样表但无 rand，记 PASS 不判 FAIL。下方初版代码块保留作演进
> 记录，真值见最终代码与 test_comparator.py 的 4 个用例（含 4622 fn26、4624 两个真实场景）。

**Files:**
- Create: `.claude/skills/sql-merge-validate/scripts/comparator.py`
- Test: `.claude/skills/sql-merge-validate/scripts/tests/test_comparator.py`

- [ ] **Step 1: 写失败测试（构造一个全 PASS 包 + 一个漏合 FAIL 包）**

```python
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from comparator import compare

META = {"rules": [
    {"ruleId": 1, "functionId": 5, "strength": 2, "filter": "F", "packageId": 10, "mergeGroupKey": "K", "mergeable": True, "haveDirty": 1},
    {"ruleId": 2, "functionId": 30, "strength": 2, "filter": "F", "packageId": 10, "mergeGroupKey": "K", "mergeable": True, "haveDirty": 1},
    {"ruleId": 9, "functionId": 39, "strength": 2, "filter": "F", "packageId": 10, "mergeGroupKey": "", "mergeable": False, "haveDirty": 1},
], "functions": {}}

def test_all_pass_when_sql_realizes_grouping():
    facts = {10: {"hasRand": False, "sampleBaseTable": None, "partitionPred": "",
                  "mergeBlocks": [{"fromTable": "t", "fromCount": 1, "whereFilter": "f",
                                   "stackRuleIds": [1, 2], "stackArity": 2}],
                  "unionSegments": [{"ruleId": 9, "fromTable": "t", "dirtyTable": "x"}],
                  "dirtyExplodeRuleIds": [1, 2], "dirtyTables": []}}
    v = compare(META, facts, mode="dq", task_id="4471")
    p = v["packages"][0]
    assert p["checks"]["mergeable_merged"] == "PASS"
    assert p["checks"]["unmergeable_unmerged"] == "PASS"
    assert p["checks"]["strength_split"] == "PASS"

def test_fail_when_expected_merge_split():
    facts = {10: {"hasRand": False, "sampleBaseTable": None, "partitionPred": "",
                  "mergeBlocks": [{"fromTable": "t", "fromCount": 1, "whereFilter": "f",
                                   "stackRuleIds": [1], "stackArity": 1}],
                  "unionSegments": [{"ruleId": 2, "fromTable": "t", "dirtyTable": "x"},
                                    {"ruleId": 9, "fromTable": "t", "dirtyTable": "x"}],
                  "dirtyExplodeRuleIds": [1], "dirtyTables": []}}
    v = compare(META, facts, mode="dq", task_id="4471")
    assert v["packages"][0]["checks"]["mergeable_merged"] == "FAIL"

if __name__ == "__main__":
    test_all_pass_when_sql_realizes_grouping(); test_fail_when_expected_merge_split()
    print("OK test_comparator")
```

- [ ] **Step 2: 跑测试验证失败**

Run: `python3 .claude/skills/sql-merge-validate/scripts/tests/test_comparator.py`
Expected: FAIL（comparator/compare 未定义）。

- [ ] **Step 3: 写 comparator.py**

```python
"""三方比对：期望分组 vs DB merge_group_key vs 实际 SQL 结构事实 → 逐包 7 维 verdict + 子检查 + finding。"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from expectation import compute_expected, normalize_filter
from common import DOC_WHITELIST, NO_DIRTY_FUNCTIONS

def _by_id(rules): return {r["ruleId"]: r for r in rules}

def compare(meta, facts_by_pkg, mode, task_id):
    rules = meta["rules"]
    rmap = _by_id(rules)
    expected = compute_expected(rules)
    pkg_ids = sorted(expected.keys())
    # merge_group_key → 所属 package 集合（用于 ⑦ 跨包检查）
    mk_pkgs = {}
    for r in rules:
        if r.get("mergeGroupKey"):
            mk_pkgs.setdefault(r["mergeGroupKey"], set()).add(r["packageId"])
    packages = []
    for pid in pkg_ids:
        exp = expected[pid]
        facts = facts_by_pkg.get(pid, {})
        blocks = facts.get("mergeBlocks", [])
        block_sets = [set(b["stackRuleIds"]) for b in blocks]
        seg_ids = {s["ruleId"] for s in facts.get("unionSegments", [])}
        checks, evidence = {}, []

        # ① 可合并→已合并：每个期望组整组落在某个 block
        ok = True
        for g in exp["mergeGroups"]:
            if not any(set(g) <= bs for bs in block_sets):
                ok = False
                evidence.append({"check": "mergeable_merged", "expected": "组 %s 合并" % g,
                                 "actual": "未在同一 SUM 块"})
        checks["mergeable_merged"] = "PASS" if ok else ("FAIL" if exp["mergeGroups"] else "NA")

        # ② 不可合并→未合并：standalone 全在 union 段，且不在任何 block
        ok = True
        for rid in exp["standalone"]:
            in_block = any(rid in bs for bs in block_sets)
            if in_block or rid not in seg_ids:
                ok = False
                evidence.append({"check": "unmergeable_unmerged", "ruleId": rid,
                                 "expected": "独立 union 段", "actual": "在合并块" if in_block else "缺独立段"})
        checks["unmergeable_unmerged"] = "PASS" if ok else "FAIL"

        # ③ 抽样：有 rand()/抽样表则要求 block 扫抽样表
        if facts.get("sampleBaseTable") or facts.get("hasRand"):
            ok = bool(facts.get("hasRand")) and bool(facts.get("sampleBaseTable")) and \
                 all("_temp_sample_table_" in (b.get("fromTable") or "") for b in blocks)
            checks["sampling"] = "PASS" if ok else "FAIL"
        else:
            checks["sampling"] = "NA"

        # ④ 分区：有分区谓词→PASS；无法独立判定是否「应」有 → 无则 NA（模型据用户输入复核）
        checks["partition"] = "PASS" if facts.get("partitionPred") else "NA"

        # ⑤ 过滤：同一 block 内规则的标准化 filter 必须一致
        ok = True
        for bs in block_sets:
            filts = {normalize_filter(rmap[r]["filter"]) for r in bs if r in rmap}
            if len(filts) > 1:
                ok = False
                evidence.append({"check": "filter_boundary", "expected": "块内同 filter",
                                 "actual": "块内混入不同 filter: %s" % bs})
        checks["filter_boundary"] = "PASS" if ok else "FAIL"

        # ⑥ 强弱：同一 block 内 strength 一致
        ok = True
        for bs in block_sets:
            strengths = {rmap[r]["strength"] for r in bs if r in rmap}
            if len(strengths) > 1:
                ok = False
                evidence.append({"check": "strength_split", "expected": "块内同强弱",
                                 "actual": "块内混强弱: %s" % bs})
        checks["strength_split"] = "PASS" if ok else "FAIL"

        # ⑦ 多包：本包涉及的 merge_group_key 不得跨包
        ok = True
        for r in rules:
            if r["packageId"] == pid and r.get("mergeGroupKey") and len(mk_pkgs.get(r["mergeGroupKey"], set())) > 1:
                ok = False
                evidence.append({"check": "packaging", "expected": "合并组不跨包",
                                 "actual": "mergeGroupKey %s 跨包 %s" % (r["mergeGroupKey"], sorted(mk_pkgs[r["mergeGroupKey"]]))})
        checks["packaging"] = "PASS" if ok else "FAIL"

        # 子检查：have_dirty=0 不进脏数据 explode
        sub = {}
        no_dirty_in_explode = [r for r in facts.get("dirtyExplodeRuleIds", [])
                               if r in rmap and rmap[r].get("haveDirty") == 0]
        sub["have_dirty_excluded"] = "PASS" if not no_dirty_in_explode else "FAIL"
        if no_dirty_in_explode:
            evidence.append({"check": "have_dirty_excluded", "actual": "have_dirty=0 规则误进脏数据: %s" % no_dirty_in_explode})
        sub["percentage_semantics"] = "NA"  # 占比 val/expansion 语义交模型+KB 复核

        packages.append({"packageId": pid, "checks": checks, "subchecks": sub, "evidence": evidence})

    # 全局 finding：实测被合并(mergeGroupKey 非空)但不在文档白名单的 function（如 fn26）
    global_findings = []
    div = sorted({r["functionId"] for r in rules
                  if r.get("mergeGroupKey") and r["functionId"] not in DOC_WHITELIST})
    for fn in div:
        global_findings.append({"type": "whitelist_divergence", "functionId": fn,
                                "note": "fn%d 被合并但不在文档白名单，需确认文档漏列 or 实现误合" % fn})

    return {"taskId": task_id, "mode": mode, "packageCount": len(pkg_ids),
            "ruleCount": len(rules), "packages": packages, "globalFindings": global_findings}
```

- [ ] **Step 4: 跑测试验证通过**

Run: `python3 .claude/skills/sql-merge-validate/scripts/tests/test_comparator.py`
Expected: `OK test_comparator`。

- [ ] **Step 5: 提交**

```bash
git add .claude/skills/sql-merge-validate/scripts/comparator.py .claude/skills/sql-merge-validate/scripts/tests/test_comparator.py
git commit -m "feat: 🧩 add three-way comparator producing per-package 7-dim verdict"
```

---

### Task 6: run.py（编排器，打印 verdict）

**Files:**
- Create: `.claude/skills/sql-merge-validate/scripts/run.py`

- [ ] **Step 1: 写 run.py（import 各模块函数，dq/std 两路）**

```python
"""编排器：取参 → 取 SQL + 元数据 → 逐包提取结构事实 → 三方比对 → 打印 verdict JSON。
不产文件；中间产物只在内存。dq: 接口取 SQL；std: DB sql_text。"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import connect_db, dump_json
from db_metadata import fetch_dq, fetch_std
from sql_extractor import extract_facts
from comparator import compare
import fetch_dq as _fetchmod  # 仅 dq 用 HTTP

def run_dq(a, conn):
    pkgs = _fetchmod.fetch(a.base, a.cookie, a.project_id, a.task_id)["packages"]
    meta = fetch_dq(conn, a.task_id, [str(p["packageId"]) for p in pkgs])
    facts = {p["packageId"]: extract_facts(p["sql"], p["packageId"]) for p in pkgs}
    return compare(meta, facts, mode="dq", task_id=str(a.task_id))

def run_std(a, conn):
    std = fetch_std(conn, a.task_id)
    pkgs = std["packages"]
    facts = {p["packageId"]: extract_facts(p["sql"], p["packageId"]) for p in pkgs}
    # std 无 merge_group_key；期望分组从 check_columns 推导（实现见 Task 8），当前最小：仅结构事实
    meta = {"rules": [], "functions": {}}
    v = compare(meta, facts, mode="std", task_id=str(a.task_id))
    v["note"] = "std 模式：当前环境无落标数据，仅结构校验，未端到端验证"
    return v

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["dq", "std"])
    ap.add_argument("--task-id", required=True)
    ap.add_argument("--host", required=True); ap.add_argument("--port", default="30882")
    ap.add_argument("--user", default="root"); ap.add_argument("--password", required=True)
    ap.add_argument("--base", default=""); ap.add_argument("--cookie", default="")
    ap.add_argument("--project-id", default="")
    a = ap.parse_args()
    conn = connect_db(a.host, a.port, a.user, a.password)
    out = run_dq(a, conn) if a.mode == "dq" else run_std(a, conn)
    conn.close(); dump_json(out)
```

- [ ] **Step 2: 离线冒烟（用 fixture，不连网，验证 extract+compare 串得起来）**

写临时脚本 `/tmp/smoke_pipeline.py`：
```python
import sys; sys.path.insert(0, ".claude/skills/sql-merge-validate/scripts")
from sql_extractor import extract_facts
from comparator import compare
fx = ".claude/skills/sql-merge-validate/scripts/tests/fixtures"
sqls = {p: open(f"{fx}/pkg_{p}.sql").read() for p in (4622, 4623, 4624)}
facts = {p: extract_facts(s, p) for p, s in sqls.items()}
meta = {"rules": [  # 简化真值：4622 弱合并组 + 4624 不可合并对（取自 DB）
    {"ruleId": r, "functionId": 5, "strength": 2, "filter": "F", "packageId": 4622, "mergeGroupKey": "eUvlyF1G", "mergeable": True, "haveDirty": 1} for r in (13019, 13020, 13034, 13036)
] + [{"ruleId": 13035, "functionId": 12, "strength": 2, "filter": "F", "packageId": 4622, "mergeGroupKey": "eUvlyF1G", "mergeable": True, "haveDirty": 0}], "functions": {}}
v = compare(meta, facts, mode="dq", task_id="4471")
print("packages:", v["packageCount"], "pkg4622 checks:", v["packages"][0]["checks"])
```
Run: `python3 /tmp/smoke_pipeline.py`
Expected: pkg4622 `mergeable_merged: PASS`，`have_dirty_excluded: PASS`（fn12/13035 不在脏数据）。

- [ ] **Step 3: 提交**

```bash
git add .claude/skills/sql-merge-validate/scripts/run.py
git commit -m "feat: 🧩 add orchestrator wiring dq/std pipeline to verdict"
```

---

### Task 7: SKILL.md + CLAUDE.md 路由 + 契约绿

**Files:**
- Create: `.claude/skills/sql-merge-validate/SKILL.md`
- Modify: `CLAUDE.md`（命令索引表 + 路由规则各补一行）

- [ ] **Step 1: 写 SKILL.md（frontmatter 仅用白名单字段）**

```markdown
---
name: sql-merge-validate
description: 拿到数据质量监控任务 monitorId（或落标检查任务 id）+ 合并预期描述，校验该任务所有规则包生成 SQL 的合并正确性（可合并/不可合并/抽样/分区/过滤条件/强弱/多规则包），终端逐包给 PASS/FAIL。发现缺陷转 defect-analyze 生成 bug。仅做静态扫描或写用例请转对应 skill。
argument-hint: "<monitorId | 落标任务 id> + 合并预期"
user-invocable: true
model: sonnet
effort: high
---

# sql-merge-validate

校验数据质量/落标合并 SQL 的合并正确性。一次性 skill，脚本自包含在 `scripts/`，只读、不产文件。

## 工作流

1. **取参（AskUser）**：模式（dq/std）、任务标识、baseUrl+cookie+X-Valid-Project-ID（dq）、
   DB host/port/user/pass（默认 172.16.124.100:30882 / root），可选预期描述。
2. **跑校验**：`python3 scripts/run.py --mode <dq|std> --task-id <id> --host <h> --password <p> [--base --cookie --project-id]`
   → 得到 verdict JSON。pymysql 缺失时先 `pip install pymysql`。
3. **语义复核**：对照 `references/`，复核占比规则 val/expansion、SUM(CASE WHEN) condition 是否匹配
   function 模板、have_dirty 子检查；white-list 分歧等 globalFindings 单列。
4. **终端报告**：逐包 7 维矩阵（①可合并 ②不可合并 ③抽样 ④分区 ⑤过滤 ⑥强弱 ⑦多包）+ 每个
   FAIL 的证据片段。不落盘。
5. **bug 联动**：有 FAIL/finding → AskUser「是否转 defect-analyze 生成 bug/推禅道？」（推荐是），
   选是则带证据交接。

## 路由边界

- 纯静态 diff 扫描 → defect-analyze；写用例 → case-*；UI 自动化 → playwright-automation。
- DB 不可达 → 降级为「SQL 结构事实 + 预期文本」并显式声明无法独立判定分组真值。
- std 落标当前环境无数据，仅结构校验，未端到端验证。

## 知识库

`references/rule-dictionary.md`、`merge-rules.md`、`std-check-merge.md`。
```

- [ ] **Step 2: 跑 SKILL.md 契约校验**

Run: `bun run check:skills`
Expected: PASS（含新 skill）。若 `strategy-templates.test.ts` 因新 SKILL.md 断言失败，按其要求补齐
（见 reference-skill-prompt-constraints：11 字段白名单、行数上限、禁装饰契约标记）。

- [ ] **Step 3: CLAUDE.md 命令索引表加一行**

在命令索引表末尾追加：
```markdown
| /sql-merge-validate    | sql-merge-validate    | 校验质量/落标任务规则包生成 SQL 的合并正确性。              |
```

- [ ] **Step 4: CLAUDE.md 路由规则加一行**

在「路由规则」列表加：
```markdown
- 用户给出 monitorId（或落标任务 id）+ 规则 SQL 合并预期，要求校验合并是否正确 → 转发给 `sql-merge-validate`。
```

- [ ] **Step 5: 跑全量契约 + 验证 CLAUDE.md 子串契约**

Run: `bun run check:skills && bun test .claude/scripts/_shared/tests`
Expected: PASS。注意 runtime-detach.ts 子串校验（见 reference-runtime-detach-substring-contract）：改 CLAUDE.md 别动既有 worktree/通知子串。

- [ ] **Step 6: 提交**

```bash
git add .claude/skills/sql-merge-validate/SKILL.md CLAUDE.md
git commit -m "feat: 🧩 wire sql-merge-validate SKILL.md and CLAUDE.md routing"
```

---

### Task 8: std 模式期望分组（落标，部分实现）

**Files:**
- Modify: `.claude/skills/sql-merge-validate/scripts/run.py`（run_std 接 std 期望）
- Create: `.claude/skills/sql-merge-validate/scripts/std_expectation.py`

- [ ] **Step 1: 写 std_expectation.py（从 check_columns 推期望，校验项白名单）**

```python
"""落标：从 check_columns JSON 推期望分组。可合并校验项=数据长度/精度/空值/取值范围；是否重复不可。
落标无 filter、无 merge_group_key，按列聚合（多车型 OR 分支）。"""
import json

STD_MERGEABLE = {"数据长度", "数据精度", "允许空值", "取值范围"}  # 名称口径以 references/std-check-merge.md 为准

def parse_check_columns(check_columns_json):
    try:
        data = json.loads(check_columns_json) if check_columns_json else []
    except ValueError:
        return []
    items = []
    for col in data:
        cname = col.get("columnName") or col.get("column")
        for it in col.get("checkItems", col.get("items", [])):
            items.append({"column": cname, "checkItem": it.get("name") or it.get("type"),
                          "mergeable": (it.get("name") or it.get("type")) in STD_MERGEABLE})
    return items

def compute_std_expected(items):
    mergeable = [i for i in items if i["mergeable"]]
    standalone = [i for i in items if not i["mergeable"]]
    return {"mergeItems": mergeable, "standalone": standalone}
```

- [ ] **Step 2: run_std 接入（仅当 check_columns 有数据；无数据则保持结构校验 + note）**

修改 `run.py` 的 `run_std`，在 `meta` 后补：
```python
    from std_expectation import parse_check_columns, compute_std_expected
    std_exp = {p["packageId"]: compute_std_expected(parse_check_columns(p.get("checkColumns", "")))
               for p in pkgs}
    v["stdExpected"] = {pid: {"mergeItems": len(e["mergeItems"]), "standalone": len(e["standalone"])}
                        for pid, e in std_exp.items()}
```

- [ ] **Step 3: 冒烟（环境无落标数据 → 预期空包，验证不崩）**

Run:
```bash
python3 .claude/skills/sql-merge-validate/scripts/run.py --mode std --task-id 1 \
  --host 172.16.124.100 --password '<DB_PASSWORD>' | python3 -c "import json,sys;print(json.load(sys.stdin).get('note'))"
```
Expected: 打印 std note；packages 为空不报错。**标注：std 未用真实数据端到端验证。**

- [ ] **Step 4: 提交**

```bash
git add .claude/skills/sql-merge-validate/scripts/std_expectation.py .claude/skills/sql-merge-validate/scripts/run.py
git commit -m "feat: 🧩 add std check-item expected grouping (partial, no live data)"
```

---

### Task 9: dq 端到端真跑 + 最终验证 + 合并

**Files:** 无新增（验证 + 合并）

- [ ] **Step 1: 用 monitor 4471 端到端真跑（需有效 cookie + 网络）**

Run:
```bash
python3 .claude/skills/sql-merge-validate/scripts/run.py --mode dq --task-id 4471 \
  --host 172.16.124.100 --password '<DB_PASSWORD>' \
  --base http://shuzhan63-test-ltqc.k8s.dtstack.cn --cookie "<用户 cookie>" --project-id 92 \
  | tee /tmp/verdict_4471.json | python3 -c "import json,sys;d=json.load(sys.stdin);print('pkgs',d['packageCount'],'findings',d['globalFindings'])"
```
Expected: `pkgs 9`；globalFindings 含 `whitelist_divergence fn26`；规则包1(4622) 七维大多 PASS。
人工抽核 verdict 与已知真值（4622 合并组 eUvlyF1G、4624 不可合并对）一致。
cookie 失效则跳过，记录「dq 端到端依赖有效 cookie，本次未真跑」。

- [ ] **Step 2: 跑全部脚本单测**

Run:
```bash
for t in test_sql_extractor test_expectation test_comparator; do
  python3 .claude/skills/sql-merge-validate/scripts/tests/$t.py || exit 1
done
echo ALL_PY_TESTS_OK
```
Expected: `ALL_PY_TESTS_OK`。

- [ ] **Step 3: 项目契约全绿**

Run: `bun run check:skills && bun run check && bun test`
Expected: 全 PASS（新增 Python 脚本不入 bun，但 SKILL.md/CLAUDE.md 契约须绿）。失败必修。

- [ ] **Step 4: 合并回 main 并推送（worktree 流程）**

记下 worktree HEAD SHA，回主工作树：
```bash
git merge --no-ff <sha> -m "merge: 🔀 sql-merge-validate one-off skill"
bun test && git push origin main
git worktree remove .worktrees/<slug>
```
Expected: 合并后 `bun test` 仍绿，push 成功。

- [ ] **Step 5: 交付说明（诚实口径）**

终端说清：dq 已用 4471 端到端真跑验证；std 仅结构校验、无落标数据未端到端验；fn26 白名单分歧
作为 finding 上抛待确认。
