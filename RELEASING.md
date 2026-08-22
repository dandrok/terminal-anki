# Releasing

Releases are cut from `main` and published by tagging. Nothing is published by hand.

## Once, on npmjs.com

Publishing uses **npm trusted publishing (OIDC)**. There is no `NPM_TOKEN`, no repository
secret, and no credential to rotate: npm trusts the workflow directly, GitHub mints a
short-lived token for each run, and provenance is attested automatically.

Configure it under the package's **Trusted Publisher** settings:

| Field                | Value                                     |
| -------------------- | ----------------------------------------- |
| Organization or user | `dandrok`                                 |
| Repository           | `terminal-anki`                           |
| Workflow filename    | `release.yml` (filename only, not a path) |
| Allowed actions      | `npm publish`                             |
| Environment name     | `npm-publish`                             |

The environment name must match the `environment:` key on the workflow's `publish` job.

## Once, on GitHub

Create the `npm-publish` environment under **Settings → Environments** and add yourself as a
required reviewer. That is what stops a tag from publishing without a human looking at it.

## Cutting a release

1. Land everything on `main` and make sure CI is green.
2. Bump the version. Follow semver against the **public API** — the `bin`, the CLI flags, the
   `src/index.ts` exports, and the on-disk file format:

   ```bash
   npm version patch   # or minor / major
   ```

   `npm version` writes `package.json`, commits, and creates the tag.

3. Push the commit and the tag:

   ```bash
   git push origin main --follow-tags
   ```

4. Approve the deployment when GitHub asks. The `publish` job waits for it.

## What the workflow does

| Job       | Runs                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| `verify`  | `npm run check`, `npm run build`, and asserts the tag matches `package.json` |
| `publish` | `npm ci`, `npm run build`, `npm publish` with provenance                     |

The `publish` job is gated on a `v*` tag ref, so running the workflow manually from the Actions
tab only ever runs `verify` — it cannot publish from a branch.

The `publish` job holds `id-token: write`, so it deliberately runs **without** a dependency
cache: a poisoned cache entry would execute in the one place a publish can be triggered.
`package-manager-cache` defaults to true on `setup-node`, so it is disabled explicitly —
omitting `cache:` alone still caches.

## If a release goes wrong

- **Tag pushed with the wrong version.** `verify` fails before `publish` runs. Delete the tag
  (`git push --delete origin vX.Y.Z`), fix, tag again.
- **Published something broken.** Do not unpublish; npm blocks republishing the same version.
  Cut a patch release. Use `npm deprecate terminal-anki@X.Y.Z "reason"` to warn people off.
- **The publish step fails on authentication.** Check that the workflow filename, environment
  name and allowed actions on npmjs.com still match the workflow file exactly. Renaming
  `release.yml` breaks trusted publishing silently.

## Checklist before a major

- [ ] `npm run check` and `npm run build` green locally
- [ ] The README describes what the release actually does
- [ ] Breaking changes to `src/index.ts` are listed in the README's library section
- [ ] The on-disk schema version is either unchanged or has a migration path
- [ ] The CLI has been driven by hand — menu, study, undo, browse, settings, exit
