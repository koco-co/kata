"""dq 模式：调 packagelist + 逐包 packagesql，输出 packages.json 到 stdout。"""
import argparse, json, ssl, sys, os, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from common import dump_json

def _post(base, path, cookie, project_id, body):
    req = urllib.request.Request(
        base.rstrip("/") + path, data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json;charset=UTF-8", "Accept": "*/*",
                 "Accept-Language": "zh", "Cookie": cookie, "X-Valid-Project-ID": str(project_id)})
    ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return json.loads(r.read().decode())

def fetch(base, cookie, project_id, monitor_id):
    pl = _post(base, "/dassets/v1/valid/monitor/packagelist", cookie, project_id, {"monitorId": str(monitor_id)})
    if not pl.get("success"):
        raise SystemExit("packagelist 失败（cookie 失效？）: %s" % pl.get("message"))
    packages = []
    for p in pl["data"]:
        ps = _post(base, "/dassets/v1/valid/monitor/packagesql", cookie, project_id, {"packageId": str(p["packageId"])})
        packages.append({"packageId": int(p["packageId"]), "packageName": p.get("packageName", ""),
                         "sql": ps.get("data", "")})
    return {"mode": "dq", "taskId": str(monitor_id), "packages": packages}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True); ap.add_argument("--cookie", required=True)
    ap.add_argument("--project-id", required=True); ap.add_argument("--monitor-id", required=True)
    a = ap.parse_args()
    dump_json(fetch(a.base, a.cookie, a.project_id, a.monitor_id))
