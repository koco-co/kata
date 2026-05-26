# Source-code confirmation

Trigger: after module-identify has produced a stable {project, module} context, before historical-context.

Goal: pin the front-end and back-end source repos (group / projectname / branch) that this feature's cases must consult, as a deterministic, user-confirmed input.

Procedure:
1. Derive a recommendation:
   - First, look up the knowledge base mapping "开发版本 → repos+branch" (see knowledge entry `source-repo-map`). The Lanhu/Axure PRD usually carries a "开发版本" keyword (e.g. "开发版本：6.3岚图定制化分支").
   - If unmapped, infer semantically from the PRD/page content.
2. Present ONE confirmation round (front-end + back-end together) via the runtime's ask-user primitive:
   > 请确认该功能涉及的前端和后端 GitHub 仓库：
   > 前端: <group>/<repo>@<branch>
   > 后端: <group>/<repo>@<branch>
3. If `.kata/repos` already contains the confirmed repos, present them as the default; if missing, request them (give clone guidance) or record a blocking todo.
4. Write the confirmed triples into **`.process/source-snapshot.json#confirmed_source_repos[]`** (`FeatureSourceSnapshot@1`), each `{group, project, branch, role}`.
   - Also record **`.process/source-snapshot.json#slug_source`**: the stable identity of the slug origin passed to `kata features resolve`, such as `lanhu:cd882ee8` or `prd:15696.txt`.
   - `slug_source` lets a later different-source request at the same path trigger the Gap 1 collision rule.
   - Do NOT write either field to `metadata.yaml`; `FeatureMetadata@1` is `additionalProperties:false` and has no `source_repos` or `notes` field.
   - The Lanhu URL goes to `metadata.yaml#inputs` with `kind: lanhu`.
   - These confirmed repos become required verification inputs: `repo.line` source_refs must resolve into one of them. See L2.
5. If the user provides source repo paths, platform DOM files, `*-local.yaml`, environment YAML, screenshots of forms, or says to "参考源码/DOM/平台结构", record those evidence items in source-snapshot as required read targets.
   - Before case-draft, read them and extract a concise form-field baseline: page/module, visible labels, required fields, option names, buttons, and fields that are explicitly absent.
   - If any required target is unreadable, block and ask for the missing path/content; do not defer by using history, few-shot, or guessed form fields.

Do NOT proceed to historical-context until the triples are confirmed or explicitly deferred as blocking.
