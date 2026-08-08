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
