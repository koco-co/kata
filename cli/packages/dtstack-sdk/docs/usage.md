# dtstack-cli usage

This document mirrors `dtstack-cli --help` output. AI assistants and skills should read this file to learn how to use the CLI without grepping source code.

## Root

```
dtstack-cli — DTStack 平台前置条件 CLI

USAGE
  dtstack-cli <command> [options]

COMMANDS
  Authentication
    whoami             Show current session info

  SQL execution
    sql exec           Run SQL via platform API or direct DB connection
    sql ping           Test connectivity (platform datasource OR direct DB)

  Platform
    project ensure     Find a project by name; create if missing (idempotent)
    precond setup      One-shot: ensure project + DDL + asset import + data-map sync

GLOBAL OPTIONS
  -e, --env <name>     Environment name (resolution: --env > $ACTIVE_ENV >
                       `kata env run` > $DTSTACK_DEFAULT_ENV > config defaultEnv > "example")
  -h, --help           Show help (use `<command> -h` for command-specific help)
  -v, --version        Show version

CONFIG SOURCE PRIORITY
  1. --config <path>         Explicit config file path
  2. $DTSTACK_CONFIG         Env var pointing to config file
  3. config/private/environments/<env>.yaml    Selected by `kata env run <env> -- ...`
  4. dtstack-cli.yaml         Default direct-DB config (if no kata env)
  5. Env vars                Explicit one-off fallback

ENVIRONMENT
  ACTIVE_ENV                Default --env if omitted (优先级最高)
  DTSTACK_DEFAULT_ENV       Default --env if omitted (fallback)
  DTSTACK_COOKIE            Override cached cookie (CI use)
  DTSTACK_USERNAME / DTSTACK_PASSWORD   Auto-login fallback
  DTSTACK_CONFIG            Override default config file path
  {ENV}_BASE_URL            Base URL for env, e.g. EXAMPLE_BASE_URL

NOTE
  platform API 场景建议使用：
  kata env run <env> -- dtstack-cli ...
  它会复用 config/private/environments/<env>.yaml 的 URL 和 auth.cookie。
```

## sql exec

```
dtstack-cli sql exec — Run SQL statement(s)

USAGE
  # Mode A: via DTStack platform API (default)
  dtstack-cli sql exec --project <name> --datasource <type> (--sql <stmt> | --file <path>)

  # Mode B: direct DB connection
  dtstack-cli sql exec --mode direct --source <name-from-config> (--sql <stmt> | --file <path>)

OPTIONS
      --mode platform|direct  Execution mode (default: platform)

  Platform mode:
      --project <name>        Project name (required); created if missing when --auto-create
      --datasource <type>     Doris | MySQL | Hive | SparkThrift (required)
      --auto-create           Create project if it doesn't exist (default: false)

  Direct mode:
  -s, --source <name>         Datasource name from config file (required)

  Common:
      --sql <stmt>            SQL statement (multiple statements separated by `;`)
  -f, --file <path>           Path to SQL file
      --on-exists warn|fail   How to handle "already exists" errors
                              (default: warn in platform mode, fail in direct mode)
      --on-missing warn|fail  How to handle "not exists" errors for DROP
                              (default: warn in platform mode, fail in direct mode)

EXAMPLES
  # Platform mode — most common in test preconditions
  dtstack-cli sql exec --project pw_test --datasource Doris --file ddl.sql

  # Direct mode — bypass platform for speed/debugging
  dtstack-cli sql exec --mode direct --source doris-prod --sql "SELECT 1"

NOTES
  Platform mode auto-routes: CREATE → ddlCreateTableEncryption, others → startCustomSql.
  Already-exists errors on CREATE and missing-object errors on DROP are warnings by default.
```

## sql ping

```
dtstack-cli sql ping — Test connectivity

USAGE
  dtstack-cli sql ping --project <name> --datasource <type>
  dtstack-cli sql ping --mode direct --source <name-from-config>

EXAMPLES
  dtstack-cli sql ping --project pw_test --datasource Doris
  dtstack-cli sql ping --mode direct --source doris-prod
```

## project ensure

```
dtstack-cli project ensure — Find or create a project (idempotent)

USAGE
  dtstack-cli project ensure --name <name> [--owner-id <id>] [--engines <list>]

OPTIONS
  --name <name>           Project name (required)
  --owner-id <id>         Numeric user id (default: 1)
  --engines <list>        Comma-separated engines, e.g. doris3 (default: empty)

EXAMPLES
  dtstack-cli project ensure --name pw_test --engines doris3
```

## precond setup

```
dtstack-cli precond setup — Set up UI-test preconditions in one shot

USAGE
  dtstack-cli precond setup --project <name> --datasource <type> --tables-from <file>

WHAT IT DOES (in order)
  1. Ensure project exists (find by name, create if missing)
  2. Find datasource of given type within the project
  3. Run DDL for each table (idempotent — already-exists is OK)
  4. Import datasource to assets platform (skip if already imported)
  5. Query data map (/dassets/v1/datamap/queryDetail) for each expected table
  6. For tables missing from data map: submit a targeted metadata sync task
     (/dmetadata/v1/syncTask/add) covering only those tables
  7. Poll the data map until all missing tables appear (or timeout)

OPTIONS
      --project <name>        Project name (required)
      --project-id <id>       Exact Batch project ID; avoids duplicate-name matches
      --datasource <type>     Doris | MySQL | Hive | SparkThrift (required)
      --datasource-id <id>    Exact Batch datasource ID
      --datasource-name <n>   Exact Batch datasource name
      --datasource-type-id <id>
                              Datasource type ID used as a fallback matcher
      --datasource-aliases <csv>
                              Extra datasource-name keywords for fallback matching
      --metadata-datasource-id <id>
                              Exact metadata datasource ID for sync task
      --metadata-datasource-name <n>
                              Exact metadata datasource name for sync task
      --metadata-datasource-type-id <id>
                              Metadata datasource type ID fallback matcher
      --database <name>       Target database/schema for DDL, DML and metadata sync
                              (alias: --db)
      --schema <name>         Datasource schema fallback when --database is not set
      --tables-from <path>    YAML file with tables (see schema below)
      --skip-sync             Skip step 4-7 (DDL only)
      --sync-timeout <sec>    Data map poll timeout (default: 180)

TABLES YAML SCHEMA
  tables:
    - name: my_table
      sql: |
        CREATE TABLE my_table (...) ...;
        INSERT INTO my_table VALUES (...);

EXAMPLES
  dtstack-cli precond setup \
    --project pw_test --datasource Doris \
    --tables-from precond/tables.yaml

EXIT CODES
  0  All steps succeeded
  1  Generic failure (see stderr)
  2  Data map poll timed out (DDL/import/sync-task succeeded; tables not yet
     visible in data map)
```

## whoami

```
dtstack-cli whoami — Show current session

USAGE
  dtstack-cli whoami [--env <name>]
```
