"""Tests for tmp/normalize-final-xmind.py."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

THIS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("nx", THIS_DIR / "normalize-final-xmind.py")
nx = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(nx)


def _write_xmind(path: Path, content: list[dict], extra: dict[str, str] | None = None) -> None:
    with ZipFile(path, "w", ZIP_DEFLATED) as zf:
        zf.writestr("content.json", json.dumps(content, ensure_ascii=False))
        for name, body in (extra or {}).items():
            zf.writestr(name, body)


def test_replace_br_in_title():
    topic = {
        "title": "step1<br>step2<br>step3",
        "markers": [{"markerId": "priority-3"}],
        "children": {"attached": []},
    }
    nx.transform_topic(topic)
    assert topic["title"] == "step1\nstep2\nstep3"
    assert topic["markers"][0]["markerId"] == "priority-1"


def test_replace_br_recursive():
    topic = {
        "title": "root<br>x",
        "children": {
            "attached": [
                {"title": "leaf<br>y", "markers": [{"markerId": "priority-2"}], "children": {"attached": []}},
            ]
        },
    }
    nx.transform_topic(topic)
    assert topic["title"] == "root\nx"
    assert topic["children"]["attached"][0]["title"] == "leaf\ny"
    assert topic["children"]["attached"][0]["markers"][0]["markerId"] == "priority-1"


def test_flatten_root_project_to_suite():
    sheet = {
        "title": "project",
        "rootTopic": {
            "title": "project",
            "children": {
                "attached": [
                    {
                        "title": "suite",
                        "children": {"attached": [{"title": "v6.4.3"}]},
                    }
                ]
            },
        },
    }
    nx.flatten_root(sheet)
    assert sheet["rootTopic"]["title"] == "suite"
    assert sheet["title"] == "suite"
    assert sheet["rootTopic"]["children"]["attached"][0]["title"] == "v6.4.3"


def test_full_pass_on_xmind(tmp_path):
    path = tmp_path / "x.xmind"
    content = [
        {
            "title": "project",
            "rootTopic": {
                "title": "project",
                "children": {
                    "attached": [
                        {
                            "title": "suite",
                            "children": {
                                "attached": [
                                    {"title": "leaf<br>line2", "children": {"attached": []}}
                                ]
                            },
                        }
                    ]
                },
            },
        }
    ]
    _write_xmind(path, content, extra={"metadata.json": '{"keep":true}'})
    nx.normalize_xmind(path)
    with ZipFile(path, "r") as zf:
        out = json.loads(zf.read("content.json").decode("utf-8"))
        assert zf.read("metadata.json").decode("utf-8") == '{"keep":true}'
    assert out[0]["title"] == "suite"
    assert out[0]["rootTopic"]["title"] == "suite"
    leaf = out[0]["rootTopic"]["children"]["attached"][0]
    assert leaf["title"] == "leaf\nline2"


def test_main_with_explicit_target_only(tmp_path, capsys):
    target = tmp_path / "target.xmind"
    untouched = tmp_path / "untouched.xmind"
    content = [
        {
            "title": "project",
            "rootTopic": {
                "title": "project",
                "children": {"attached": [{"title": "suite", "children": {"attached": []}}]},
            },
        }
    ]
    _write_xmind(target, content)
    _write_xmind(untouched, content)

    assert nx.main(["normalize-final-xmind.py", str(target)]) == 0
    captured = capsys.readouterr()
    assert str(target) in captured.out
    assert str(untouched) not in captured.out
