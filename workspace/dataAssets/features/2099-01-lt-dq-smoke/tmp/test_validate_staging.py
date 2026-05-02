"""Tests for tmp/validate-staging.py."""
from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

THIS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("vs", THIS_DIR / "validate-staging.py")
vs = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = vs
SPEC.loader.exec_module(vs)


class ValidateStagingTests(unittest.TestCase):
    def test_scan_file_flags_placeholder_and_provenance(self) -> None:
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "case.md"
            path.write_text("##### 【P1】case\nTODO\nSourceRef case.archive@1:L1\n", encoding="utf-8")

            issues = vs.scan_file(path)

        self.assertEqual([issue.kind for issue in issues], ["placeholder", "provenance", "provenance"])

    def test_case_count_matches_expected(self) -> None:
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "case.md"
            path.write_text("##### 【P1】A\n\n##### 【P2】B\n", encoding="utf-8")

            issues = vs.check_case_count(path, 2)

        self.assertEqual(issues, [])

    def test_collect_targets_includes_final_files_and_optional_staging(self) -> None:
        with TemporaryDirectory() as tmp:
            feature = Path(tmp)
            (feature / "岚图主流程用例整理.md").write_text("", encoding="utf-8")
            (feature / "岚图已上线需求主流程用例.md").write_text("", encoding="utf-8")
            staging = feature / "tmp" / "staging"
            staging.mkdir(parents=True)
            (staging / "B_v6.4.8.md").write_text("", encoding="utf-8")
            (staging / "B_v6.4.8.report.md").write_text("", encoding="utf-8")

            targets = [path.relative_to(feature).as_posix() for path in vs.collect_targets(feature)]

        self.assertEqual(
            targets,
            [
                "岚图主流程用例整理.md",
                "岚图已上线需求主流程用例.md",
                "tmp/staging/B_v6.4.8.md",
            ],
        )


if __name__ == "__main__":
    unittest.main()
