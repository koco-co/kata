"""落标：从 check_columns JSON 推期望分组。可合并校验项=数据长度/精度/空值/取值范围；是否重复不可。
落标无 filter、无 merge_group_key，按列聚合（多车型 OR 分支）。"""
import json

STD_MERGEABLE = {"数据长度", "数据精度", "允许空值", "取值范围"}  # 名称口径以 references/std-check-merge.md 为准

def parse_check_columns(check_columns_json):
    # check_columns 来自 DB 列，历史值可能任意：非 list 根、非 dict 元素、缺名字段都要兜底不崩。
    try:
        data = json.loads(check_columns_json) if check_columns_json else []
    except ValueError:
        return []
    if not isinstance(data, list):
        return []
    items = []
    for col in data:
        if not isinstance(col, dict):
            continue
        cname = col.get("columnName") or col.get("column")
        for it in col.get("checkItems", col.get("items", [])):
            if not isinstance(it, dict):
                continue
            # 名称口径优先 checkItemName（references/std-check-merge.md 文档形态），兼容 name/type
            check_item = it.get("checkItemName") or it.get("name") or it.get("type")
            if check_item is None:
                continue
            items.append({"column": cname, "checkItem": check_item,
                          "mergeable": check_item in STD_MERGEABLE})
    return items

def compute_std_expected(items):
    mergeable = [i for i in items if i["mergeable"]]
    standalone = [i for i in items if not i["mergeable"]]
    return {"mergeItems": mergeable, "standalone": standalone}
