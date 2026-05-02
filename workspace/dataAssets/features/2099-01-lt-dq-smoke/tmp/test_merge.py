"""Tests for tmp/merge.py."""
from __future__ import annotations

import importlib.util
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("mg", THIS_DIR / "merge.py")
mg = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mg)


def _write(path: Path, body: str) -> Path:
    path.write_text(body, encoding="utf-8")
    return path


def test_extract_yaml_frontmatter():
    src = """---
suite_name: "x"
---

## Section
body
"""
    fm, rest = mg.split_frontmatter(src)
    assert fm == '---\nsuite_name: "x"\n---\n'
    assert rest.startswith("\n## Section\n")


def test_extract_section_block():
    src = """## A
A body
## B
B body
## C
C body
"""
    block = mg.extract_section(src, "## A")
    assert block.rstrip() == "## A\nA body"
    block = mg.extract_section(src, "## B")
    assert block.rstrip() == "## B\nB body"
    block = mg.extract_section(src, "## C")
    assert block.rstrip() == "## C\nC body"


def test_merge_B_with_staging(tmp_path):
    src = tmp_path / "B.md"
    _write(
        src,
        """---
suite_name: "B"
---

## v6.4.3
old v6.4.3
## v6.4.4
old v6.4.4
## v6.4.10
old v6.4.10
""",
    )
    staging_dir = tmp_path / "staging"
    staging_dir.mkdir()
    _write(staging_dir / "B_v6.4.3.md", "## v6.4.3\nNEW v6.4.3 content\n")
    _write(staging_dir / "B_v6.4.4.md", "## v6.4.4\nNEW v6.4.4 content\n")
    _write(staging_dir / "B_v6.4.10.md", "## v6.4.10\nNEW v6.4.10 content\n")

    mg.merge_b(src, staging_dir, versions=["v6.4.3", "v6.4.4", "v6.4.10"])
    out = src.read_text(encoding="utf-8")
    assert "old v6.4.3" not in out
    assert "NEW v6.4.3 content" in out
    assert "NEW v6.4.4 content" in out
    assert "NEW v6.4.10 content" in out
    assert out.startswith("---\nsuite_name: \"B\"\n---\n")


def test_merge_A_with_staging_and_empty_dq(tmp_path):
    src = tmp_path / "A.md"
    _write(
        src,
        """---
suite_name: "A"
---

## 通用前置条件
preamble
## 元数据
OLD 元数据
## 数据质量
OLD 数据质量
### 总览
keep overview
### 旧规则库
drop old dq leaf
## 数据安全
OLD 数据安全
""",
    )
    staging_dir = tmp_path / "staging"
    staging_dir.mkdir()
    _write(staging_dir / "A_元数据.md", "## 元数据\nNEW 元数据\n")
    _write(staging_dir / "A_数据安全.md", "## 数据安全\nNEW 数据安全\n")

    mg.merge_a(src, staging_dir, modules=["元数据", "数据安全"])
    out = src.read_text(encoding="utf-8")
    assert "OLD 元数据" not in out
    assert "OLD 数据安全" not in out
    assert "NEW 元数据" in out
    assert "NEW 数据安全" in out
    assert "## 数据质量\n" in out
    assert "OLD 数据质量" not in out
    assert "### 总览\nkeep overview" in out
    assert "drop old dq leaf" not in out
    assert "## 通用前置条件\npreamble" in out


def test_merge_fails_when_staging_missing(tmp_path):
    src = tmp_path / "B.md"
    _write(src, "---\nfoo: bar\n---\n\n## v6.4.3\nbody\n")
    staging_dir = tmp_path / "staging"
    staging_dir.mkdir()
    import pytest

    with pytest.raises(FileNotFoundError):
        mg.merge_b(src, staging_dir, versions=["v6.4.3"])
