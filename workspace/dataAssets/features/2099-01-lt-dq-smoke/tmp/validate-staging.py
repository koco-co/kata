#!/usr/bin/env python3
"""Validate LTQC final archives and optional local staging files."""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

FINAL_ARCHIVES = [
    "岚图主流程用例整理.md",
    "岚图已上线需求主流程用例.md",
]
PLACEHOLDER_RE = re.compile(r"TODO|待补充|待确认|FIXME")
PROVENANCE_RE = re.compile(r"SourceRef|case\.archive@1|csv::|\bSR-[A-Z0-9-]+")
CASE_RE = re.compile(r"^##### 【P\d+】", re.MULTILINE)
FRONTMATTER_CASE_COUNT_RE = re.compile(r"^case_count:\s*(\d+)\s*$", re.MULTILINE)


@dataclass(frozen=True)
class Issue:
    path: Path
    kind: str
    line: int
    message: str


def line_number(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def scan_file(path: Path) -> list[Issue]:
    text = path.read_text(encoding="utf-8")
    issues: list[Issue] = []
    for regex, kind, message in [
        (PLACEHOLDER_RE, "placeholder", "placeholder text is not allowed"),
        (PROVENANCE_RE, "provenance", "presentation text must not expose provenance locators"),
    ]:
        for match in regex.finditer(text):
            issues.append(Issue(path, kind, line_number(text, match.start()), message))
    return issues


def declared_case_count(path: Path) -> int | None:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER_CASE_COUNT_RE.search(text)
    return int(match.group(1)) if match else None


def actual_case_count(path: Path) -> int:
    return len(CASE_RE.findall(path.read_text(encoding="utf-8")))


def check_case_count(path: Path, expected: int) -> list[Issue]:
    actual = actual_case_count(path)
    if actual == expected:
        return []
    return [
        Issue(
            path,
            "case_count",
            1,
            f"case count mismatch: expected {expected}, actual {actual}",
        )
    ]


def collect_targets(feature: Path) -> list[Path]:
    targets = [feature / name for name in FINAL_ARCHIVES if (feature / name).exists()]
    staging = feature / "tmp" / "staging"
    if staging.exists():
        targets.extend(sorted(path for path in staging.glob("*.md") if not path.name.endswith(".report.md")))
    return targets


def validate_feature(feature: Path) -> list[Issue]:
    issues: list[Issue] = []
    for target in collect_targets(feature):
        issues.extend(scan_file(target))
        expected = declared_case_count(target)
        if expected is not None:
            issues.extend(check_case_count(target, expected))
        elif "tmp/staging" in target.as_posix() and actual_case_count(target) == 0:
            issues.append(Issue(target, "case_count", 1, "staging file has no test cases"))
    return issues


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--feature",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="LTQC feature directory to validate",
    )
    args = parser.parse_args(argv[1:])

    feature = args.feature.resolve()
    issues = validate_feature(feature)
    for issue in issues:
        print(f"{issue.path}:{issue.line} [{issue.kind}] {issue.message}", file=sys.stderr)
    print(f"validated {len(collect_targets(feature))} files; issues={len(issues)}")
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
