import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import fetch_dq

def _make_post_stub(packagelist_resp, packagesql_resp):
    """返回一个替换 fetch_dq._post 的桩函数。"""
    def stub(base, path, cookie, project_id, body):
        if "packagelist" in path:
            return packagelist_resp
        return packagesql_resp
    return stub

def test_happy_path():
    pl_resp = {
        "success": True,
        "data": [
            {"packageId": "4622", "packageName": "pkgA"},
            {"packageId": "4623", "packageName": "pkgB"},
        ],
    }
    ps_resp = {"success": True, "data": "SELECT 1 -- sql for that pkg"}

    orig = fetch_dq._post
    fetch_dq._post = _make_post_stub(pl_resp, ps_resp)
    try:
        result = fetch_dq.fetch("http://x", "ck", "92", "4471")
    finally:
        fetch_dq._post = orig

    assert result["mode"] == "dq"
    assert result["taskId"] == "4471"
    assert len(result["packages"]) == 2
    assert result["packages"][0]["packageId"] == 4622  # int, not str
    assert result["packages"][0]["packageName"] == "pkgA"
    assert result["packages"][0]["sql"].startswith("SELECT")
    assert result["packages"][1]["packageId"] == 4623
    assert result["packages"][1]["packageName"] == "pkgB"

def test_failure_path():
    fail_resp = {"success": False, "message": "unauthorized"}

    orig = fetch_dq._post
    fetch_dq._post = _make_post_stub(fail_resp, {})
    try:
        raised = False
        try:
            fetch_dq.fetch("http://x", "ck", "92", "4471")
        except SystemExit:
            raised = True
    finally:
        fetch_dq._post = orig

    assert raised, "expected SystemExit when packagelist returns success=False"

if __name__ == "__main__":
    test_happy_path()
    test_failure_path()
    print("OK test_fetch_dq")
