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

def test_non_list_and_non_dict_elements_safe():
    # 合法 JSON 但根非 list（dict/scalar）→ 不崩，返回 []
    assert parse_check_columns('{"columnName":"x"}') == []
    assert parse_check_columns('"a string"') == []
    assert parse_check_columns('42') == []
    # list 内非 dict 元素 / 缺名字段 → 跳过，不产 None 行
    assert parse_check_columns('[null, 1, "x"]') == []
    assert parse_check_columns('[{"columnName":"c","checkItems":[{"foo":"bar"}]}]') == []

def test_check_item_name_key_shape():
    # 兼容文档形态 checkItemName
    cc = '[{"columnName":"vin","checkItems":[{"checkItemName":"数据精度"},{"checkItemName":"是否重复"}]}]'
    exp = compute_std_expected(parse_check_columns(cc))
    assert [i["checkItem"] for i in exp["mergeItems"]] == ["数据精度"]
    assert [i["checkItem"] for i in exp["standalone"]] == ["是否重复"]

if __name__ == "__main__":
    test_parse_and_group_by_checkitem_whitelist()
    test_empty_and_malformed_safe()
    test_non_list_and_non_dict_elements_safe()
    test_check_item_name_key_shape()
    print("OK test_std_expectation")
