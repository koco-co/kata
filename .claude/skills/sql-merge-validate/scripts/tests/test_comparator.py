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

F = '{"conditionType":1,"conditions":[{"columnName":"id","operator":8,"threshold":"100"}]}'

META_4622 = {"rules": [
    {"ruleId":13019,"functionId":4, "strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":1},
    {"ruleId":13020,"functionId":5, "strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":1},
    {"ruleId":13034,"functionId":26,"strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":False,"haveDirty":1},
    {"ruleId":13035,"functionId":12,"strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":0},
    {"ruleId":13036,"functionId":30,"strength":2,"filter":F,"packageId":4622,"mergeGroupKey":"eUvlyF1G","mergeable":True, "haveDirty":1},
], "functions": {}}

def test_fn26_divergence_unmerge_check_NA_and_finding():
    facts = {4622: {
        "hasRand": True, "sampleBaseTable": "test_info_1", "partitionPred": "dt='2026-06-04'",
        "mergeBlocks": [{"fromTable": "test_info_1_temp_sample_table_#{jobId}", "fromCount": 1,
                         "whereFilter": "id <= 100",
                         "stackRuleIds": [13019,13020,13034,13035,13036], "stackArity": 5}],
        "unionSegments": [],
        "dirtyExplodeRuleIds": [13019,13020,13034,13036],
        "dirtyTables": []}}
    v = compare(META_4622, facts, mode="dq", task_id="4471")
    p = v["packages"][0]
    assert p["checks"]["mergeable_merged"] == "PASS"
    assert p["checks"]["unmergeable_unmerged"] == "NA"   # 关键：不因 fn26 误判 FAIL
    assert p["checks"]["sampling"] == "PASS"
    assert p["checks"]["partition"] == "PASS"
    assert p["checks"]["filter_boundary"] == "PASS"
    assert p["checks"]["strength_split"] == "PASS"
    assert p["checks"]["packaging"] == "PASS"
    assert p["subchecks"]["have_dirty_excluded"] == "PASS"
    assert any(f["type"] == "whitelist_divergence" and f["functionId"] == 26
               for f in v["globalFindings"])

META_4624 = {"rules": [
    {"ruleId":13025,"functionId":34,"strength":1,"filter":F,"packageId":4624,"mergeGroupKey":"","mergeable":False,"haveDirty":1},
    {"ruleId":13032,"functionId":47,"strength":1,"filter":F,"packageId":4624,"mergeGroupKey":"","mergeable":False,"haveDirty":1},
], "functions": {}}

def test_4624_unmergeable_all_standalone():
    facts = {4624: {
        "hasRand": False, "sampleBaseTable": "test_info_1", "partitionPred": "dt='2026-06-04'",
        "mergeBlocks": [],
        "unionSegments": [{"ruleId":13025,"fromTable":"test_info_1","dirtyTable":"dq_monitor_#{jobId}_13025"},
                          {"ruleId":13032,"fromTable":"test_info_1","dirtyTable":"dq_monitor_#{jobId}_13032"}],
        "dirtyExplodeRuleIds": [],
        "dirtyTables": ["13025","13032"]}}
    v = compare(META_4624, facts, mode="dq", task_id="4471")
    p = v["packages"][0]
    assert p["checks"]["mergeable_merged"] == "NA"
    assert p["checks"]["unmergeable_unmerged"] == "PASS"
    assert p["checks"]["sampling"] == "PASS"
    assert v["globalFindings"] == []

if __name__ == "__main__":
    test_all_pass_when_sql_realizes_grouping()
    test_fail_when_expected_merge_split()
    test_fn26_divergence_unmerge_check_NA_and_finding()
    test_4624_unmergeable_all_standalone()
    print("OK test_comparator")
