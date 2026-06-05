"""取规则真值。dq: assets_dq_monitor_rule + assets_dq_function；std: metadata_standard_table_check_package。"""
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from common import connect_db, dump_json, DOC_WHITELIST, NO_DIRTY_FUNCTIONS


def fetch_dq(conn, monitor_id, package_ids):
    cur = conn.cursor()
    cur.execute(
        """SELECT id, function_id, rule_strength, column_name, COALESCE(filter,''),
        COALESCE(merge_group_key,''), is_percentage, package_id
        FROM assets_dq_monitor_rule
        WHERE monitor_id=%s AND (is_deleted=0 OR is_deleted IS NULL)""",
        (monitor_id,),
    )
    pid_set = set(int(p) for p in package_ids) if package_ids else None
    # 注：column 与 isPercentage 为透传字段——自动 7 维检查不用，留给模型/KB 语义复核（如占比 val/expansion）。
    rules = []
    for rid, fn, strength, col, filt, mk, pct, pid in cur.fetchall():
        if pid_set is not None and pid not in pid_set:
            continue
        rules.append(
            {
                "ruleId": rid,
                "functionId": fn,
                "strength": strength,
                "column": col,
                "filter": filt,
                "mergeGroupKey": mk,
                "isPercentage": pct,
                "packageId": pid,
                "haveDirty": 0 if fn in NO_DIRTY_FUNCTIONS else 1,
                "mergeable": fn in DOC_WHITELIST,
            }
        )
    cur.execute("SELECT id, name_en, type, have_dirty FROM assets_dq_function")
    functions = {
        str(i): {"nameEn": n, "type": t, "haveDirty": hd, "mergeable": i in DOC_WHITELIST}
        for i, n, t, hd in cur.fetchall()
    }
    return {"rules": rules, "functions": functions}


def fetch_std(conn, check_id):
    cur = conn.cursor()
    cur.execute(
        """SELECT id, package_name, COALESCE(sql_text,''), COALESCE(check_columns,'')
        FROM metadata_standard_table_check_package
        WHERE standard_table_check_id=%s AND (is_deleted=0 OR is_deleted IS NULL)""",
        (check_id,),
    )
    packages = [
        {"packageId": pid, "packageName": name, "sql": sql, "checkColumns": cc}
        for pid, name, sql, cc in cur.fetchall()
    ]
    return {"packages": packages}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["dq", "std"])
    ap.add_argument("--task-id", required=True)
    ap.add_argument("--package-ids", default="")  # 逗号分隔，dq 用
    ap.add_argument("--host", required=True)
    ap.add_argument("--port", default="30882")
    ap.add_argument("--user", default="root")
    ap.add_argument("--password", required=True)
    a = ap.parse_args()
    conn = connect_db(a.host, a.port, a.user, a.password)
    pids = [p for p in a.package_ids.split(",") if p]
    out = fetch_dq(conn, a.task_id, pids) if a.mode == "dq" else fetch_std(conn, a.task_id)
    conn.close()
    dump_json(out)
