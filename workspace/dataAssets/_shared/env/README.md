# dataAssets Environment Profiles

These YAML files contain non-secret environment facts for dataAssets UI automation.

Do not put cookies, passwords, tokens, API keys, or browser session contents here.
Use `.kata/auth/dataAssets/session-{env}.json` for Playwright storage state.
For committed or handed-off UI automation, add an explicit `env/*.yaml` profile instead of writing `workspace/dataAssets/.env.local`.
`workspace/dataAssets/.env.local` is only for personal one-off experiments and must not be created by `/playwright-automation`.

The active environment is resolved from `KATA_DATAASSETS_ENV`, then `ACTIVE_ENV`, then `ltqc-local`.
Legacy names are normalized as follows: `ltqc` -> `ltqc-local`, `customltem` -> `ltqc-test`, `prod`/`PROD` -> `ltqc-prod`.
