"""Read-only detail-download and quality-report scenario models."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Final

from .case_ids import CASE_ID_RE, READ_ONLY_CASE_IDS, TIMESTAMP_RE, table_matches_case

VALIDITY_RULES: Final = (
    "数值-取值范围",
    "数值-枚举个数",
    "枚举值",
    "取值范围&枚举范围",
)
COMPLETENESS_RULES: Final = ("空值数", "空值率", "空串数", "空串率", "表行数")
VEHICLE_SUMMARY_FIELDS: Final = (
    "车系",
    "车型",
    "动力类型",
    "车辆数",
    "表中包含车辆数",
    "车辆总数",
    "表中包含总车辆数",
)
REPORT_DETAIL_FIELDS: Final = (
    "规则类型",
    "规则名称",
    "字段名称",
    "字段类型",
    "质检结果",
    "未通过原因",
    "详情说明",
    "最近一次校验结束时间",
    "操作",
)


class RuleFamily(StrEnum):
    """Canonical rule families represented by the read-only cases."""

    VALIDITY = "有效性校验"
    COMPLETENESS = "完整性校验"


class ReadOnlyJourney(StrEnum):
    """Independent UI journeys that do not create or mutate platform records."""

    DETAIL_DOWNLOAD = "detail-download"
    REPORT = "report"


class QualityResult(StrEnum):
    """Canonical quality-result meanings, including tenant wording variants."""

    UNPASSED = "未达标"
    PASSED = "达标"


@dataclass(frozen=True, slots=True)
class ReportExpectation:
    """Exact business values expected from one existing quality report."""

    table_rows: int = 6
    field_count: int = 8
    rule_count: int | None = None
    pass_rate: int | None = None
    result: QualityResult | None = None
    report_name: str | None = None
    exact_end_time: str | None = None
    failure_reason: str | None = None
    detail_text: str | None = None
    operation: str | None = None
    sample_rows: tuple[str, ...] = ("--", "未抽样")
    vehicle_rows: tuple[str, ...] = ("--", "空")

    def __post_init__(self) -> None:
        """Reject expectations that could silently weaken a report assertion."""
        if self.table_rows < 0 or self.field_count < 0:
            message = "report row and field counts must be non-negative"
            raise ValueError(message)
        if self.rule_count is not None and self.rule_count < 1:
            message = "rule_count must be positive when present"
            raise ValueError(message)
        if self.pass_rate is not None and self.pass_rate not in {0, 100}:
            message = "canonical pass_rate must be 0 or 100"
            raise ValueError(message)
        if self.exact_end_time is not None and TIMESTAMP_RE.fullmatch(self.exact_end_time) is None:
            message = "exact_end_time must use yyyy-MM-dd HH:mm:ss"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class ReadOnlyScenario:
    """One explicit, immutable SparkThrift read-only business scenario."""

    case_id: str
    table_name: str
    journey: ReadOnlyJourney
    rule_family: RuleFamily
    rule_names: tuple[str, ...]
    rule_count: int
    report: ReportExpectation = field(default_factory=ReportExpectation)
    rule_name: str | None = None
    platform_write: bool = False
    compare_download_with_ui: bool = False

    def __post_init__(self) -> None:
        """Enforce canonical identity and strong assertion inputs."""
        if CASE_ID_RE.fullmatch(self.case_id) is None or self.case_id not in READ_ONLY_CASE_IDS:
            message = "case_id must identify a canonical read-only case"
            raise ValueError(message)
        if not table_matches_case(self.table_name, self.case_id):
            message = "table_name must identify the same canonical read-only case"
            raise ValueError(message)
        if self.platform_write:
            message = "read-only scenarios cannot declare platform writes"
            raise ValueError(message)
        if not self.rule_names or any(not name.strip() for name in self.rule_names):
            message = "rule_names must contain explicit canonical rule names"
            raise ValueError(message)
        if self.rule_count < 1:
            message = "rule_count must be positive"
            raise ValueError(message)
        if self.journey is ReadOnlyJourney.REPORT and (
            self.report.rule_count != self.rule_count or self.report.pass_rate is None
        ):
            message = "report journeys must assert matching rule_count and pass_rate"
            raise ValueError(message)


def _report(  # noqa: PLR0913
    *,
    rule_count: int,
    pass_rate: int,
    result: QualityResult,
    report_name: str | None = None,
    exact_end_time: str | None = None,
    failure_reason: str | None = None,
    detail_text: str | None = None,
    operation: str | None = None,
    sample_rows: tuple[str, ...] = ("--", "未抽样"),
    vehicle_rows: tuple[str, ...] = ("--", "空"),
) -> ReportExpectation:
    return ReportExpectation(
        rule_count=rule_count,
        pass_rate=pass_rate,
        result=result,
        report_name=report_name,
        exact_end_time=exact_end_time,
        failure_reason=failure_reason,
        detail_text=detail_text,
        operation=operation,
        sample_rows=sample_rows,
        vehicle_rows=vehicle_rows,
    )


def _scenario(  # noqa: PLR0913
    case_id: str,
    *,
    journey: ReadOnlyJourney,
    family: RuleFamily,
    rule_count: int,
    report: ReportExpectation | None = None,
    rule_name: str | None = None,
    compare_download_with_ui: bool = False,
) -> ReadOnlyScenario:
    return ReadOnlyScenario(
        case_id=case_id,
        table_name=f"test_table_15862_{case_id.lower()}",
        journey=journey,
        rule_family=family,
        rule_names=VALIDITY_RULES if family is RuleFamily.VALIDITY else COMPLETENESS_RULES,
        rule_count=rule_count,
        report=report or ReportExpectation(),
        rule_name=rule_name,
        compare_download_with_ui=compare_download_with_ui,
    )


_READ_ONLY_SCENARIOS: Final = {
    "C0016": _scenario(
        "C0016", journey=ReadOnlyJourney.DETAIL_DOWNLOAD, family=RuleFamily.VALIDITY, rule_count=4
    ),
    "C0017": _scenario(
        "C0017",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.VALIDITY,
        rule_count=4,
        report=_report(
            rule_count=4,
            pass_rate=0,
            result=QualityResult.UNPASSED,
            exact_end_time="2026-08-05 10:30:00",
            failure_reason="字段值不在枚举值范围内",
            detail_text="不符合规则：枚举值",  # noqa: RUF001
            operation="查看详情",
        ),
    ),
    "C0018": _scenario(
        "C0018",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.VALIDITY,
        rule_count=5,
        report=_report(
            rule_count=5,
            pass_rate=100,
            result=QualityResult.PASSED,
            exact_end_time="2026-08-05 10:30:00",
            failure_reason="--",
            detail_text="符合规则：数值-取值范围",  # noqa: RUF001
            operation="--",
        ),
    ),
    "C0024": _scenario(
        "C0024",
        journey=ReadOnlyJourney.DETAIL_DOWNLOAD,
        family=RuleFamily.COMPLETENESS,
        rule_count=5,
    ),
    "C0025": _scenario(
        "C0025",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.COMPLETENESS,
        rule_count=4,
        rule_name="RuleA",
        report=_report(
            rule_count=4,
            pass_rate=0,
            result=QualityResult.UNPASSED,
            report_name="ReportA",
            failure_reason="子规则未通过",
            operation="查看详情",
        ),
    ),
    "C0026": _scenario(
        "C0026",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.COMPLETENESS,
        rule_count=4,
        rule_name="RuleA",
        report=_report(
            rule_count=4,
            pass_rate=100,
            result=QualityResult.PASSED,
            report_name="ReportA",
            operation="--",
        ),
    ),
    "C0052": _scenario(
        "C0052",
        journey=ReadOnlyJourney.DETAIL_DOWNLOAD,
        family=RuleFamily.VALIDITY,
        rule_count=4,
        compare_download_with_ui=True,
    ),
    "C0053": _scenario(
        "C0053",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.VALIDITY,
        rule_count=4,
        rule_name="RuleA",
        report=_report(
            rule_count=4,
            pass_rate=0,
            result=QualityResult.UNPASSED,
            report_name="ReportA",
            failure_reason="子规则未达标",
            operation="查看详情",
        ),
    ),
    "C0054": _scenario(
        "C0054",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.VALIDITY,
        rule_count=5,
        rule_name="RuleA",
        report=_report(
            rule_count=5,
            pass_rate=100,
            result=QualityResult.PASSED,
            report_name="ReportA",
            operation="--",
        ),
    ),
    "C0060": _scenario(
        "C0060",
        journey=ReadOnlyJourney.DETAIL_DOWNLOAD,
        family=RuleFamily.COMPLETENESS,
        rule_count=5,
        rule_name="RuleA",
        compare_download_with_ui=True,
    ),
    "C0061": _scenario(
        "C0061",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.COMPLETENESS,
        rule_count=4,
        rule_name="可合并完整性规则",
        report=_report(
            rule_count=4,
            pass_rate=0,
            result=QualityResult.UNPASSED,
            failure_reason="字段值未达标",
            detail_text="字段值不符合规则内容",
            operation="查看详情",
        ),
    ),
    "C0062": _scenario(
        "C0062",
        journey=ReadOnlyJourney.REPORT,
        family=RuleFamily.COMPLETENESS,
        rule_count=4,
        rule_name="可合并完整性规则",
        report=_report(
            rule_count=4,
            pass_rate=100,
            result=QualityResult.PASSED,
            detail_text="字段值符合规则内容",
            operation="--",
        ),
    ),
}


def read_only_scenario(case_id: str) -> ReadOnlyScenario:
    """Return one canonical read-only scenario for non-E2E catalog validation."""
    try:
        return _READ_ONLY_SCENARIOS[case_id]
    except KeyError as error:
        message = f"{case_id} is not a read-only canonical case"
        raise KeyError(message) from error
