"""LTQC pipeline unit tests (stdlib unittest)."""
from __future__ import annotations

import importlib.util
import json
import sys
import unittest
import zipfile
from pathlib import Path

THIS = Path(__file__).resolve().parent


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, THIS / f"{name}.py")
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


rules = _load("rules")
pipeline = _load("pipeline")


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


class TestRowToCase(unittest.TestCase):
    def test_basic_row(self):
        row = {
            "用例标题": "数据质量 质量报告 验证「质量报告」查询功能正常",
            "相关需求": "元数据、数据质量支持doris3.x(#9346)",
            "前置条件": "无",
            "步骤": '1. 进入概览\n2. 点击"<"',
            "预期": "1. 成功\n2. 向前翻页",
            "优先级": "P1",
            "所属模块": "数据质量/质量报告",
        }
        c = pipeline.row_to_case(row, version="v6.4.3")
        self.assertEqual(c.version, "v6.4.3")
        self.assertEqual(c.requirement_id, "9346")
        self.assertEqual(c.requirement_name, "元数据、数据质量支持doris3.x")
        self.assertEqual(c.priority, "P1")
        self.assertEqual(c.title, "验证「数据质量报告」查询功能正常")
        self.assertEqual(c.steps[0].step, "进入总览")
        self.assertEqual(c.steps[1].step, '点击"<"')
        self.assertEqual(c.steps[1].expected, "向前翻页")

    def test_priority_default_p2(self):
        row = {"用例标题": "x", "相关需求": "需求(#1)", "前置条件": "",
               "步骤": "1. a", "预期": "1. b", "优先级": "", "所属模块": ""}
        self.assertEqual(pipeline.row_to_case(row, "v1").priority, "P2")


class TestDedup(unittest.TestCase):
    def _case(self, title, steps, version="v1"):
        return pipeline.Case(
            version=version, requirement_id="1", requirement_name="r",
            module="数据质量", submodule="数据质量报告", title=title,
            priority="P1", preconditions="无",
            steps=[pipeline.Step(i + 1, s, "ok") for i, s in enumerate(steps)],
        )

    def test_dedup_keeps_richest(self):
        a = self._case("验证查询", ["进入"], version="v6.4.3")
        b = self._case("验证查询", ["进入", "更多步骤"], version="v6.4.9")
        out = pipeline.dedup([a, b])
        self.assertEqual(len(out), 1)
        self.assertEqual(len(out[0].steps), 2)

    def test_distinct_kept(self):
        a = self._case("验证查询", ["进入"])
        b = self._case("验证下载", ["进入"])
        self.assertEqual(len(pipeline.dedup([a, b])), 2)


class TestRenderCase(unittest.TestCase):
    def test_render_block(self):
        c = pipeline.Case(
            version="v1", requirement_id="1", requirement_name="r",
            module="数据质量", submodule="数据质量报告",
            title="验证查询功能正常", priority="P1", preconditions="无",
            steps=[pipeline.Step(1, "进入页面", "进入成功"),
                   pipeline.Step(2, ' 点击"<" ', "向前翻页")],
        )
        md = pipeline.render_case_md(c)
        self.assertIn("##### 【P1】验证查询功能正常", md)
        self.assertIn("> 前置条件", md)
        self.assertIn("> 用例步骤", md)
        self.assertIn("| 编号 | 步骤 | 预期 |", md)
        self.assertIn('| 2 | 点击"<" | 向前翻页 |', md)


class TestRenderB(unittest.TestCase):
    def test_grouping_and_no_id(self):
        cases = [
            pipeline.Case("v6.4.3", "9346", "支持doris3.x", "数据质量", "报告",
                          "验证A", "P1", "无", [pipeline.Step(1, "a", "b")]),
            pipeline.Case("v6.4.3", "9346", "支持doris3.x", "数据质量", "报告",
                          "验证B", "P2", "无", [pipeline.Step(1, "a", "b")]),
            pipeline.Case("v6.4.4", "9341", "报告管理", "数据质量", "报告",
                          "验证C", "P1", "无", [pipeline.Step(1, "a", "b")]),
        ]
        md = pipeline.render_b_md(cases, suite_name="岚图已上线需求主流程用例")
        self.assertIn("case_count: 3", md)
        self.assertIn("## v6.4.3", md)
        self.assertIn("### 支持doris3.x", md)
        self.assertNotIn("(#9346)", md)
        self.assertIn("## v6.4.4", md)
        self.assertLess(md.index("## v6.4.3"), md.index("## v6.4.4"))


class TestRenderA(unittest.TestCase):
    def test_dq_module_with_submodules(self):
        cases = [
            pipeline.Case("v1", "1", "r", "数据质量", "规则任务管理",
                          "验证任务创建", "P1", "无", [pipeline.Step(1, "a", "b")]),
            pipeline.Case("v1", "1", "r", "数据质量", "规则集管理",
                          "验证规则集", "P1", "无", [pipeline.Step(1, "a", "b")]),
        ]
        kept = "## 资产盘点\n\n##### 【P3】验证旧用例\n\n> 前置条件\n\n```\n无\n```\n"
        md = pipeline.render_a_md(cases, kept_modules_md=[kept])
        self.assertIn("## 资产盘点", md)
        self.assertIn("## 数据质量", md)
        self.assertIn("### 规则任务管理", md)
        self.assertIn("### 规则集管理", md)
        self.assertIn("##### 【P1】验证任务创建", md)


class TestParseExistingMd(unittest.TestCase):
    def test_parse_module_cases(self):
        md = (
            "## 元数据\n\n"
            "##### 【P2】验证 X\n\n> 前置条件\n\n```\n无\n```\n\n"
            "> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n"
            "| 1 | 进入概览 | 成功 |\n"
        )
        mod_name, cases = pipeline.parse_existing_module(md)
        self.assertEqual(mod_name, "元数据")
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].priority, "P2")
        self.assertEqual(cases[0].steps[0].step, "进入总览")


class TestXmind(unittest.TestCase):
    def test_marker_map(self):
        self.assertEqual(pipeline.MARKER_MAP["P0"], "priority-1")
        self.assertEqual(pipeline.MARKER_MAP["P1"], "priority-2")
        self.assertEqual(pipeline.MARKER_MAP["P2"], "priority-3")
        self.assertEqual(pipeline.MARKER_MAP["P3"], "priority-4")

    def test_case_node_structure(self):
        c = pipeline.Case("v1", "1", "r", "数据质量", "报告", "验证X", "P1",
                          "无", [pipeline.Step(1, "进入", "成功")])
        node = pipeline.case_to_node(c)
        self.assertEqual(node["title"], "验证X")
        self.assertEqual(node["markers"], [{"markerId": "priority-2"}])
        step = node["children"]["attached"][0]
        self.assertEqual(step["title"], "进入")
        self.assertEqual(step["children"]["attached"][0]["title"], "成功")

    def test_write_and_reopen(self):
        out = THIS / "_xmind_test.xmind"
        try:
            pipeline.write_xmind(out, root_title="T",
                                 l1_nodes=[{"id": "x", "title": "L1"}])
            with zipfile.ZipFile(out) as z:
                names = set(z.namelist())
                self.assertIn("content.json", names)
                self.assertIn("metadata.json", names)
                self.assertIn("manifest.json", names)
                content = json.loads(z.read("content.json"))
                self.assertEqual(content[0]["rootTopic"]["title"], "T")
        finally:
            out.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
