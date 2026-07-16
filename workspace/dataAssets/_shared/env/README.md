# dataAssets Environment Profiles

`<env>.yaml` contains the shareable environment facts for dataAssets UI automation. The selected profile owns URLs, project and datasource IDs, runtime options, and the `auth.cookie` field.

Committed profiles keep `auth.cookie` empty. Put the real cookie in ignored `.local/<env>.yaml` using the same `auth.cookie` field; that local file may override only the cookie. It must have `0600` permissions. Browser storageState/session files and project `.env.local` files are unsupported.

The active environment is resolved only from root `.env` key `KATA_DATAASSETS_ENV`, falling back to `ltqc-local` when it is absent. Use `kata env resolve --project dataAssets --env <env>` to inspect sources without values and `kata env doctor --project dataAssets --env <env>` to verify the layout.
Legacy names are normalized as follows: `ltqc` -> `ltqc-local`, `customltem` -> `ltqc-test`, `prod`/`PROD` -> `ltqc-prod`.

## Profile fields

| Field | Purpose |
| --- | --- |
| `schema_version`, `project`, `env` | Profile schema, owning project, and canonical environment name. |
| `urls.*` | Platform roots for the portal, DataAssets, and offline products. |
| `auth.cookie` | UI cookie header; the only key allowed in `.local/<env>.yaml`. |
| `auth.tenant_*`, `auth.user_*` | Stable tenant/user facts used to identify the target context. |
| `projects.quality`, `projects.offline`, `projects.owner`, `projects.engines` | Project IDs, names, owner, and enabled engines. |
| `datasources.<name>.enabled`, `ui_label`, `precondition_type`, `aliases` | Data source availability and UI/API matching names. |
| `datasources.<name>.batch`, `metadata`, `assets`, `ui`, `sql` | Product-specific IDs plus database/schema facts used by setup and UI tests. |
| `runtime.default_datasource`, `active_datasources`, `table_prefix` | Selected data sources and collision-safe automation prefix. |
| `runtime.skip_preconditions`, `cleanup`, `allow_write` | Mutation and cleanup safety switches. |
| `runtime.timeouts.*`, `runtime.playwright.*` | Environment-specific timeouts and Playwright execution defaults. |

Root `.env` and the profile are intentionally asymmetric: `.env` holds machine/repository integrations and the profile selector, while the profile holds environment-specific product facts. `kata env doctor` rejects root keys not declared by `.env.example`, warns about empty persisted values, and rejects local profile overrides other than `auth.cookie`.
