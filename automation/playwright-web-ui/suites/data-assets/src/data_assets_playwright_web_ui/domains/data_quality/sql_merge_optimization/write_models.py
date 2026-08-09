"""Write-scenario and persisted UI readback models."""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import TYPE_CHECKING

from .case_ids import (
    CASE_ID_RE,
    SAFE_ID_RE,
    WRITE_CASE_IDS,
    runtime_table_matches_case,
    table_matches_case,
)
from .rules import (
    MAX_RULE_NAME_LENGTH,
    ProvisionedNames,
    RuleSetSpec,
    TaskRevisionSpec,
    TaskSpec,
)
from .topology import (
    FieldShape,
    RuleResultExpectation,
    SqlRuleIdentity,
    SqlTopologyExpectation,
)

if TYPE_CHECKING:
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity

    from .rule_contract import RulePayloadFingerprint
    from .rules import RuleSpec
    from .sql_seed import SparkSeedReceipt

_MIN_SEED_TABLES = 1
_MAX_SEED_TABLES = 2


@dataclass(frozen=True, slots=True)
class WriteScenario:
    """One explicit Spark rule-task execution backed by controlled UI fixtures."""

    case_id: str
    table_name: str
    task_name: str
    rule_package_name: str
    rule_functions: tuple[str, ...]
    field_shape: FieldShape
    merge_batch_size: int
    topology: SqlTopologyExpectation
    result: RuleResultExpectation
    rule_set: RuleSetSpec | None = None
    task: TaskSpec | None = None
    revisions: tuple[TaskRevisionSpec, ...] = ()
    revision_topologies: tuple[SqlTopologyExpectation, ...] = ()
    seed_receipt: SparkSeedReceipt | None = None
    compare_table_name: str | None = None
    platform_write: bool = True

    def __post_init__(self) -> None:
        """Bind immutable case identity to complete rule, SQL, and result semantics."""
        if CASE_ID_RE.fullmatch(self.case_id) is None or self.case_id not in WRITE_CASE_IDS:
            message = "case_id must identify a canonical write case"
            raise ValueError(message)
        self._validate_table_binding()
        if not self.platform_write:
            message = "write scenarios must declare platform writes"
            raise ValueError(message)
        if not self.task_name.strip() or not self.rule_package_name.strip():
            message = "task and rule-package names must be explicit"
            raise ValueError(message)
        if not self.rule_functions or any(not value.strip() for value in self.rule_functions):
            message = "rule_functions must contain explicit canonical functions"
            raise ValueError(message)
        if self.merge_batch_size < 1:
            message = "merge_batch_size must be positive"
            raise ValueError(message)
        self.topology.validate_rule_indices(self.rule_count)
        self.result.validate_rule_indices(self.rule_count)
        self._validate_provisioning()
        if len(self.revisions) != len(self.revision_topologies):
            message = "every UI task revision must declare one exact topology expectation"
            raise ValueError(message)
        for topology in self.revision_topologies:
            topology.validate_rule_indices(self.rule_count)

    def _validate_table_binding(self) -> None:
        if self.seed_receipt is None:
            if not table_matches_case(self.table_name, self.case_id):
                message = "unbound table_name must identify the same canonical 15862 case"
                raise ValueError(message)
            if self.compare_table_name is not None:
                message = "comparison table requires an exact seed receipt"
                raise ValueError(message)
            return
        receipt = self.seed_receipt
        table_names = receipt.table_names
        if receipt.case_id != self.case_id or len(table_names) not in {
            _MIN_SEED_TABLES,
            _MAX_SEED_TABLES,
        }:
            message = "runtime table must exactly match the case-bound seed receipt"
            raise ValueError(message)
        main_table = next(iter(table_names))
        if self.table_name != main_table or not runtime_table_matches_case(
            self.table_name,
            self.case_id,
        ):
            message = "runtime table must exactly match the case-bound seed receipt"
            raise ValueError(message)
        expected_compare = table_names[-1] if len(table_names) == _MAX_SEED_TABLES else None
        if self.compare_table_name != expected_compare:
            message = "comparison table must exactly match the optional seed receipt table"
            raise ValueError(message)

    def _validate_provisioning(self) -> None:
        if (self.rule_set is None) != (self.task is None):
            message = "write scenario must declare rule-set and task provisioning together"
            raise ValueError(message)
        if self.rule_set is None or self.task is None:
            return
        functions = tuple(rule.function_name for rule in self.rule_set.rules)
        if functions != self.rule_functions:
            message = "provisioned rules must exactly match canonical rule function order"
            raise ValueError(message)
        if self.task.merge_batch_size != self.merge_batch_size:
            message = "task provisioning batch size must match initial topology scenario"
            raise ValueError(message)
        if self.task.sampling_percent != self.topology.sampling_percent:
            message = "task provisioning sampling must match initial topology scenario"
            raise ValueError(message)
        if self.task.partition_filter != self.topology.partition_filter:
            message = "task provisioning partition must match initial topology scenario"
            raise ValueError(message)

    @property
    def rule_count(self) -> int:
        """Return the number of explicitly configured subrules."""
        return len(self.rule_functions)

    def function_for(self, rule_index: int) -> str:
        """Resolve one canonical one-based subrule index without fallback."""
        if rule_index < 1 or rule_index > self.rule_count:
            message = "rule_index must identify a configured subrule"
            raise IndexError(message)
        return self.rule_functions[rule_index - 1]

    def bind_seed(self, receipt: SparkSeedReceipt) -> WriteScenario:
        """Return an immutable scenario bound only to receipt-owned physical tables."""
        if self.seed_receipt is not None:
            message = "write scenario is already bound to a seed receipt"
            raise ValueError(message)
        table_names = receipt.table_names
        if len(table_names) not in {_MIN_SEED_TABLES, _MAX_SEED_TABLES}:
            message = "seed receipt must identify one main table and at most one comparison table"
            raise ValueError(message)
        main_table = next(iter(table_names))
        compare = table_names[-1] if len(table_names) == _MAX_SEED_TABLES else None
        return replace(
            self,
            table_name=main_table,
            compare_table_name=compare,
            seed_receipt=receipt,
        )

    @property
    def rules(self) -> tuple[RuleSpec, ...]:
        """Return the complete provisioning rules or reject a candidate shell."""
        if self.rule_set is None:
            message = "write scenario is missing typed rule-set provisioning"
            raise ValueError(message)
        return self.rule_set.rules

    def materialize_names(self, identity: AutomationRuntimeIdentity) -> ProvisionedNames:
        """Build collision-safe rule-set, package, task, report, and rule names."""
        if self.rule_set is None or self.task is None:
            message = "write scenario is missing typed UI provisioning"
            raise ValueError(message)
        card_descriptions = tuple(
            identity.unique_name(
                f"SQLCard{card.rules[0].index:02d}",
                max_length=MAX_RULE_NAME_LENGTH,
            )
            for card in self.rule_set.source_cards
        )
        description_by_rule_index = {
            rule.index: description
            for card, description in zip(
                self.rule_set.source_cards,
                card_descriptions,
                strict=True,
            )
            for rule in card.rules
        }
        descriptions = tuple(description_by_rule_index[rule.index] for rule in self.rule_set.rules)
        return ProvisionedNames(
            rule_set_description=identity.unique_name(
                self.rule_set.description_base,
                max_length=MAX_RULE_NAME_LENGTH,
            ),
            package_names=tuple(
                identity.unique_name(package.base_name, max_length=MAX_RULE_NAME_LENGTH)
                for package in self.rule_set.source_packages
            ),
            task_name=identity.unique_name(
                self.task.base_name,
                max_length=MAX_RULE_NAME_LENGTH,
            ),
            report_name=identity.unique_name(
                self.task.report_name_base,
                max_length=MAX_RULE_NAME_LENGTH,
            ),
            rule_descriptions=descriptions,
            card_descriptions=card_descriptions,
        )


@dataclass(frozen=True, slots=True)
class RuleSetRuleReadback:
    """One executable rule persisted in a source rule package before task creation."""

    expected: RuleSpec
    description: str
    rule_set_record_id: str
    semantic_fingerprint: RulePayloadFingerprint

    def __post_init__(self) -> None:
        """Require a parent-card description and stable package-record identifier."""
        if not self.description.strip() or SAFE_ID_RE.fullmatch(self.rule_set_record_id) is None:
            message = "rule-set readback requires description and stable package-record ID"
            raise ValueError(message)


@dataclass(frozen=True, slots=True)
class ProvisionedRuleReadback:
    """One task-owned MonitorRule bound to its originating rule-set record."""

    expected: RuleSpec
    description: str
    rule_set_record_id: str
    monitor_rule_id: str
    semantic_fingerprint: RulePayloadFingerprint

    def __post_init__(self) -> None:
        """Reject missing or conflated rule-set and task-owned identifiers."""
        identifiers = (self.rule_set_record_id, self.monitor_rule_id)
        if not self.description.strip() or any(
            SAFE_ID_RE.fullmatch(value) is None for value in identifiers
        ):
            message = "provisioned rule requires explicit rule-set and MonitorRule IDs"
            raise ValueError(message)

    @property
    def sql_identity(self) -> SqlRuleIdentity:
        """Return the stable identity consumed by the SQL topology oracle."""
        return SqlRuleIdentity(index=self.expected.index, token=self.monitor_rule_id)

    def as_json(self) -> dict[str, object]:
        """Return non-secret exact configuration values for business evidence."""
        return {
            "index": self.expected.index,
            "rule_set_record_id": self.rule_set_record_id,
            "monitor_rule_id": self.monitor_rule_id,
            "function_name": self.expected.function_name,
            "fields": list(self.expected.fields),
            "field_relation": self.expected.field_relation,
            "filter_expression": self.expected.filter_expression,
            "strength": self.expected.strength,
            "description": self.description,
        }


@dataclass(frozen=True, slots=True)
class ProvisionedWriteScenario:
    """Runtime-isolated UI records created for one canonical write scenario."""

    source: WriteScenario
    names: ProvisionedNames
    rule_set_id: str
    monitor_id: str
    rules: tuple[ProvisionedRuleReadback, ...]

    def __post_init__(self) -> None:
        """Require a complete one-to-one persisted readback for every expected rule."""
        expected = tuple(rule.index for rule in self.source.rules)
        actual = tuple(rule.expected.index for rule in self.rules)
        if any(
            not value.isdigit() or int(value) < 1 for value in (self.rule_set_id, self.monitor_id)
        ):
            message = "provisioned rule set and monitor must use positive backend IDs"
            raise ValueError(message)
        if actual != expected:
            message = "provisioned rule readback must preserve every canonical rule in order"
            raise ValueError(message)

    @property
    def sql_rule_identities(self) -> tuple[SqlRuleIdentity, ...]:
        """Return stable SQL rule identities in canonical order."""
        return tuple(rule.sql_identity for rule in self.rules)

    @property
    def task_name(self) -> str:
        """Return the collision-safe persisted task name."""
        return self.names.task_name
