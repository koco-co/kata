"""Compatibility exports for SQL-merge domain models grouped by responsibility."""

from .case_ids import ALL_CASE_IDS, READ_ONLY_CASE_IDS, WRITE_CASE_IDS
from .read_models import (
    COMPLETENESS_RULES,
    REPORT_DETAIL_FIELDS,
    VALIDITY_RULES,
    VEHICLE_SUMMARY_FIELDS,
    QualityResult,
    ReadOnlyJourney,
    ReadOnlyScenario,
    ReportExpectation,
    RuleFamily,
    read_only_scenario,
)
from .result_models import (
    ResultBaseline,
    RuleExecutionReadback,
    RuleExecutionStatus,
    TableSnapshot,
    TaskExecutionReadback,
)
from .rules import RuleStrength, TaskRevisionSpec
from .topology import (
    FieldShape,
    MergeMode,
    RuleResultExpectation,
    SqlRuleIdentity,
    SqlTopologyExpectation,
)
from .write_models import (
    ProvisionedRuleReadback,
    ProvisionedWriteScenario,
    RuleSetRuleReadback,
    WriteScenario,
)

__all__ = [
    "ALL_CASE_IDS",
    "COMPLETENESS_RULES",
    "READ_ONLY_CASE_IDS",
    "REPORT_DETAIL_FIELDS",
    "VALIDITY_RULES",
    "VEHICLE_SUMMARY_FIELDS",
    "WRITE_CASE_IDS",
    "FieldShape",
    "MergeMode",
    "ProvisionedRuleReadback",
    "ProvisionedWriteScenario",
    "QualityResult",
    "ReadOnlyJourney",
    "ReadOnlyScenario",
    "ReportExpectation",
    "ResultBaseline",
    "RuleExecutionReadback",
    "RuleExecutionStatus",
    "RuleFamily",
    "RuleResultExpectation",
    "RuleSetRuleReadback",
    "RuleStrength",
    "SqlRuleIdentity",
    "SqlTopologyExpectation",
    "TableSnapshot",
    "TaskExecutionReadback",
    "TaskRevisionSpec",
    "WriteScenario",
    "read_only_scenario",
]
