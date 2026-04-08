# Automation Handoff Spec

Case-draft completes with manifest writes. It does not produce a separate feature-root handoff Markdown file; per-run handoff files come from the playwright-automation phase.

## Output channels

1. **Strong contract (agent-readable):** `features/<featureId>/manifest.json#automation`
   ```json
   {
     "status": "ready",
     "intents": [
       {
         "intent_id": "SR-INTENT-<id>",
         "case_files": ["tests/cases/t01-...ts"],
         "automation_status": "ready"
       }
     ]
   }
   ```
2. **Human-readable rendering:** `archive.md` has a section "## Automation Handoff" generated from manifest. Header `<!-- generated -->`; do not hand-edit.

## Ready criteria

Only intents with `automation_status: "ready"` are eligible for downstream playwright-automation. `deferred`/`blocked` intents remain in manifest but are skipped by the `case-normalize` step of the `playwright-automation` workflow.

## Confirmation guard

`manifest.automation.status: ready` requires no `confirmation-package.md` with `status: pending` exists.
