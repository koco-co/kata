"""LTQC pipeline unit tests (stdlib unittest)."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

THIS = Path(__file__).resolve().parent


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, THIS / f"{name}.py")
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rules = _load("rules")


class TestPairing(unittest.TestCase):
    def test_pairs_by_index_with_angle_brackets(self):
        step = '1. 点击页码\n2. 点击"<"\n3. 点击">"\n4. 切换每页展示数量'
        exp = "1. 跳转\n2. 向前翻页\n3. 向后翻页\n4. 每页展示记录数为切换后的数量"
        pairs = rules.pair_steps(step, exp)
        self.assertEqual(len(pairs), 4)
        self.assertEqual(pairs[1], (2, '点击"<"', "向前翻页"))
        self.assertEqual(pairs[2], (3, '点击">"', "向后翻页"))

    def test_multiline_item_kept(self):
        step = "1. 进入页面\n继续说明\n2. 保存"
        exp = "1. 成功\n2. 成功"
        pairs = rules.pair_steps(step, exp)
        self.assertEqual(pairs[0], (1, "进入页面\n继续说明", "成功"))

    def test_unnumbered_single_cell_falls_back_to_one(self):
        pairs = rules.pair_steps("只有一步", "只有一个预期")
        self.assertEqual(pairs, [(1, "只有一步", "只有一个预期")])


class TestCellToMd(unittest.TestCase):
    def test_newline_to_br_and_pipe_escape(self):
        self.assertEqual(rules.cell_to_md("a\nb|c"), "a<br>b\\|c")

    def test_angle_brackets_preserved(self):
        self.assertEqual(rules.cell_to_md('点击"<"'), '点击"<"')

    def test_empty(self):
        self.assertEqual(rules.cell_to_md(""), "")


class TestMenuRename(unittest.TestCase):
    def test_simple_renames(self):
        self.assertEqual(rules.apply_menu_rename("进入概览页"), "进入总览页")
        self.assertEqual(rules.apply_menu_rename("规则任务配置"), "规则任务管理")
        self.assertEqual(rules.apply_menu_rename("任务实例查询"), "校验结果查询")

    def test_report_rename_with_guards(self):
        self.assertEqual(rules.apply_menu_rename("查看质量报告"), "查看数据质量报告")
        # 不改具体页面名「质量报告管理」
        self.assertEqual(rules.apply_menu_rename("质量报告管理"), "质量报告管理")
        # 不重复加前缀
        self.assertEqual(rules.apply_menu_rename("数据质量报告"), "数据质量报告")


if __name__ == "__main__":
    unittest.main()
