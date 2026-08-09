# Playwright Web UI executor guide

Use this guide only after the generic `automation` Skill selects `playwright-web-ui`.

## Execution boundary

- Use Playwright Python's synchronous API exclusively. Do not introduce `asyncio`, async fixtures,
  or sync/async adapters in this executor.
- Invoke lifecycle operations through `kata automation setup|doctor|collect|run`; do not ask users
  to assemble raw `uv` or `pytest` commands.
- Treat the execution manifest as the complete, immutable case selection. Do not scan workspace
  YAML or read `config/private/` from Python.
- Receive credentials only through the controlled child-process environment. Never print, persist,
  attach, or copy them into fixtures.

## Suite structure

- Put project code under `suites/<project-id>/src/<project_module>/`.
- Organize reusable code by stable business domain:
  `domains/<domain>/<capability>/{model,screen,actions,assertions}.py`.
- Put cross-domain UI primitives in `components/`, environment-independent setup in `fixtures/`,
  and tenant differences in `capabilities/`.
- Promote an abstraction only after two real consumers need it. Do not add `common.py`,
  `helpers.py`, `utils.py`, global page-object forests, or generated runners.
- Name E2E files `c<four digits>_<lowercase_english_slug>_test.py` under
  `tests/e2e/<version>/<feature-id>/`.

## Test contract

- Bind exactly one pytest item to one canonical case with
  `@automation_case(project_id=..., feature_id=..., case_id=...)`.
- A parametrized item must carry its own canonical case identity; collection must match the
  manifest exactly with no missing, duplicate, or unexpected item.
- Keep every test independent and safe under `pytest-xdist`. Request the public
  `automation_identity` fixture when a case needs immutable run/case/attempt/worker identity, and
  use `automation_identity.unique_name(base, max_length=...)` for persistent entity names. It
  refuses to truncate the business base.
- Use fixtures or authorized APIs only for setup and precise cleanup. Perform the business action
  under test through the UI.
- Do not use automatic rerun plugins, ordering dependencies, `time.sleep`, broad exception
  swallowing, `sys.path` mutations, weak assertions, mocks of the tested business API, or `xfail`
  as a delivery workaround.

## Evidence and business records

- Express each business checkpoint with `with step(action=..., expected=..., target=...):`; the
  synchronous context records evidence and intentionally does not return a business object.
- Attach a screenshot for successful business checkpoints. On failure preserve sanitized
  `failure.json`, a failure screenshot, and the failure video.
- Keep Playwright tracing permanently off for authenticated runs. A trace can serialize cookies;
  never enable, retain, or attach one for diagnostics.
- For `business_record.policy=required`, call `business_records.record(...)` after a UI readback of
  the record created or changed by this case. `not_applicable` requires the canonical reason from
  the manifest and must not fabricate a record.
- Never let background threads or timers access a Playwright `Page`.

## Quality gates

- Keep Ruff clean, Pyright strict, pytest markers/config strict, and imports package-based.
- Run `collect` before `run`; a successful command without passed collection/preparation/run
  status, exact Allure results, required business records, and verification is not a passed
  delivery. A pre-attempt failure must retain a `NOT VERIFIED` handoff with no fabricated attempt.
- Rerun only through a newly allocated attempt so prior failures and evidence remain immutable.
