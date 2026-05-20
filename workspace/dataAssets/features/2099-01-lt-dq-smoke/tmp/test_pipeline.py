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


class TestFillExpected(unittest.TestCase):
    def test_fill_default_for_step_without_expected(self):
        pairs = [(1, "查看文件类型支持提示", ""), (2, "点击确定", "弹窗关闭")]
        out = rules.fill_empty_expected(pairs)
        self.assertEqual(out[0], (1, "查看文件类型支持提示", "操作成功"))
        self.assertEqual(out[1], (2, "点击确定", "弹窗关闭"))

    def test_no_fill_when_step_empty(self):
        pairs = [(1, "", "")]
        self.assertEqual(rules.fill_empty_expected(pairs), [(1, "", "")])


class TestRulesetPrereq(unittest.TestCase):
    def test_detect_trigger(self):
        steps = ["进入规则任务管理，点击新建监控规则", "配置监控规则", "保存"]
        self.assertTrue(rules.needs_ruleset_prereq(steps))

    def test_no_trigger_when_import_present(self):
        steps = ["新建监控规则", "点击导入规则包，选择规则包", "保存"]
        self.assertFalse(rules.needs_ruleset_prereq(steps))

    def test_no_trigger_for_ruleset_feature_case(self):
        self.assertFalse(
            rules.needs_ruleset_prereq(["新建监控规则"], title="验证规则集详情数据正确")
        )

    def test_append_precondition(self):
        pre = "无"
        new_pre = rules.append_ruleset_precondition(pre)
        self.assertIn("规则集管理", new_pre)
        self.assertIn("导入规则包", new_pre)
        self.assertEqual(rules.append_ruleset_precondition(new_pre), new_pre)


class TestTitleHelpers(unittest.TestCase):
    def test_strip_requirement_id_only_removes_zentao_id(self):
        self.assertEqual(
            rules.strip_requirement_id("内置规则丰富-准确性校验规则(#14682)"),
            "内置规则丰富-准确性校验规则",
        )
        self.assertEqual(
            rules.strip_requirement_id("分区设置(sparkThrift/hive数据源)(#9695)"),
            "分区设置(sparkThrift/hive数据源)",
        )

    def test_strip_title_prefix(self):
        prefixes = {"数据质量", "质量报告", "校验结果查询"}
        self.assertEqual(
            rules.strip_title_prefix("数据质量 质量报告 验证查询功能正常", prefixes),
            "验证查询功能正常",
        )
        self.assertEqual(
            rules.strip_title_prefix("验证查询功能正常", prefixes),
            "验证查询功能正常",
        )

    def test_normalize_title(self):
        a = rules.normalize_title("【P1】验证「数据质量报告」查询 ")
        b = rules.normalize_title("验证(数据质量报告)查询")
        self.assertEqual(a, b)


class TestScanners(unittest.TestCase):
    def test_scan_empty_step(self):
        pairs = [(1, "", "某预期"), (2, "点击", "成功")]
        self.assertEqual(rules.scan_empty_steps(pairs), [1])

    def test_scan_residual_old_menu(self):
        hits = rules.scan_residual_old_menu("进入任务实例查询页面")
        self.assertIn("任务实例查询", hits)
        self.assertEqual(rules.scan_residual_old_menu("进入校验结果查询"), [])

    def test_scan_datasource_loss(self):
        miss = rules.scan_datasource_loss(
            "分区设置(sparkThrift/hive数据源)", "仅 hive 数据源相关步骤"
        )
        self.assertEqual(miss, ["sparkThrift"])
        self.assertEqual(
            rules.scan_datasource_loss("普通标题", "无数据源声明"), []
        )

    def test_scan_packed_config_line(self):
        line = "「字段」a「统计函数」b「过滤条件」c"
        self.assertTrue(rules.is_packed_config_line(line))
        self.assertFalse(rules.is_packed_config_line("「字段」a"))


if __name__ == "__main__":
    unittest.main()
