import os, sys, types
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import run

HERE = os.path.dirname(__file__)
def sql(name): return open(os.path.join(HERE, "fixtures", name), encoding="utf-8").read()

F = '{"conditionType":1,"conditions":[{"columnName":"id","operator":8,"threshold":"100"}]}'

def test_run_dq_wires_fetch_meta_extract_compare():
    pkgs = [
        {"packageId": 4622, "packageName": "p22", "sql": sql("pkg_4622.sql")},
        {"packageId": 4624, "packageName": "p24", "sql": sql("pkg_4624.sql")},
    ]
    meta = {"rules": [
        {"ruleId":13019,"functionId":4, "strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":1},
        {"ruleId":13020,"functionId":5, "strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":1},
        {"ruleId":13034,"functionId":26,"strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":False,"haveDirty":1},
        {"ruleId":13035,"functionId":12,"strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":0},
        {"ruleId":13036,"functionId":30,"strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":1},
        {"ruleId":13025,"functionId":34,"strength":1,"filter":F,"packageId":4624,"mergeGroupKey":"","mergeable":False,"haveDirty":1},
        {"ruleId":13032,"functionId":47,"strength":1,"filter":F,"packageId":4624,"mergeGroupKey":"","mergeable":False,"haveDirty":1},
    ], "functions": {}}
    orig_http = run.http_fetch.fetch
    orig_meta = run.fetch_dq_meta
    run.http_fetch.fetch = lambda base, cookie, project_id, monitor_id: {"packages": pkgs}
    run.fetch_dq_meta = lambda conn, task_id, pids: meta
    try:
        a = types.SimpleNamespace(base="x", cookie="c", project_id="92", task_id="4471")
        v = run.run_dq(a, conn=None)
    finally:
        run.http_fetch.fetch = orig_http
        run.fetch_dq_meta = orig_meta

    assert v["mode"] == "dq"
    assert v["taskId"] == "4471"
    assert v["packageCount"] == 2
    p4622 = next(p for p in v["packages"] if p["packageId"] == 4622)
    p4624 = next(p for p in v["packages"] if p["packageId"] == 4624)
    # 真实 fixture：4622 STACK(5) 整组合并 → ① PASS；②NA（无空 key 规则）
    assert p4622["checks"]["mergeable_merged"] == "PASS"
    assert p4622["checks"]["unmergeable_unmerged"] == "NA"
    assert p4622["subchecks"]["have_dirty_excluded"] == "PASS"
    # 真实 fixture：4624 两条不可合并 → ②PASS、①NA
    assert p4624["checks"]["mergeable_merged"] == "NA"
    assert p4624["checks"]["unmergeable_unmerged"] == "PASS"
    # fn26 背离 finding
    assert any(f["type"] == "whitelist_divergence" and f["functionId"] == 26 for f in v["globalFindings"])

if __name__ == "__main__":
    test_run_dq_wires_fetch_meta_extract_compare()
    print("OK test_run")
