"""Immutable business expectations for the Data Standard statistics journey."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final, cast

_MINIMUM_WEIGHT: Final = 0.0
_MAXIMUM_WEIGHT: Final = 100.0


class StandardStatisticsContractError(AssertionError):
    """Raised when a statistics response cannot represent the canonical UI contract."""


@dataclass(frozen=True, slots=True)
class StatisticMetric:
    """One named count and its optional percentage in a rendered statistics chart."""

    name: str
    count: int
    weight: float | None


@dataclass(frozen=True, slots=True)
class StandardTrendPoint:
    """One timeline label paired with its data-standard count."""

    date: str
    standard_count: int


@dataclass(frozen=True, slots=True)
class StandardStatisticsSnapshot:
    """Business data returned by the four charts during one UI page load."""

    hot: tuple[StatisticMetric, ...]
    catalog: tuple[StatisticMetric, ...]
    trend: tuple[StandardTrendPoint, ...]
    source: tuple[StatisticMetric, ...]

    @classmethod
    def from_api_payloads(
        cls,
        *,
        hot: object,
        catalog: object,
        trend: object,
        source: object,
    ) -> StandardStatisticsSnapshot:
        """Validate the four UI-triggered API payloads as one coherent snapshot."""
        return cls(
            hot=_parse_metrics(hot, label="标准热度", require_weight=False),
            catalog=_parse_metrics(catalog, label="标准目录分布", require_weight=True),
            trend=_parse_trend(trend),
            source=_parse_metrics(source, label="标准来源分布", require_weight=True),
        )


@dataclass(frozen=True, slots=True)
class StandardReferenceData:
    """Canonical pre-existing records required by the statistics journey."""

    root_abbreviation: str
    root_full_name: str
    root_chinese_name: str
    code_name: str
    code_number: str
    code_catalog: str
    standard_chinese_name: str
    standard_english_name: str
    standard_number: str


def _response_data(payload: object, *, label: str) -> dict[str, object]:
    response = _object_mapping(payload, label=f"{label}响应")
    if response.get("success") is not True:
        message = f"{label}响应必须明确成功"
        raise StandardStatisticsContractError(message)
    return _object_mapping(response.get("data"), label=f"{label}数据")


def _parse_metrics(
    payload: object,
    *,
    label: str,
    require_weight: bool,
) -> tuple[StatisticMetric, ...]:
    data = _response_data(payload, label=label)
    raw_items = _object_list(data.get("statisticItems"), label=f"{label}.statisticItems")
    if not raw_items:
        message = f"{label}必须至少包含一条业务统计"
        raise StandardStatisticsContractError(message)

    metrics: list[StatisticMetric] = []
    names: set[str] = set()
    for index, raw_item in enumerate(raw_items):
        item_label = f"{label}.statisticItems[{index}]"
        item = _object_mapping(raw_item, label=item_label)
        name = _non_empty_text(item.get("name"), label=f"{item_label}.name")
        if name in names:
            message = f"{label}业务名称“{name}”不得重复"
            raise StandardStatisticsContractError(message)
        names.add(name)
        count = _non_negative_integer(item.get("count"), label=f"{item_label}.count")
        weight = (
            _percentage(item.get("weight"), label=f"{item_label}.weight")
            if require_weight
            else None
        )
        metrics.append(StatisticMetric(name=name, count=count, weight=weight))
    return tuple(metrics)


def _parse_trend(payload: object) -> tuple[StandardTrendPoint, ...]:
    label = "标准趋势"
    data = _response_data(payload, label=label)
    raw_dates = _object_list(data.get("statisticDate"), label=f"{label}.statisticDate")
    raw_counts = _object_list(data.get("standardCount"), label=f"{label}.standardCount")
    if not raw_dates:
        message = "标准趋势必须至少包含一个时间轴数据点"
        raise StandardStatisticsContractError(message)
    if len(raw_dates) != len(raw_counts):
        message = "标准趋势的时间轴与数据标准数量必须一一对应"
        raise StandardStatisticsContractError(message)

    return tuple(
        StandardTrendPoint(
            date=_non_empty_text(date, label=f"{label}.statisticDate[{index}]"),
            standard_count=_non_negative_integer(
                raw_counts[index],
                label=f"{label}.standardCount[{index}]",
            ),
        )
        for index, date in enumerate(raw_dates)
    )


def _object_mapping(value: object, *, label: str) -> dict[str, object]:
    if not isinstance(value, dict):
        message = f"{label}必须是字符串键对象"
        raise StandardStatisticsContractError(message)
    untyped_mapping = cast("dict[object, object]", value)
    if any(not isinstance(key, str) for key in untyped_mapping):
        message = f"{label}必须是字符串键对象"
        raise StandardStatisticsContractError(message)
    return cast("dict[str, object]", untyped_mapping)


def _object_list(value: object, *, label: str) -> list[object]:
    if not isinstance(value, list):
        message = f"{label}必须是数组"
        raise StandardStatisticsContractError(message)
    return cast("list[object]", value)


def _non_empty_text(value: object, *, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        message = f"{label}必须是非空字符串"
        raise StandardStatisticsContractError(message)
    return value.strip()


def _non_negative_integer(value: object, *, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        message = f"{label}必须是非负整数"
        raise StandardStatisticsContractError(message)
    return value


def _percentage(value: object, *, label: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        message = f"{label}必须是百分比数值"
        raise StandardStatisticsContractError(message)
    result = float(value)
    if not _MINIMUM_WEIGHT <= result <= _MAXIMUM_WEIGHT:
        message = f"{label}必须位于 0 到 100 之间"
        raise StandardStatisticsContractError(message)
    return result
