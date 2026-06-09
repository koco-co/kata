"""三方比对：以 DB merge_group_key 为权威分组，对照实际 SQL 结构事实，逐包出 7 维 verdict。
文档白名单仅用于发现「合并了规格外 function」的 finding（如 fn26），不左右 ①② 的 PASS/FAIL。"""
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from expectation import normalize_filter
from common import DOC_WHITELIST

# 规则 SQL 残缺：以比较运算符或 and/or/like/in 收尾即条件未写完（轻量启发式，非完整语法解析）。
_DANGLING_TAIL = re.compile(r"(<=|>=|<>|!=|=|<|>|\band\b|\bor\b|\blike\b|\bin\b)\s*$", re.I)


def detect_sql_defect(sql):
    """检测规则 SQL 明显残缺，返回原因字符串或 None。轻量启发式：只抓必然跑不了的写法
    （空 SQL、空 WHERE、悬空运算符收尾、括号不匹配），不做完整语法/方言解析，避免误报。"""
    s = (sql or "").strip()
    if not s:
        return "SQL 为空"
    body = s.rstrip(";").strip()
    if body.count("(") != body.count(")"):
        return "括号不匹配"
    m = re.search(r"\bwhere\b(.*)$", body, re.I | re.S)
    if m:
        cond = m.group(1).strip()
        if not cond:
            return "WHERE 子句为空"
        if _DANGLING_TAIL.search(cond):
            return "WHERE 条件残缺（以运算符收尾）：%r" % cond
    elif _DANGLING_TAIL.search(body):
        return "SQL 以运算符收尾，条件不完整"
    return None


def _by_id(rules):
    return {r["ruleId"]: r for r in rules}

def _authoritative_groups(pkg_rules):
    """按 merge_group_key 分组（权威真值）：非空且组内≥2 → 合并组；其余（含空 key、单条 key）→ standalone。"""
    by_key = {}
    standalone = []
    for r in pkg_rules:
        k = r.get("mergeGroupKey")
        if k:
            by_key.setdefault(k, []).append(r["ruleId"])
        else:
            standalone.append(r["ruleId"])
    merge_groups = []
    for rids in by_key.values():
        if len(rids) >= 2:
            merge_groups.append(sorted(rids))
        else:
            standalone.extend(rids)  # 单条 key 退回不合并
    merge_groups.sort()
    return merge_groups, sorted(standalone)

def compare(meta, facts_by_pkg, mode, task_id):
    rules = meta["rules"]
    rmap = _by_id(rules)
    pkg_ids = sorted({r["packageId"] for r in rules})
    rules_by_pkg = {}
    for r in rules:
        rules_by_pkg.setdefault(r["packageId"], []).append(r)
    # merge_group_key → 所属 package 集合（⑦ 跨包检查）
    mk_pkgs = {}
    for r in rules:
        if r.get("mergeGroupKey"):
            mk_pkgs.setdefault(r["mergeGroupKey"], set()).add(r["packageId"])

    packages = []
    for pid in pkg_ids:
        pkg_rules = rules_by_pkg.get(pid, [])
        merge_groups, standalone = _authoritative_groups(pkg_rules)
        facts = facts_by_pkg.get(pid, {})
        blocks = facts.get("mergeBlocks", [])
        block_sets = [set(b["stackRuleIds"]) for b in blocks]
        seg_ids = {s["ruleId"] for s in facts.get("unionSegments", [])}
        checks, evidence = {}, []

        # ① 可合并→已合并：每个权威合并组整组落进某个 SUM 块
        ok = True
        for g in merge_groups:
            if not any(set(g) <= bs for bs in block_sets):
                ok = False
                evidence.append({"check": "mergeable_merged", "expected": "组 %s 合并" % g,
                                 "actual": "未在同一 SUM 块"})
        checks["mergeable_merged"] = ("PASS" if ok else "FAIL") if merge_groups else "NA"

        # ② 不可合并→未合并：权威 standalone（空 merge_group_key）不进任何块，且在独立 union 段
        ok = True
        for rid in standalone:
            in_block = any(rid in bs for bs in block_sets)
            if in_block or rid not in seg_ids:
                ok = False
                evidence.append({"check": "unmergeable_unmerged", "ruleId": rid,
                                 "expected": "独立 union 段",
                                 "actual": "在合并块" if in_block else "缺独立段"})
        checks["unmergeable_unmerged"] = ("PASS" if ok else "FAIL") if standalone else "NA"

        # ③ 抽样：扫抽样表与脏数据 rand 是独立信号。
        #   合并包(有块)用 rand 抽样 → 要求有抽样表且所有块扫抽样表；
        #   有抽样表但本包无 rand 合并块（如不可合并包 4624：段扫抽样表、脏数据不 rand）→ 记 PASS，rand 细节交模型；
        #   完全不涉抽样 → NA。
        block_scans_sample = bool(blocks) and all(
            "_temp_sample_table_" in (b.get("fromTable") or "") for b in blocks)
        if facts.get("hasRand") and blocks:
            ok = bool(facts.get("sampleBaseTable")) and block_scans_sample
            checks["sampling"] = "PASS" if ok else "FAIL"
            if not ok:
                evidence.append({"check": "sampling", "expected": "rand 抽样时块扫抽样表",
                                 "actual": "块未扫抽样表或缺抽样表"})
        elif facts.get("sampleBaseTable"):
            # 有抽样表但无「rand 合并块」（含 hasRand=True 却无合并块的纯 union 包）：
            # 段级 rand 细节是独立信号、交模型语义复核，这里只确认抽样表结构存在即记 PASS（非分支顺序笔误）。
            checks["sampling"] = "PASS"
        else:
            checks["sampling"] = "NA"

        # ④ 分区：有分区谓词→PASS；无则 NA（是否「应」有交模型据用户输入复核）
        checks["partition"] = "PASS" if facts.get("partitionPred") else "NA"

        # ⑤ 过滤：同一 SUM 块内规则标准化 filter 必须一致
        ok = True
        for bs in block_sets:
            filts = {normalize_filter(rmap[r]["filter"]) for r in bs if r in rmap}
            if len(filts) > 1:
                ok = False
                evidence.append({"check": "filter_boundary", "expected": "块内同 filter",
                                 "actual": "块内混入不同 filter: %s" % sorted(bs)})
        checks["filter_boundary"] = "PASS" if ok else "FAIL"

        # ⑥ 强弱：同一 SUM 块内 strength 一致
        ok = True
        for bs in block_sets:
            strengths = {rmap[r]["strength"] for r in bs if r in rmap}
            if len(strengths) > 1:
                ok = False
                evidence.append({"check": "strength_split", "expected": "块内同强弱",
                                 "actual": "块内混强弱: %s" % sorted(bs)})
        checks["strength_split"] = "PASS" if ok else "FAIL"

        # ⑦ 多包：本包涉及的 merge_group_key 不得跨包
        ok = True
        for r in pkg_rules:
            k = r.get("mergeGroupKey")
            if k and len(mk_pkgs.get(k, set())) > 1:
                ok = False
                evidence.append({"check": "packaging", "expected": "合并组不跨包",
                                 "actual": "mergeGroupKey %s 跨包 %s" % (k, sorted(mk_pkgs[k]))})
        checks["packaging"] = "PASS" if ok else "FAIL"

        # ⑧ 规则 SQL 完整性：自带 SQL 的规则（is_custom）其执行 SQL 不得残缺。
        #   走 function 模板的普通规则单条不存执行 SQL（合并 SQL 在包级），不在此检测以免误报。
        ok = True
        for r in pkg_rules:
            if not r.get("isCustom"):
                continue
            reason = detect_sql_defect(r.get("ruleSql") or r.get("customSql"))
            if reason:
                ok = False
                evidence.append({"check": "rule_sql_valid", "ruleId": r["ruleId"],
                                 "expected": "规则 SQL 完整可执行",
                                 "actual": reason})
        has_custom = any(r.get("isCustom") for r in pkg_rules)
        checks["rule_sql_valid"] = ("PASS" if ok else "FAIL") if has_custom else "NA"

        # 子检查：have_dirty=0 规则不得进脏数据 explode
        sub = {}
        no_dirty_in_explode = sorted({r for r in facts.get("dirtyExplodeRuleIds", [])
                                      if r in rmap and rmap[r].get("haveDirty") == 0})
        sub["have_dirty_excluded"] = "PASS" if not no_dirty_in_explode else "FAIL"
        if no_dirty_in_explode:
            evidence.append({"check": "have_dirty_excluded",
                             "actual": "have_dirty=0 规则误进脏数据: %s" % no_dirty_in_explode})
        sub["percentage_semantics"] = "NA"  # 占比 val/expansion 语义交模型 + KB 复核

        packages.append({"packageId": pid, "checks": checks, "subchecks": sub, "evidence": evidence})

    # 全局 finding：实测被合并(merge_group_key 非空)但 function 不在文档白名单（如 fn26）
    global_findings = []
    div = sorted({r["functionId"] for r in rules
                  if r.get("mergeGroupKey") and r["functionId"] not in DOC_WHITELIST})
    for fn in div:
        global_findings.append({"type": "whitelist_divergence", "functionId": fn,
                                "note": "fn%d 被合并但不在文档白名单，需确认文档漏列 or 实现误合" % fn})

    # 自定义 SQL 规则：function_id/column 为 NULL 属预期，但其执行 SQL 必须完整可跑；
    # 残缺即缺陷（valid=False），已在 ⑧ rule_sql_valid 判该包 FAIL，这里同步标识 defect。
    custom_rules = []
    for r in rules:
        if not r.get("isCustom"):
            continue
        sql = (r.get("ruleSql") or r.get("customSql") or "").strip()
        defect = detect_sql_defect(sql)
        custom_rules.append({"ruleId": r["ruleId"], "packageId": r["packageId"],
                             "sql": sql, "valid": defect is None, "defect": defect})
    custom_rules.sort(key=lambda x: x["ruleId"])

    return {"taskId": task_id, "mode": mode, "packageCount": len(pkg_ids),
            "ruleCount": len(rules), "packages": packages,
            "customRules": custom_rules, "globalFindings": global_findings}
