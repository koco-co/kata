"""共享工具：DB 连接、function 字典、JSON 读写。一次性 skill，自包含无共享依赖。"""
import json
import sys

# ─── function 字典常量 ───
# function_id → 元信息。来源：assets_dq_function 2026-06-05 快照 + 质量规则合并细节技术方案.md §7
# 字段说明：
#   name_en     — 英文函数名（DB name_en 列）
#   type        — 规则类型（1=单字段/聚合, 2=数值, 3=字符串/格式, 4=分组, 6=异常值, 7=多表一致,
#                  8=时间差, 9=合理性趋势）
#   have_dirty  — 是否生成脏数据表（0=不生成，1=生成）
#   mergeable   — 是否在可合并白名单内（True=文档白名单确认）
#   is_pct      — 是否为占比规则（val 应为 命中/总数，expansion 应为 "命中/总数" 字符串）
#
# 文档白名单（技术方案 §5.2.1）：{1,3,4,5,6,11,12,13,14,15,16,17,20,21,25,30,49}
# 实测合并集（DB merge_group_key 非空 function_id）：{1,3,4,5,6,12,25,26,30,49}
# fn26(length_str)：实际被合并，不在文档白名单 → 作为 finding 抛出（见 references/merge-rules.md）

DOC_WHITELIST: set[int] = {1, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16, 17, 20, 21, 25, 30, 49}

# have_dirty=0 的函数（进 SUM 块算 val，但不进脏数据 explode/脏表）
NO_DIRTY_FUNCTIONS: set[int] = {1, 12, 20, 21}

# 占比规则集（val = hit/total，expansion = "hit/total"）
PERCENTAGE_FUNCTIONS: set[int] = {4, 6, 13, 14, 15, 49}

FUNCTION_DICT: dict[int, dict] = {
    # ─── 单字段 / 聚合类（type=1）───
    1:  {"name_en": "line_count",            "type": 1, "have_dirty": 0, "mergeable": True,  "is_pct": False},
    3:  {"name_en": "null_count",            "type": 1, "have_dirty": 1, "mergeable": True,  "is_pct": False},
    4:  {"name_en": "null_percent",          "type": 1, "have_dirty": 1, "mergeable": True,  "is_pct": True},
    5:  {"name_en": "empty_count",           "type": 1, "have_dirty": 1, "mergeable": True,  "is_pct": False},
    6:  {"name_en": "empty_percent",         "type": 1, "have_dirty": 1, "mergeable": True,  "is_pct": True},
    # ─── 数值类（type=2）───
    13: {"name_en": "minus_percent",         "type": 2, "have_dirty": 1, "mergeable": True,  "is_pct": True},
    14: {"name_en": "zero_percent",          "type": 2, "have_dirty": 1, "mergeable": True,  "is_pct": True},
    15: {"name_en": "plus_percent",          "type": 2, "have_dirty": 1, "mergeable": True,  "is_pct": True},
    20: {"name_en": "avg",                   "type": 2, "have_dirty": 0, "mergeable": True,  "is_pct": False},
    21: {"name_en": "sum",                   "type": 2, "have_dirty": 0, "mergeable": True,  "is_pct": False},
    # ─── 字符串 / 格式类（type=3）───
    11: {"name_en": "enum_count",            "type": 3, "have_dirty": 1, "mergeable": True,  "is_pct": False},
    12: {"name_en": "distinct_count",        "type": 3, "have_dirty": 0, "mergeable": True,  "is_pct": False},
    16: {"name_en": "max_len",               "type": 3, "have_dirty": 1, "mergeable": True,  "is_pct": False},
    17: {"name_en": "min_len",               "type": 3, "have_dirty": 1, "mergeable": True,  "is_pct": False},
    22: {"name_en": "personalId",            "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    23: {"name_en": "phoneNumber",           "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    24: {"name_en": "email",                 "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    25: {"name_en": "value_range",           "type": 3, "have_dirty": 1, "mergeable": True,  "is_pct": False},
    26: {"name_en": "length_str",            "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False,
         "_note": "实测被合并但不在文档白名单；作为 finding 抛出"},
    27: {"name_en": "data_precision",        "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    28: {"name_en": "null_count",            "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False,
         "_note": "字符串-空值数，与 fn3 同名异 ID；不在白名单"},
    29: {"name_en": "repeat_count",          "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    30: {"name_en": "enum_value",            "type": 3, "have_dirty": 1, "mergeable": True,  "is_pct": False},
    31: {"name_en": "date",                  "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    32: {"name_en": "date_time",             "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    33: {"name_en": "custom_format_regex",   "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    49: {"name_en": "value_enum_range",      "type": 3, "have_dirty": 1, "mergeable": True,  "is_pct": True,
         "_note": "取值范围&枚举，占比规则"},
    51: {"name_en": "verify_json_value",     "type": 3, "have_dirty": 1, "mergeable": False, "is_pct": False},
    # ─── 分组类（type=4）─── 不可合并
    7:  {"name_en": "repeat_count",          "type": 4, "have_dirty": 1, "mergeable": False, "is_pct": False},
    8:  {"name_en": "repeat_percent",        "type": 4, "have_dirty": 1, "mergeable": False, "is_pct": False},
    9:  {"name_en": "unique_count",          "type": 4, "have_dirty": 1, "mergeable": False, "is_pct": False},
    10: {"name_en": "unique_percent",        "type": 4, "have_dirty": 1, "mergeable": False, "is_pct": False},
    34: {"name_en": "multi_table_column_single", "type": 4, "have_dirty": 1, "mergeable": False, "is_pct": False},
    # ─── 异常值类（type=6）─── 不可合并
    35: {"name_en": "OutlierDetection",      "type": 6, "have_dirty": 1, "mergeable": False, "is_pct": False},
    36: {"name_en": "IQRNumberOFOutliers",   "type": 6, "have_dirty": 1, "mergeable": False, "is_pct": False},
    37: {"name_en": "IQROutlierRatio",       "type": 6, "have_dirty": 1, "mergeable": False, "is_pct": False},
    38: {"name_en": "Z-scoreConfidenceInterval", "type": 6, "have_dirty": 1, "mergeable": False, "is_pct": False},
    # ─── 单表聚合类（type=1，跨多字段）───
    39: {"name_en": "single_table_value_range", "type": 1, "have_dirty": 1, "mergeable": False, "is_pct": False},
    40: {"name_en": "multi_table_rows",      "type": 1, "have_dirty": 1, "mergeable": False, "is_pct": False},
    41: {"name_en": "multi_table_content",   "type": 1, "have_dirty": 1, "mergeable": False, "is_pct": False},
    46: {"name_en": "json_format_key",       "type": 1, "have_dirty": 1, "mergeable": False, "is_pct": False},
    # ─── 时间差类（type=8）───
    42: {"name_en": "Single_field_time_difference", "type": 8, "have_dirty": 1, "mergeable": False, "is_pct": False},
    44: {"name_en": "time_multi_field_difference",  "type": 8, "have_dirty": 1, "mergeable": False, "is_pct": False},
    # ─── 合理性/趋势类（type=9）───
    43: {"name_en": "reasonable_data_change_trend", "type": 9, "have_dirty": 1, "mergeable": False, "is_pct": False},
    47: {"name_en": "Field_value_calculation_comparison", "type": 9, "have_dirty": 1, "mergeable": False, "is_pct": False},
    50: {"name_en": "reasonable_multi_table_column_value", "type": 9, "have_dirty": 1, "mergeable": False, "is_pct": False},
    # ─── 多表一致性（type=7）───
    45: {"name_en": "multi_table_uniformity", "type": 7, "have_dirty": 1, "mergeable": False, "is_pct": False},
}


def load_json(path: str) -> object:
    """从文件路径读取 JSON，返回解析对象。"""
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def dump_json(obj: object) -> None:
    """将对象序列化为 JSON 并写入 stdout（带换行）。"""
    json.dump(obj, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def connect_db(host: str, port: int | str, user: str, password: str, database: str = "assets"):
    """创建 pymysql 连接。需要 `pip install pymysql`（纯 Python，支持 mysql_native_password）。"""
    import pymysql  # type: ignore[import]
    return pymysql.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=database,
        connect_timeout=8,
        charset="utf8mb4",
    )


def is_mergeable(function_id: int) -> bool:
    """判断 function_id 是否在文档白名单内（文档权威，fn26 分歧需单独处理）。"""
    return function_id in DOC_WHITELIST


def is_empirically_merged(function_id: int) -> bool:
    """判断 function_id 是否在实测合并集内（含 fn26 分歧）。"""
    empirical = DOC_WHITELIST | {26}
    return function_id in empirical
