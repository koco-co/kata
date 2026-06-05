"""共享工具：DB 连接、JSON 读写。一次性 skill，自包含无共享依赖。"""
import json
import sys

# 文档白名单（技术方案 §5.2.1）：可合并 function_id 集合；权威来源为 assets_dq_function DB 表，
# db_metadata.py 运行时查询覆盖此静态声明。
DOC_WHITELIST: set[int] = {1, 3, 4, 5, 6, 11, 12, 13, 14, 15, 16, 17, 20, 21, 25, 30, 49}

# have_dirty=0 的函数（进 SUM 块算 val，但不进脏数据 explode/脏表）
NO_DIRTY_FUNCTIONS: set[int] = {1, 12, 20, 21}

# 占比规则集（val = hit/total，expansion = "hit/total"）
PERCENTAGE_FUNCTIONS: set[int] = {4, 6, 13, 14, 15, 49}


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


