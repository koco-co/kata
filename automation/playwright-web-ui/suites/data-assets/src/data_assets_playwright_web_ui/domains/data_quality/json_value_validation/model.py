"""Canonical business values for JSON value-format validation UI journeys."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, Literal

FEATURE_ID: Final = "quality-json-value-format-validation"
JSON_FORMAT_RULE: Final = "格式-json格式校验"
CUSTOM_REGEX_RULE: Final = "格式校验-自定义正则"
RULE_SET_NAME: Final = "RuleSetA"
TASK_NAME: Final = "TaskA"

DatasourceKey = Literal["sparkthrift", "doris", "hive"]
_MAX_RATIO_PERCENT: Final = 100
_MAX_VALIDATED_COUNT: Final = 10_000_000


@dataclass(frozen=True, slots=True)
class JsonValueCase:
    """Pre-existing business data named by one canonical case."""

    case_id: str
    table_name: str
    package_name: str
    field_name: str
    datasource_keys: tuple[DatasourceKey, ...]
    task_name: str = TASK_NAME


@dataclass(frozen=True, slots=True)
class RuleReadback:
    """A saved JSON-format rule read back through the rule-set UI."""

    datasource: str
    table_name: str
    package_name: str
    field_name: str
    selected_keys: tuple[str, ...]
    description: str | None = None

    def as_json(self) -> dict[str, object]:
        """Return the non-secret business values accepted by the record fixture."""
        result: dict[str, object] = {
            "datasource": self.datasource,
            "table_name": self.table_name,
            "package_name": self.package_name,
            "field_name": self.field_name,
            "selected_keys": list(self.selected_keys),
        }
        if self.description is not None:
            result["description"] = self.description
        return result


@dataclass(frozen=True, slots=True)
class TaskInstanceIdentity:
    """Stable UI identity for one task-query result row."""

    instance_id: str
    execute_time: str

    def __post_init__(self) -> None:
        """Reject identities that cannot uniquely describe a visible result row."""
        if not self.instance_id.strip():
            message = "instance_id must be a non-empty data-row-key"
            raise ValueError(message)
        if not self.execute_time.strip() or self.execute_time.strip() == "--":
            message = "execute_time must be a visible execution timestamp"
            raise ValueError(message)

    def as_json(self) -> dict[str, str]:
        """Return the structured instance identity accepted by business records."""
        return {
            "instance_id": self.instance_id,
            "execute_time": self.execute_time,
        }


@dataclass(frozen=True, slots=True)
class TaskResultBaseline:
    """Immutable result-row identities captured before submitting a task."""

    instances: tuple[TaskInstanceIdentity, ...]

    @property
    def instance_ids(self) -> frozenset[str]:
        """Return the exact pre-submit result IDs."""
        return frozenset(instance.instance_id for instance in self.instances)


@dataclass(frozen=True, slots=True)
class SamplingReadback:
    """Bounded sampling values read from an instance report."""

    ratio_percent: int
    validated_count: int

    def __post_init__(self) -> None:
        """Reject sampling values outside explicit UI/business safety bounds."""
        if not 0 <= self.ratio_percent <= _MAX_RATIO_PERCENT:
            message = "ratio_percent must be between 0 and 100"
            raise ValueError(message)
        if not 0 <= self.validated_count <= _MAX_VALIDATED_COUNT:
            message = "validated_count must be between 0 and 10,000,000"
            raise ValueError(message)

    def as_json(self) -> dict[str, int]:
        """Return actual visible sampling values for a business record."""
        return {
            "ratio_percent": self.ratio_percent,
            "validated_count": self.validated_count,
        }


@dataclass(frozen=True, slots=True)
class TaskResultReadback:
    """A task instance and JSON-format result read back through the UI."""

    datasource: str
    task_name: str
    table_name: str
    instance_id: str
    execute_time: str
    status: str
    rule_result: str
    detail: str

    def as_json(self) -> dict[str, str]:
        """Return the non-secret business values accepted by the record fixture."""
        return {
            "datasource": self.datasource,
            "task_name": self.task_name,
            "table_name": self.table_name,
            "instance_id": self.instance_id,
            "execute_time": self.execute_time,
            "status": self.status,
            "rule_result": self.rule_result,
            "detail": self.detail,
        }


def _case(
    case_id: str,
    package_name: str,
    field_name: str,
    *datasource_keys: DatasourceKey,
) -> JsonValueCase:
    return JsonValueCase(
        case_id=case_id,
        table_name=f"test_table_15694_{case_id.lower()}",
        package_name=package_name,
        field_name=field_name,
        datasource_keys=datasource_keys,
    )


CASES: Final[dict[str, JsonValueCase]] = {
    "C0001": _case("C0001", "value格式校验UI测试包", "info", "sparkthrift", "doris"),
    "C0002": _case("C0002", "提示测试包", "info", "sparkthrift", "doris"),
    "C0003": _case("C0003", "字段类型测试包", "id", "sparkthrift", "doris"),
    "C0004": _case("C0004", "key选择测试包", "info", "sparkthrift", "doris"),
    "C0005": _case("C0005", "多选全选测试包", "info", "sparkthrift", "doris"),
    "C0006": _case("C0006", "key搜索测试包", "info", "sparkthrift", "doris"),
    "C0007": _case("C0007", "大数据量key测试包", "info", "sparkthrift", "doris"),
    "C0008": _case("C0008", "层级key测试包", "info", "sparkthrift", "doris"),
    "C0009": _case("C0009", "悬浮展示测试包", "info", "sparkthrift", "doris"),
    "C0010": _case("C0010", "value预览测试包", "info", "sparkthrift", "doris"),
    "C0011": _case("C0011", "int类型限制测试包", "count_val", "sparkthrift", "doris"),
    "C0012": _case("C0012", "必填校验测试包", "info", "sparkthrift", "doris"),
    "C0013": _case("C0013", "参数展示测试包", "info", "sparkthrift", "doris"),
    "C0014": _case("C0014", "P0主流程测试包", "info", "sparkthrift", "doris"),
    "C0015": _case("C0015", "校验不通过测试包", "order_info", "sparkthrift", "doris"),
    "C0016": _case("C0016", "Spark2兼容性测试包", "event_data", "sparkthrift"),
    "C0017": _case("C0017", "Doris3兼容性测试包", "item_info", "doris"),
    "C0018": _case("C0018", "Hive2兼容性测试包", "score_info", "hive"),
    "C0019": _case("C0019", "大数据量key校验包", "big_info", "sparkthrift", "doris"),
    "C0020": _case("C0020", "key删除测试包", "del_info", "sparkthrift", "doris"),
    "C0021": _case("C0021", "key删除预览测试包", "preview_info", "sparkthrift", "doris"),
    "C0022": _case("C0022", "抽样校验测试包", "sample_info", "sparkthrift", "doris"),
    "C0023": _case("C0023", "分区校验测试包", "part_info", "hive", "doris"),
    "C0024": _case("C0024", "", "", "sparkthrift"),
    "C0025": _case("C0025", "下载明细测试包", "payload", "sparkthrift", "doris"),
    "C0026": _case("C0026", "通过场景测试包", "info", "sparkthrift", "doris"),
    "C0027": _case("C0027", "", "", "sparkthrift", "doris"),
    "C0028": _case("C0028", "报告通过测试包", "info", "sparkthrift", "doris"),
    "C0029": _case("C0029", "报告不通过测试包", "log_info", "sparkthrift", "doris"),
}
