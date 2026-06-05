import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from std_expectation import parse_check_columns, compute_std_expected

def test_parse_and_group_by_checkitem_whitelist():
    cc = ('[{"columnName":"vin","checkItems":[{"name":"数据长度"},{"name":"是否重复"}]},'
          '{"columnName":"speed","checkItems":[{"name":"取值范围"}]}]')
    items = parse_check_columns(cc)
    assert len(items) == 3
    exp = compute_std_expected(items)
    merge_names = sorted(i["checkItem"] for i in exp["mergeItems"])
    standalone_names = sorted(i["checkItem"] for i in exp["standalone"])
    assert merge_names == ["取值范围", "数据长度"]   # 两个可合并校验项
    assert standalone_names == ["是否重复"]          # 是否重复不可合并

def test_empty_and_malformed_safe():
    assert parse_check_columns("") == []
    assert parse_check_columns(None) == []
    assert parse_check_columns("not json") == []
    assert compute_std_expected([]) == {"mergeItems": [], "standalone": []}

if __name__ == "__main__":
    test_parse_and_group_by_checkitem_whitelist()
    test_empty_and_malformed_safe()
    print("OK test_std_expectation")
