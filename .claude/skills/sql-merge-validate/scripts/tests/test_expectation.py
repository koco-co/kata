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

F = '{"conditionType":1,"conditions":[{"columnName":"id","operator":8,"threshold":"100"}]}'
def test_compute_expected_real_4471_packages():
    rules = [
        # pkg 4622, all weak (strength 2)
        {"ruleId":13019,"functionId":4, "strength":2,"filter":F,"packageId":4622,"mergeable":True},
        {"ruleId":13020,"functionId":5, "strength":2,"filter":F,"packageId":4622,"mergeable":True},
        {"ruleId":13034,"functionId":26,"strength":2,"filter":F,"packageId":4622,"mergeable":False}, # fn26 divergence
        {"ruleId":13035,"functionId":12,"strength":2,"filter":F,"packageId":4622,"mergeable":True},
        {"ruleId":13036,"functionId":30,"strength":2,"filter":F,"packageId":4622,"mergeable":True},
        # pkg 4623, all strong (strength 1)
        {"ruleId":13018,"functionId":3, "strength":1,"filter":F,"packageId":4623,"mergeable":True},
        {"ruleId":13021,"functionId":6, "strength":1,"filter":F,"packageId":4623,"mergeable":True},
        {"ruleId":13022,"functionId":1, "strength":1,"filter":F,"packageId":4623,"mergeable":True},
        {"ruleId":13033,"functionId":26,"strength":1,"filter":F,"packageId":4623,"mergeable":False}, # fn26 divergence
        {"ruleId":13037,"functionId":25,"strength":1,"filter":F,"packageId":4623,"mergeable":True},
        {"ruleId":13038,"functionId":49,"strength":1,"filter":F,"packageId":4623,"mergeable":True},
        # pkg 4624, both NOT mergeable
        {"ruleId":13025,"functionId":34,"strength":1,"filter":F,"packageId":4624,"mergeable":False},
        {"ruleId":13032,"functionId":47,"strength":1,"filter":F,"packageId":4624,"mergeable":False},
    ]
    exp = compute_expected(rules)
    # 4622: 4 个可合并(13019,13020,13035,13036) 成一组；13034(fn26) 文档口径独立
    assert exp[4622]["mergeGroups"] == [[13019,13020,13035,13036]]
    assert exp[4622]["standalone"] == [13034]
    # 4623: 5 个可合并(13018,13021,13022,13037,13038) 成一组；13033(fn26) 文档口径独立
    assert exp[4623]["mergeGroups"] == [[13018,13021,13022,13037,13038]]
    assert exp[4623]["standalone"] == [13033]
    # 4624: 无可合并 → 全 standalone，无 mergeGroup
    assert exp[4624]["mergeGroups"] == []
    assert sorted(exp[4624]["standalone"]) == [13025,13032]

if __name__ == "__main__":
    test_normalize_filter_same_semantics()
    test_compute_expected_groups_by_strength_filter_not_column()
    test_compute_expected_real_4471_packages()
    print("OK test_expectation")
