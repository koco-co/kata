from importlib.metadata import entry_points

from data_assets_playwright_web_ui import SUITE
from playwright_web_ui import SuiteDefinition


def test_data_assets_suite_registers_typed_definition_and_test_resource() -> None:
    matches = entry_points(group="playwright_web_ui.suites", name=SUITE.project_id)

    assert len(matches) == 1
    loaded = next(iter(matches)).load()
    assert isinstance(loaded, SuiteDefinition)
    assert loaded == SUITE
    assert loaded.tests_path.is_dir()
    assert loaded.tests_path.is_relative_to(loaded.root_path)
    assert loaded.fixture_plugins == (
        "data_assets_playwright_web_ui.domains.data_quality.json_configuration.fixtures",
        "data_assets_playwright_web_ui.domains.data_quality.json_value_validation.fixtures",
    )
    assert (source := loaded.root_path / "src" / "data_assets_playwright_web_ui").is_dir()
    assert (source / "domains" / "data_quality" / "json_configuration" / "fixtures.py").is_file()
    assert (source / "domains" / "data_quality" / "json_value_validation" / "fixtures.py").is_file()
    assert list(loaded.tests_path.rglob("conftest.py")) == []


def test_data_assets_suite_exposes_domain_first_source_layout() -> None:
    source = SUITE.root_path / "src" / "data_assets_playwright_web_ui"

    assert (source / "components" / "navigation.py").is_file()
    assert (source / "domains" / "data_standard" / "standard_statistics").is_dir()
    assert (source / "domains" / "data_model" / "schema_design").is_dir()
