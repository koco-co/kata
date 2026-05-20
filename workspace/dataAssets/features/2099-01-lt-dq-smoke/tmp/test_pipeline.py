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
validate = _load("validate")


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
            "相关需求": "",
            "前置条件": "无",
            "步骤": '1. 进入概览\n2. 点击"<"',
            "预期": "1. 成功\n2. 向前翻页",
            "优先级": "P1",
            "所属模块": "/版本迭代测试用例/v6.4.3/元数据、数据质量支持doris3.x(#9346)",
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
        # module/submodule: single filtered seg → fallback module
        self.assertEqual(c.module, "数据质量")
        self.assertEqual(c.submodule, "")

    def test_basic_row_with_submodule(self):
        """Path with 2 filtered segs: module=first, submodule='' (last seg is req_name).
        Path with 3+ filtered segs: module=first, submodule=second."""
        row = {
            "用例标题": "验证X",
            "相关需求": "",
            "前置条件": "无",
            "步骤": "1. a",
            "预期": "1. b",
            "优先级": "P2",
            "所属模块": "/版本迭代测试用例/v6.4.4/多模态-文件管理/文件编目(#9586)",
        }
        c = pipeline.row_to_case(row, version="v6.4.4")
        self.assertEqual(c.requirement_id, "9586")
        self.assertEqual(c.requirement_name, "文件编目")
        # 2 filtered segs ["多模态-文件管理", "文件编目"] → module=first, submodule=""
        self.assertEqual(c.module, "多模态-文件管理")
        self.assertEqual(c.submodule, "")

    def test_basic_row_three_filtered_segs(self):
        """Path with 3 filtered segs produces module + submodule + req_name."""
        row = {
            "用例标题": "验证Y",
            "相关需求": "",
            "前置条件": "无",
            "步骤": "1. a",
            "预期": "1. b",
            "优先级": "P2",
            "所属模块": "/版本迭代测试用例/v6.4.4/数据质量/规则集管理/验证功能(#1234)",
        }
        c = pipeline.row_to_case(row, version="v6.4.4")
        self.assertEqual(c.requirement_id, "1234")
        self.assertEqual(c.requirement_name, "验证功能")
        self.assertEqual(c.module, "数据质量")
        self.assertEqual(c.submodule, "规则集管理")

    def test_paren_protected_slash(self):
        """Slashes inside parentheses are not split points."""
        row = {
            "用例标题": "验证分区",
            "相关需求": "",
            "前置条件": "无",
            "步骤": "1. a",
            "预期": "1. b",
            "优先级": "P2",
            "所属模块": "/版本迭代测试用例/v6.4.5/岚图/分区设置支持选择框配置动态分区参数(sparkThrift/hive数据源)(#9695)",
        }
        c = pipeline.row_to_case(row, version="v6.4.5")
        self.assertEqual(c.requirement_id, "9695")
        self.assertEqual(c.requirement_name, "分区设置支持选择框配置动态分区参数(sparkThrift/hive数据源)")

    def test_priority_default_p2(self):
        row = {"用例标题": "x", "相关需求": "", "前置条件": "",
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

    def test_precondition_block_expands_br(self):
        c = pipeline.Case(
            version="v1", requirement_id="1", requirement_name="r",
            module="数据质量", submodule="数据质量报告",
            title="验证查询功能正常", priority="P1", preconditions="第一行<br />第二行<br/>第三行",
            steps=[],
        )
        md = pipeline.render_case_md(c)
        self.assertIn("第一行\n第二行\n第三行", md)
        self.assertNotIn("<br", md)

    def test_empty_step_and_expected_are_explicit_placeholders(self):
        c = pipeline.Case(
            version="v1", requirement_id="1", requirement_name="r",
            module="数据质量", submodule="数据质量报告",
            title="验证查询功能正常", priority="P1", preconditions="无",
            steps=[pipeline.Step(1, "", "")],
        )
        md = pipeline.render_case_md(c)
        node = pipeline.case_to_node(c)
        step = node["children"]["attached"][0]
        self.assertIn(pipeline.EMPTY_STEP_TEXT, md)
        self.assertIn(pipeline.EMPTY_EXPECTED_TEXT, md)
        self.assertEqual(step["title"], pipeline.EMPTY_STEP_TEXT)
        self.assertEqual(step["children"]["attached"][0]["title"], pipeline.EMPTY_EXPECTED_TEXT)

    def test_precondition_nested_code_fence_uses_longer_outer_fence(self):
        c = pipeline.Case(
            version="v1", requirement_id="1", requirement_name="r",
            module="数据质量", submodule="数据质量报告",
            title="验证查询功能正常", priority="P1",
            preconditions="说明\n```csv\nid\n1\n```",
            steps=[],
        )
        md = pipeline.render_case_md(c)
        self.assertIn("\n````\n说明\n```csv\nid\n1\n```\n````\n", md)


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
    def test_dq_module_with_requirement_groups(self):
        cases = [
            pipeline.Case("v1", "1", "需求甲", "数据质量", "规则任务管理",
                          "验证任务创建", "P1", "无", [pipeline.Step(1, "a", "b")]),
            pipeline.Case("v1", "1", "需求乙", "数据质量", "规则集管理",
                          "验证规则集", "P1", "无", [pipeline.Step(1, "a", "b")]),
        ]
        kept = "### 资产盘点\n\n##### 【P3】验证旧用例\n\n> 前置条件\n\n```\n无\n```\n"
        md = pipeline.render_a_md(cases, kept_modules_md=[kept])
        self.assertIn("### 资产盘点", md)
        self.assertIn("### 数据质量", md)
        self.assertIn("#### 需求甲", md)
        self.assertIn("#### 需求乙", md)
        self.assertIn("##### 【P1】验证任务创建", md)


class TestParseExistingMd(unittest.TestCase):
    def test_parse_module_cases(self):
        md = (
            "### 元数据\n\n"
            "##### 【P2】验证 X\n\n> 前置条件\n\n```\n无\n```\n\n"
            "> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n"
            "| 1 | 进入概览 | 成功 |\n"
        )
        mod_name, cases = pipeline.parse_existing_module(md)
        self.assertEqual(mod_name, "元数据")
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].priority, "P2")
        self.assertEqual(cases[0].steps[0].step, "进入总览")

    def test_parse_nested_precondition_fence(self):
        md = (
            "### 数据质量\n\n"
            "##### 【P1】验证 X\n\n> 前置条件\n\n````\n"
            "说明\n```csv\nid\n1\n```\n````\n\n"
            "> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n"
            "| 1 | 进入 | 成功 |\n"
        )
        _mod, cases = pipeline.parse_existing_module(md)
        self.assertEqual(cases[0].preconditions, "说明\n```csv\nid\n1\n```")


class TestXmind(unittest.TestCase):
    def test_marker_map(self):
        self.assertEqual(pipeline.ONLINE_MARKER_MAP["P0"], "priority-1")
        self.assertEqual(pipeline.ONLINE_MARKER_MAP["P1"], "priority-2")
        self.assertEqual(pipeline.ONLINE_MARKER_MAP["P2"], "priority-3")
        self.assertEqual(pipeline.ONLINE_MARKER_MAP["P3"], "priority-4")
        self.assertEqual(pipeline.MAINFLOW_MARKER_MAP["P0"], "priority-1")
        self.assertEqual(pipeline.MAINFLOW_MARKER_MAP["P1"], "priority-1")
        self.assertEqual(pipeline.MAINFLOW_MARKER_MAP["P2"], "priority-2")
        self.assertEqual(pipeline.MAINFLOW_MARKER_MAP["P3"], "priority-3")

    def test_case_node_structure(self):
        c = pipeline.Case("v1", "1", "r", "数据质量", "报告", "验证X", "P1",
                          "无", [pipeline.Step(1, "进入", "成功")])
        node = pipeline.case_to_node(c)
        self.assertEqual(node["class"], "topic")
        self.assertEqual(node["title"], "验证X")
        self.assertEqual(node["markers"], [{"markerId": "priority-2"}])
        step = node["children"]["attached"][0]
        self.assertEqual(step["class"], "topic")
        self.assertEqual(step["title"], "进入")
        self.assertEqual(step["children"]["attached"][0]["title"], "成功")

    def test_case_node_accepts_mainflow_marker_map(self):
        c = pipeline.Case("v1", "1", "r", "资产盘点", "",
                          "验证第一次进入资产平台弹【资产功能引导】弹窗", "P3",
                          "无", [pipeline.Step(1, "进入", "成功")])
        node = pipeline.case_to_node(c, pipeline.MAINFLOW_MARKER_MAP)
        self.assertEqual(node["markers"], [{"markerId": "priority-3"}])

    def test_xmind_text_normalizes_line_endings(self):
        self.assertEqual(pipeline._xmind_text("a\r\nb\rc<br>d<br />e<br/>f"), "a\nb\nc\nd\ne\nf")

    def test_long_precondition_is_chunked_instead_of_single_note(self):
        long_pre = "\n".join(f"SQL line {i}: " + "x" * 120 for i in range(140))
        c = pipeline.Case("v1", "1", "r", "数据质量", "报告", "验证X", "P1",
                          long_pre, [pipeline.Step(1, "进入", "成功")])
        node = pipeline.case_to_node(c)
        self.assertNotIn("notes", node)
        pre_node = node["children"]["attached"][0]
        self.assertEqual(pre_node["title"], "前置条件")
        chunks = pre_node["children"]["attached"]
        self.assertGreater(len(chunks), 1)
        self.assertTrue(all(len(chunk["title"]) <= pipeline.XMIND_CHUNK_LIMIT + 16
                            for chunk in chunks))

    def test_chunk_text_round_trips_blank_and_long_lines(self):
        text = "a\n\nb\n" + ("x" * (pipeline.XMIND_CHUNK_LIMIT + 20))
        chunks = pipeline._chunk_text(text)
        self.assertGreater(len(chunks), 1)
        self.assertEqual("".join(chunks), pipeline._xmind_text(text).strip())

    def test_long_step_title_is_chunked(self):
        long_step = "SQL验证:" + "x" * (pipeline.XMIND_TITLE_LIMIT + 100)
        c = pipeline.Case("v1", "1", "r", "数据质量", "报告", "验证X", "P1",
                          "无", [pipeline.Step(1, long_step, "成功")])
        node = pipeline.case_to_node(c)
        step = node["children"]["attached"][0]
        self.assertIn("内容较长", step["title"])
        self.assertLess(len(step["title"]), 320)
        self.assertEqual(step["children"]["attached"][0]["title"], "完整内容")
        self.assertEqual(step["children"]["attached"][-1]["title"], "成功")

    def test_write_and_reopen(self):
        out = THIS / "_xmind_test.xmind"
        try:
            pipeline.write_xmind(out, root_title="T",
                                 l1_nodes=[{"id": "x", "title": "L1"}])
            with zipfile.ZipFile(out) as z:
                names = set(z.namelist())
                self.assertIn("content.json", names)
                self.assertIn("metadata.json", names)
                self.assertIn("resources/", names)
                self.assertIn("manifest.json", names)
                content = json.loads(z.read("content.json"))
                self.assertEqual(content[0]["rootTopic"]["title"], "T")
                self.assertEqual(
                    content[0]["rootTopic"]["children"]["attached"][0]["class"],
                    "topic",
                )
        finally:
            out.unlink(missing_ok=True)


class TestXmindTree(unittest.TestCase):
    def test_b_tree_version_requirement(self):
        cases = [pipeline.Case("v6.4.3", "1", "需求甲", "数据质量", "报告",
                               "验证X", "P1", "无", [pipeline.Step(1, "a", "b")])]
        nodes = pipeline.build_b_l1_nodes(cases)
        self.assertEqual(nodes[0]["title"], "v6.4.3")
        req = nodes[0]["children"]["attached"][0]
        self.assertEqual(req["title"], "需求甲")
        self.assertEqual(req["children"]["attached"][0]["title"], "验证X")

    def test_a_tree_module_requirement(self):
        cases = [pipeline.Case("v1", "1", "需求甲", "数据质量", "规则任务管理",
                               "验证Y", "P1", "无", [pipeline.Step(1, "a", "b")])]
        node = pipeline.build_a_dq_node(cases)
        self.assertEqual(node["title"], "数据质量")
        sub = node["children"]["attached"][0]
        self.assertEqual(sub["title"], "需求甲")
        self.assertEqual(sub["children"]["attached"][0]["title"], "验证Y")

    def test_case_node_notes_for_precondition(self):
        c = pipeline.Case("v1", "1", "r", "数据质量", "报告", "验证X", "P1",
                          "已登录\nSparkThrift2.x", [pipeline.Step(1, "a", "b")])
        node = pipeline.case_to_node(c)
        self.assertEqual(node["notes"]["plain"]["content"], "已登录\nSparkThrift2.x")
        c2 = pipeline.Case("v1", "1", "r", "数据质量", "报告", "验证Y", "P1",
                           "无", [pipeline.Step(1, "a", "b")])
        self.assertNotIn("notes", pipeline.case_to_node(c2))

    def test_mainflow_uses_reference_hierarchy(self):
        ref = THIS / "_mainflow_ref.xmind"
        try:
            old_dq = pipeline.Case("v1", "1", "旧需求", "数据质量", "",
                                   "旧数据质量用例", "P1", "无",
                                   [pipeline.Step(1, "old", "old")])
            ref_nodes = [
                pipeline._topic("元数据", [
                    pipeline._topic("数据地图", [
                        pipeline.case_to_node(
                            pipeline.Case("v1", "1", "旧需求", "元数据", "",
                                          "旧数据地图用例", "P1", "无",
                                          [pipeline.Step(1, "old", "old")]),
                            pipeline.MAINFLOW_MARKER_MAP,
                        )
                    ])
                ]),
                pipeline._topic("数据质量", [
                    pipeline._topic("总览", [pipeline.case_to_node(old_dq, pipeline.MAINFLOW_MARKER_MAP)]),
                    pipeline._topic("数据质量报告"),
                ]),
            ]
            pipeline.write_xmind(ref, "岚图主流程用例集合", ref_nodes)
            cases = [
                pipeline.Case("v1", "1", "【数据地图】查询优化", "数据质量", "",
                              "数据地图 字段结果页 验证字段查询", "P0", "无",
                              [pipeline.Step(1, "new", "new")]),
                pipeline.Case("v1", "2", "【数据质量】报告搜索优化", "数据质量", "",
                              "报告详情页 验证报告筛选", "P0", "无",
                              [pipeline.Step(1, "new", "new")]),
            ]
            kept_cases = [
                pipeline.Case("v1", "1", "旧需求", "元数据", "",
                              "旧数据地图用例", "P1", "新前置",
                              [pipeline.Step(1, "kept", "kept")]),
            ]
            nodes = pipeline.build_a_l1_nodes_from_reference(ref, cases, kept_cases)
            metadata = next(n for n in nodes if n["title"] == "元数据")
            data_map = metadata["children"]["attached"][0]
            self.assertEqual(data_map["title"], "数据地图")
            self.assertEqual(len(data_map["children"]["attached"]), 2)
            kept = next(n for n in data_map["children"]["attached"] if n["title"] == "旧数据地图用例")
            self.assertEqual(kept["notes"]["plain"]["content"], "新前置")
            self.assertEqual(kept["children"]["attached"][0]["title"], "kept")
            dq = next(n for n in nodes if n["title"] == "数据质量")
            overview = next(n for n in dq["children"]["attached"] if n["title"] == "总览")
            self.assertNotIn("children", overview)
            report = next(n for n in dq["children"]["attached"] if n["title"] == "数据质量报告")
            self.assertEqual(report["children"]["attached"][0]["title"], "报告详情页 验证报告筛选")
        finally:
            ref.unlink(missing_ok=True)

    def test_reference_mainflow_xmind_falls_back_to_tmp_source(self):
        import shutil
        base = THIS / "_reference_lookup"
        feat = base / "2099-01-lt-dq-smoke"
        ref = feat / "tmp" / "ltqc-csv" / "岚图主流程用例整理.xmind"
        try:
            ref.parent.mkdir(parents=True, exist_ok=True)
            ref.write_text("x", encoding="utf-8")
            self.assertEqual(pipeline.reference_mainflow_xmind(feat), ref)
        finally:
            shutil.rmtree(base, ignore_errors=True)


class TestSelection(unittest.TestCase):
    def test_select_by_title(self):
        cases = [
            pipeline.Case("v1", "1", "需求甲", "数据质量", "报告", "验证X", "P1", "无", []),
            pipeline.Case("v1", "1", "需求甲", "数据质量", "报告", "验证Y", "P1", "无", []),
        ]
        sel = {"需求甲": ["验证X"]}
        out = pipeline.apply_selection(cases, sel)
        self.assertEqual([c.title for c in out], ["验证X"])

    def test_select_all_marker(self):
        cases = [pipeline.Case("v1", "1", "需求甲", "数据质量", "报告", "验证X", "P1", "无", [])]
        out = pipeline.apply_selection(cases, {"需求甲": "*"})
        self.assertEqual(len(out), 1)


class TestValidate(unittest.TestCase):
    def test_case_count_mismatch(self):
        md = '---\ncase_count: 2\n---\n\n## M\n\n##### 【P1】a\n'
        issues = validate.check_case_count(md)
        self.assertTrue(any("case count" in i for i in issues))

    def test_placeholder_and_old_menu(self):
        md = "## M\n\n##### 【P1】TODO 待补充\n步骤进入任务实例查询\n"
        issues = validate.check_placeholders(md) + validate.check_old_menu(md)
        self.assertTrue(any("placeholder" in i for i in issues))
        self.assertTrue(any("任务实例查询" in i for i in issues))

    def test_clean_doc_passes(self):
        md = '---\ncase_count: 1\n---\n\n## M\n\n##### 【P1】验证 X\n'
        self.assertEqual(validate.check_case_count(md), [])

    def test_expected_marker_distribution_mainflow(self):
        md = (
            "##### 【P0】最高\n"
            "##### 【P1】高\n"
            "##### 【P2】中\n"
            "##### 【P3】低\n"
        )
        self.assertEqual(
            validate.expected_marker_distribution(md, "岚图主流程用例整理.md"),
            {"priority-1": 2, "priority-2": 1, "priority-3": 1},
        )

    def test_expected_marker_distribution_online(self):
        md = "##### 【P0】最高\n##### 【P1】高\n##### 【P2】中\n"
        self.assertEqual(
            validate.expected_marker_distribution(md, "岚图已上线需求主流程用例.md"),
            {"priority-1": 1, "priority-2": 1, "priority-3": 1},
        )

    def test_field_consistency_detects_step_mismatch(self):
        out = THIS / "_field_mismatch.xmind"
        md = (
            "##### 【P1】验证 X\n\n> 前置条件\n\n```\n无\n```\n\n"
            "> 用例步骤\n\n| 编号 | 步骤 | 预期 |\n| --- | --- | --- |\n"
            "| 1 | 进入 | 成功 |\n"
        )
        try:
            c = pipeline.Case("v1", "1", "需求", "数据质量", "报告",
                              "验证 X", "P1", "无",
                              [pipeline.Step(1, "进入", "失败")])
            pipeline.write_xmind(out, "测试集", [pipeline._topic("需求", [
                pipeline.case_to_node(c, pipeline.ONLINE_MARKER_MAP)
            ])])
            issues = validate.check_md_xmind_field_consistency(
                md, "岚图已上线需求主流程用例.md", out
            )
            self.assertTrue(any("field mismatch" in issue for issue in issues))
        finally:
            out.unlink(missing_ok=True)

    def test_mainflow_hierarchy_detects_flattened_module(self):
        out = THIS / "_flat_mainflow.xmind"
        modules = []
        for name in validate.MAINFLOW_HIERARCHY:
            child = {"id": name, "class": "topic", "title": name}
            if name == "元数据":
                child["children"] = {"attached": [{
                    "id": "case",
                    "class": "topic",
                    "title": "被铺平的用例",
                    "markers": [{"markerId": "priority-1"}],
                }]}
            elif validate.MAINFLOW_HIERARCHY[name]:
                child["children"] = {"attached": [
                    {"id": f"{name}-{item}", "class": "topic", "title": item}
                    for item in validate.MAINFLOW_HIERARCHY[name]
                ]}
            modules.append(child)
        content = [{
            "rootTopic": {
                "id": "root",
                "class": "topic",
                "title": "岚图主流程用例集合",
                "children": {"attached": modules},
            }
        }]
        try:
            with zipfile.ZipFile(out, "w") as z:
                z.writestr("content.json", json.dumps(content, ensure_ascii=False))
            issues = validate.check_mainflow_hierarchy(out)
            self.assertTrue(any(
                "direct case nodes" in issue or "directory skeleton mismatch" in issue
                for issue in issues
            ))
        finally:
            out.unlink(missing_ok=True)

    def test_mainflow_hierarchy_compares_reference_skeleton(self):
        import shutil
        base = THIS / "_hierarchy_compare"
        ref = base / "岚图主流程用例整理.xmind"
        feature = base / "feature"
        cur = feature / "岚图主流程用例整理.xmind"
        ref_content = [{
            "rootTopic": {
                "id": "root",
                "class": "topic",
                "title": "岚图主流程用例集合",
                "children": {"attached": [{
                    "id": "m",
                    "class": "topic",
                    "title": "元数据",
                    "children": {"attached": [{"id": "menu", "class": "topic", "title": "数据地图"}]},
                }]},
            }
        }]
        cur_content = [{
            "rootTopic": {
                "id": "root",
                "class": "topic",
                "title": "岚图主流程用例集合",
                "children": {"attached": [{
                    "id": "m",
                    "class": "topic",
                    "title": "元数据",
                    "children": {"attached": [{"id": "wrong", "class": "topic", "title": "错误菜单"}]},
                }]},
            }
        }]
        try:
            feature.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(ref, "w") as z:
                z.writestr("content.json", json.dumps(ref_content, ensure_ascii=False))
            with zipfile.ZipFile(cur, "w") as z:
                z.writestr("content.json", json.dumps(cur_content, ensure_ascii=False))
            issues = validate.check_mainflow_hierarchy(cur)
            self.assertTrue(any("directory skeleton mismatch" in issue for issue in issues))
        finally:
            shutil.rmtree(base, ignore_errors=True)

    def test_mainflow_hierarchy_uses_tmp_source_reference(self):
        import shutil
        base = THIS / "_hierarchy_tmp_compare"
        feature = base / "feature"
        tmp_ref = feature / "tmp" / "ltqc-csv" / "岚图主流程用例整理.xmind"
        cur = feature / "岚图主流程用例整理.xmind"
        ref_content = [{
            "rootTopic": {
                "id": "root",
                "class": "topic",
                "title": "岚图主流程用例集合",
                "children": {"attached": [{
                    "id": "m",
                    "class": "topic",
                    "title": "元数据",
                    "children": {"attached": [{"id": "menu", "class": "topic", "title": "数据地图"}]},
                }]},
            }
        }]
        try:
            tmp_ref.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(tmp_ref, "w") as z:
                z.writestr("content.json", json.dumps(ref_content, ensure_ascii=False))
            with zipfile.ZipFile(cur, "w") as z:
                z.writestr("content.json", json.dumps(ref_content, ensure_ascii=False))
            self.assertEqual(validate.check_mainflow_hierarchy(cur), [])
        finally:
            shutil.rmtree(base, ignore_errors=True)

    def test_xmind_structure_issues_detect_opening_risks(self):
        out = THIS / "_bad_structure.xmind"
        content = [{
            "rootTopic": {
                "title": "root",
                "children": {
                    "attached": [{
                        "title": "x" * (validate.MAX_XMIND_TITLE_LEN + 1),
                        "markers": [{"markerId": "priority-1"}],
                        "notes": {"plain": {
                            "content": "n" * (validate.MAX_XMIND_NOTE_LEN + 1)
                        }},
                    }]
                },
            }
        }]
        try:
            with zipfile.ZipFile(out, "w") as z:
                z.writestr("content.json", json.dumps(content, ensure_ascii=False))
                z.writestr("metadata.json", "{}")
                z.writestr("manifest.json", "{}")
            issues = validate.xmind_structure_issues(out)
            self.assertTrue(any("missing resources" in issue for issue in issues))
            self.assertTrue(any("missing class" in issue for issue in issues))
            self.assertTrue(any("title too long" in issue for issue in issues))
            self.assertTrue(any("note too long" in issue for issue in issues))
        finally:
            out.unlink(missing_ok=True)


class TestCliEndToEnd(unittest.TestCase):
    def test_build_b_from_csv(self):
        import csv as csvmod
        tmpdir = THIS / "_csv_test"
        tmpdir.mkdir(exist_ok=True)
        csv_path = tmpdir / "v643.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as f:
            w = csvmod.writer(f)
            w.writerow(["用例标题", "相关需求", "前置条件", "步骤", "预期",
                        "优先级", "所属模块"])
            w.writerow(["验证查询", "", "无",
                        '1. 进入\n2. 点击"<"', "1. 成功\n2. 向前翻页",
                        "P1", "/版本迭代测试用例/v6.4.3/支持doris3.x(#9346)"])
        try:
            cases = pipeline.dedup(pipeline.extract_dir(tmpdir))
            md = pipeline.render_b_md(cases, "测试集")
            self.assertIn("### 支持doris3.x", md)
            self.assertIn('| 2 | 点击"<" | 向前翻页 |', md)
            xpath = tmpdir / "out.xmind"
            pipeline.write_xmind(xpath, "测试集", pipeline.build_b_l1_nodes(cases))
            self.assertTrue(xpath.exists())
        finally:
            import shutil
            shutil.rmtree(tmpdir)


if __name__ == "__main__":
    unittest.main()
