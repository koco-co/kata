"""编排器：取参 → 取 SQL + 元数据 → 逐包提取结构事实 → 三方比对 → 打印 verdict JSON。
不产文件；中间产物只在内存。dq: 接口取 SQL；std: DB sql_text。"""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import connect_db, dump_json
from db_metadata import fetch_dq as fetch_dq_meta, fetch_std
from sql_extractor import extract_facts
from comparator import compare
import fetch_dq as http_fetch  # dq 模式经 HTTP 取合并 SQL（fetch_dq.py 模块）

def run_dq(a, conn):
    pkgs = http_fetch.fetch(a.base, a.cookie, a.project_id, a.task_id)["packages"]
    meta = fetch_dq_meta(conn, a.task_id, [str(p["packageId"]) for p in pkgs])
    facts = {p["packageId"]: extract_facts(p["sql"], p["packageId"]) for p in pkgs}
    return compare(meta, facts, mode="dq", task_id=str(a.task_id))

def run_std(a, conn):
    pkgs = fetch_std(conn, a.task_id)["packages"]
    facts = {p["packageId"]: extract_facts(p["sql"], p["packageId"]) for p in pkgs}
    # std 无 merge_group_key；期望分组从 check_columns 推导（见 Task 8），当前最小：仅结构事实
    v = compare({"rules": [], "functions": {}}, facts, mode="std", task_id=str(a.task_id))
    v["note"] = "std 模式：当前环境无落标数据，仅结构校验，未端到端验证"
    return v

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["dq", "std"])
    ap.add_argument("--task-id", required=True)
    ap.add_argument("--host", required=True); ap.add_argument("--port", default="30882")
    ap.add_argument("--user", default="root"); ap.add_argument("--password", required=True)
    ap.add_argument("--base", default=""); ap.add_argument("--cookie", default="")
    ap.add_argument("--project-id", default="")
    a = ap.parse_args()
    conn = connect_db(a.host, a.port, a.user, a.password)
    out = run_dq(a, conn) if a.mode == "dq" else run_std(a, conn)
    conn.close(); dump_json(out)
