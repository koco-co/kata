"""Tests for tmp/normalize-format.py."""
from __future__ import annotations

import importlib.util
from pathlib import Path

THIS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("nf", THIS_DIR / "normalize-format.py")
nf = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(nf)


def test_inline_numbered_list_in_cell():
    cell = "支持配置:1) A 必填2) B 可选3) 按钮: 取消/下一步"
    expected = "支持配置:<br>1) A 必填<br>2) B 可选<br>3) 按钮: 取消/下一步"
    assert nf.normalize_cell(cell) == expected


def test_inline_numbered_list_after_prefix():
    cell = "返回值:1) success2) fail"
    expected = "返回值:<br>1) success<br>2) fail"
    assert nf.normalize_cell(cell) == expected


def test_preserves_existing_br():
    cell = "已经分行:<br>1) A<br>2) B"
    assert nf.normalize_cell(cell) == cell


def test_preserves_existing_br_after_open_paren():
    cell = "A(<br>1) B"
    assert nf.normalize_cell(cell) == cell


def test_preserves_existing_br_after_numeric_literal():
    cell = "版本1000000<br>1) B"
    assert nf.normalize_cell(cell) == cell


def test_preserves_existing_br_before_numbered_item_reference():
    cell = "等到符合<br>1)中的第一个日期后"
    assert nf.normalize_cell(cell) == cell


def test_literal_newline_to_br():
    cell = "line1\nline2\nline3"
    expected = "line1<br>line2<br>line3"
    assert nf.normalize_cell(cell) == expected


def test_crlf_to_br():
    cell = "line1\r\nline2"
    expected = "line1<br>line2"
    assert nf.normalize_cell(cell) == expected


def test_does_not_split_inside_word():
    # "Step1" should not become "Step<br>1)" (the trailing ) is missing)
    cell = "Step1 something"
    assert nf.normalize_cell(cell) == "Step1 something"


def test_does_not_split_sql_function_call():
    cell = "SQL验证: COUNT(1) OVER(PARTITION BY order_id)"
    assert nf.normalize_cell(cell) == cell


def test_does_not_split_numeric_literal_before_paren():
    cell = "WHERE guide_price > 1000000)"
    assert nf.normalize_cell(cell) == cell


def test_does_not_split_reference_to_prior_numbered_item():
    cell = "等到符合1)中的第一个日期后"
    assert nf.normalize_cell(cell) == cell


def test_idempotent_on_normalized_cell():
    cell = "A<br>1) X<br>2) Y"
    assert nf.normalize_cell(nf.normalize_cell(cell)) == cell


def test_sql_fence_stripped_in_precondition(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "##### 【P1】案例\n"
        "\n"
        "> 前置条件\n"
        "\n"
        "```sql\n"
        "SELECT 1;\n"
        "```\n"
        "\n"
        "> 用例步骤\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    out = src.read_text(encoding="utf-8")
    assert "```sql" not in out
    assert "```\nSELECT 1;\n```" in out


def test_bullet_precondition_wrapped(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "##### 【P1】案例\n"
        "\n"
        "> 前置条件\n"
        "\n"
        "- 已登录系统\n"
        "- 已配置数据源\n"
        "\n"
        "> 用例步骤\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    out = src.read_text(encoding="utf-8")
    assert "- 已登录系统" not in out
    assert "```\n已登录系统\n已配置数据源\n```" in out


def test_bullet_precondition_wrapped_without_blank_line(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "##### 【P1】案例\n"
        "\n"
        "> 前置条件\n"
        "- 已登录系统\n"
        "- 已配置数据源\n"
        "\n"
        "> 用例步骤\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    out = src.read_text(encoding="utf-8")
    assert "- 已登录系统" not in out
    assert "```\n已登录系统\n已配置数据源\n```" in out


def test_bullet_precondition_wraps_indented_continuation(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "##### 【P1】案例\n"
        "\n"
        "> 前置条件\n"
        "- 准备离线 SQL 任务：\n"
        "  `CREATE TABLE t (id INT);`\n"
        "\n"
        "> 用例步骤\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    out = src.read_text(encoding="utf-8")
    assert "- 准备离线 SQL 任务：" not in out
    assert "```\n准备离线 SQL 任务：\n`CREATE TABLE t (id INT);`\n```" in out


def test_full_width_space_normalized(tmp_path):
    src = tmp_path / "x.md"
    src.write_text("hello　world\n", encoding="utf-8")
    nf.normalize_file(src)
    assert src.read_text(encoding="utf-8") == "hello world\n"


def test_idempotent_on_file(tmp_path):
    src = tmp_path / "x.md"
    src.write_text(
        "| a | b:1)x 2)y | c |\n"
        "| --- | --- | --- |\n"
        "| 1 | step | exp |\n",
        encoding="utf-8",
    )
    nf.normalize_file(src)
    first = src.read_text(encoding="utf-8")
    nf.normalize_file(src)
    second = src.read_text(encoding="utf-8")
    assert first == second
