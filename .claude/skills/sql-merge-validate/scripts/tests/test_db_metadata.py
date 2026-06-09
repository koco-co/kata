"""连库冒烟测试：需要网络可达内网测试 DB。

凭据从环境变量读取，绝不写进仓库（密码是运行期机密）：
  KATA_DB_HOST(默认 172.16.124.100) KATA_DB_PORT(默认 30882)
  KATA_DB_USER(默认 root) KATA_DB_PASSWORD(必填，未设置则跳过)

运行：KATA_DB_PASSWORD='***' python3 .../tests/test_db_metadata.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from common import connect_db
from db_metadata import fetch_dq, fetch_std

_HOST = os.environ.get("KATA_DB_HOST", "172.16.124.100")
_PORT = os.environ.get("KATA_DB_PORT", "30882")
_USER = os.environ.get("KATA_DB_USER", "root")
_PASSWORD = os.environ.get("KATA_DB_PASSWORD")

# 未提供密码 → 跳过（不可达或缺凭据都跳过，绝不硬编码机密）
if not _PASSWORD:
    print("SKIP test_db_metadata (KATA_DB_PASSWORD not set)")
    sys.exit(0)

try:
    _conn = connect_db(_HOST, _PORT, _USER, _PASSWORD)
except Exception as e:
    print(f"SKIP test_db_metadata (db unreachable): {e}")
    sys.exit(0)

# ─── 断言 ───

result = fetch_dq(_conn, "4471", ["4622", "4623", "4624"])

# fetch_std 结构性冒烟：落标表当前为空，仅验证查询合法、返回 shape 正确，
# 不做端到端断言（std 端到端在本环境无数据可验，见设计文档诚实声明）。
std_result = fetch_std(_conn, 999999)
assert isinstance(std_result.get("packages"), list), "fetch_std must return {'packages': list}"

_conn.close()

rules = result["rules"]
functions = result["functions"]

# 13 条规则，横跨三个 package
assert len(rules) == 13, f"expected 13 rules, got {len(rules)}"

# functions 字典 47 条
assert len(functions) == 47, f"expected 47 functions, got {len(functions)}"

# fn26（length_str）已确认可合并、入文档白名单
assert functions["26"]["mergeable"] is True, "fn26 should be mergeable (whitelisted)"

# package 4622 的规则 mergeGroupKey 全为 'eUvlyF1G'
pkg4622_rules = [r for r in rules if r["packageId"] == 4622]
assert len(pkg4622_rules) == 5, f"expected 5 rules for pkg 4622, got {len(pkg4622_rules)}"
for r in pkg4622_rules:
    assert r["mergeGroupKey"] == "eUvlyF1G", \
        f"pkg4622 rule {r['ruleId']} mergeGroupKey={r['mergeGroupKey']!r}"

# package 4624 的规则 mergeGroupKey 为空，且 mergeable=False
pkg4624_rules = [r for r in rules if r["packageId"] == 4624]
assert len(pkg4624_rules) == 2, f"expected 2 rules for pkg 4624, got {len(pkg4624_rules)}"
for r in pkg4624_rules:
    assert r["mergeGroupKey"] == "", \
        f"pkg4624 rule {r['ruleId']} mergeGroupKey={r['mergeGroupKey']!r} should be empty"
    assert r["mergeable"] is False, \
        f"pkg4624 rule {r['ruleId']} should not be mergeable"

print("OK test_db_metadata")
