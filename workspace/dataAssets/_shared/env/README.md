# dataAssets Environment Profiles

`<env>.yaml` contains the shareable environment facts for dataAssets UI automation. The selected profile owns URLs, project and datasource IDs, runtime options, and the `auth.cookie` field.

Committed profiles keep `auth.cookie` empty. Put the real cookie in ignored `.local/<env>.yaml` using the same `auth.cookie` field; that local file may override only the cookie. It must have `0600` permissions. Browser storageState/session files and project `.env.local` files are unsupported.

The active environment is resolved only from root `.env` key `KATA_DATAASSETS_ENV`, falling back to `ltqc-local` when it is absent. Use `kata env resolve --project dataAssets --env <env>` to inspect sources without values and `kata env doctor --project dataAssets --env <env>` to verify the layout.
Legacy names are normalized as follows: `ltqc` -> `ltqc-local`, `customltem` -> `ltqc-test`, `prod`/`PROD` -> `ltqc-prod`.
