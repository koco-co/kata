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
