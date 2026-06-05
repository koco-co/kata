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
