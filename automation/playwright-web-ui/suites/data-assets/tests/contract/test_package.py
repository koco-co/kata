from importlib.metadata import entry_points

from data_assets_playwright_web_ui import PROJECT_ID


def test_data_assets_suite_registers_its_stable_project_id() -> None:
    matches = entry_points(group="playwright_web_ui.suites", name=PROJECT_ID)

    assert len(matches) == 1
    assert next(iter(matches)).load() == PROJECT_ID
