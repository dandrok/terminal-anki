# Releasing

Releases are cut from `main` by the **Version** workflow, verified and published by the
**Release** workflow. Nothing is published by hand, and nothing is tagged before its changelog
entry exists.

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

1. **Write the notes first.** Add a `## X.Y.Z` section to [`CHANGELOG.md`](CHANGELOG.md) and
   land it on `main`. This is not paperwork: the GitHub release body is that section, and the
   Version workflow refuses to tag a version it cannot find there.

   Follow semver against the **public API** — the `bin`, the CLI flags, the `src/index.ts`
   exports, and the on-disk file format.

2. **Run the Version workflow.** Actions → **Version** → _Run workflow_ → pick `patch`, `minor`
   or `major`. It:

   - runs `npm run check` — lint, type-check, format:check and the test suite. That is the
     pull-request `verify` job minus the v8 coverage run, and it does **not** include the
     `audit` job (`npm audit --omit=dev --audit-level=high`), so a release is not gated on a
     production dependency audit;
   - computes the next version with `scripts/next-version.ts`;
   - checks `CHANGELOG.md` has the matching section (`scripts/release-notes.ts`);
   - commits `release: X.Y.Z`, tags `vX.Y.Z`, and pushes both.

   There is a `dry-run` switch: it does everything except the commit and the tag, and prints
   the version it would have used.

3. **Approve the deployment.** Version dispatches Release at the tag it just pushed — a tag
   pushed with `GITHUB_TOKEN` does not trigger workflows by itself, so the dispatch is explicit.
   Release's `publish` job waits on the `npm-publish` environment; approve it when GitHub asks.

4. **Check the release page.** Once npm has the package, the `announce` job creates a GitHub
   release titled `vX.Y.Z` with the changelog section as its body.

### Doing it by hand

The workflows listen for a tag, not for the bot, so a manual release is still possible — for a
hotfix when Actions is unavailable, say:

```bash
# CHANGELOG.md already has the ## X.Y.Z section
npm version patch          # writes package.json, commits, tags
git push origin main --follow-tags
```

The tag is the signal either way. Nothing needs to be published from a laptop, and doing so
would skip the verification job and the provenance attestation.

## What each workflow does

| Workflow      | Trigger                       | Jobs                                                                        |
| ------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `version.yml` | manual dispatch from `main`   | `bump`: check, compute the version, verify the changelog, commit, tag, push |
| `release.yml` | a `v*.*.*` tag, or dispatched | `verify`: check + build + tag/version agreement + changelog section         |
|               |                               | `publish`: `npm ci`, build, `npm publish` with provenance (after approval)  |
|               |                               | `announce`: GitHub release from the changelog section                       |

The `publish` job is gated on a `v*` tag ref, so running Release manually from the Actions tab
only ever runs `verify` — it cannot publish from a branch. `announce` needs `publish`, so a
failed publish never leaves a release page pointing at a version nobody can install.

The `publish` job holds `id-token: write`, so it deliberately runs **without** a dependency
cache: a poisoned cache entry would execute in the one place a publish can be triggered.
`package-manager-cache` defaults to true on `setup-node`, so it is disabled explicitly —
omitting `cache:` alone still caches.

## If a release goes wrong

- **Tag pushed with the wrong version.** `verify` fails before `publish` runs. Delete the tag
  (`git push --delete origin vX.Y.Z`), fix, tag again.
- **The Version workflow fails on the changelog check.** Add the `## X.Y.Z` section to
  `CHANGELOG.md`, push it, and run Version again. Nothing was tagged.
- **A tag pushed by hand fails Release's verify on the changelog check.** Same rule, applied to
  the path the Version workflow does not cover: `verify` refuses the tag before `publish` runs,
  so nothing reaches npm. Add the section, then re-run Release at the tag.
- **Published something broken.** Do not unpublish; npm blocks republishing the same version.
  Cut a patch release. Use `npm deprecate terminal-anki@X.Y.Z "reason"` to warn people off.
- **The publish step fails on authentication.** Check that the workflow filename, environment
  name and allowed actions on npmjs.com still match the workflow file exactly. Renaming
  `release.yml` breaks trusted publishing silently.

## Checklist before a major

- [ ] `npm run check` and `npm run build` green locally
- [ ] `CHANGELOG.md` has the `## X.Y.Z` section and it describes what actually shipped
- [ ] The README describes what the release actually does
- [ ] Breaking changes to `src/index.ts` are listed in the README's library section
- [ ] The on-disk schema version is either unchanged or has a migration path
- [ ] The CLI has been driven by hand — menu, study, undo, browse, settings, exit
- [ ] `docs/demo.gif` still matches the UI (`npm run demo` if it does not)
