import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from sql_extractor import extract_facts

HERE = os.path.dirname(__file__)
def sql(name): return open(os.path.join(HERE, "fixtures", name), encoding="utf-8").read()

def test_4622_sampling_and_merge():
    f = extract_facts(sql("pkg_4622.sql"), 4622)
    assert f["hasRand"] is True
    assert f["sampleBaseTable"] == "test_info_1"
    assert "dt='2026-06-04'" in f["partitionPred"]
    assert len(f["mergeBlocks"]) == 1
    b = f["mergeBlocks"][0]
    assert b["fromCount"] == 1
    assert b["stackArity"] == 5
    assert sorted(b["stackRuleIds"]) == [13019, 13020, 13034, 13035, 13036]
    assert sorted(f["dirtyExplodeRuleIds"]) == [13019, 13020, 13034, 13036]  # 13035 fn12 have_dirty=0 排除

def test_4623_strong_merge_includes_line_count():
    f = extract_facts(sql("pkg_4623.sql"), 4623)
    assert len(f["mergeBlocks"]) == 1
    b = f["mergeBlocks"][0]
    assert b["stackArity"] == 6
    assert sorted(b["stackRuleIds"]) == [13018, 13021, 13022, 13033, 13037, 13038]  # 含 13022 表行数
    assert 13022 not in f["dirtyExplodeRuleIds"]  # fn1 have_dirty=0 不进脏数据
    assert sorted(f["dirtyExplodeRuleIds"]) == [13018, 13021, 13033, 13037, 13038]

def test_4624_unmergeable_union_segments():
    f = extract_facts(sql("pkg_4624.sql"), 4624)
    assert f["mergeBlocks"] == []
    seg = sorted(s["ruleId"] for s in f["unionSegments"])
    assert seg == [13025, 13032]
    assert f["hasRand"] is False  # 不可合并规则无 rand（但有抽样表）
    assert f["sampleBaseTable"] == "test_info_1"

if __name__ == "__main__":
    test_4622_sampling_and_merge()
    test_4623_strong_merge_includes_line_count()
    test_4624_unmergeable_union_segments()
    print("OK test_sql_extractor")
