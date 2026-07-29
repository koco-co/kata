# MANUAL TRIAGE — features tests/ reorg

The following spec files embed test bodies inline (not just imports).
Automated reorg cannot safely split them. A human needs to:

1. Extract each `test(...)` block into a new `cases/c<四位序号>-<english-slug>.spec.ts` file
2. Replace the inline body in this runner with an import of the corresponding case file
3. Verify Playwright still loads the runner

## Files

- `smoke.spec.ts`
