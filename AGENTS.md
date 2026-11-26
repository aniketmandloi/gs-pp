<!-- astack:start -->
## AStack

This repo uses the AStack workflow: plans, specs, and work items live in GitHub issues.

### Commands

None yet: the walking-skeleton slice adds them.

### Workflow

- Every change starts from a GitHub issue. One branch per issue, `<n>-<slug>`, from an
  up-to-date `main`.
- Never commit to or push `main`. PRs start with `Closes #<n>` and rebase-merge after CI
  passes, so every commit lands on `main`. GitHub does not enforce this on this plan, so
  agents must.
- Commit each verified logical step separately.
- Deferred work becomes a GitHub issue, never a TODO.

### Environments

- Every merge to `main` deploys to `development`; only a GitHub release deploys to `production`.
- All config comes from environment variables. Nothing in code differs between environments.
- Every new variable goes in `.env.example` with a safe dummy value. Never commit a secret or
  a real `.env` file.
- Deploy secrets are repository secrets named `DEV_<NAME>` and `PROD_<NAME>`; each deploy job
  maps its own prefix to `<NAME>`. Any workflow can read a `PROD_` secret, so never reference
  `PROD_` secrets outside the production deploy job.
- Database changes go only through versioned migrations that are safe to run while the
  previous release still serves traffic.

### Code rules

None of these ship:

1. Dead code, including code this change made unused.
2. Commented-out code.
3. Debug output or leftover logging.
4. TODO, FIXME, HACK, stubs, or fake data outside tests.
5. Options, layers, or abstractions nobody asked for.
6. A helper, type, or dependency that duplicates an existing one.
7. Checks for impossible states, or try/catch that swallows errors.
8. `any`, unchecked casts, or lint and type suppressions used to pass a check.
9. Comments that restate the code; comments say only what the code cannot.
10. Tests that assert nothing or pass without the change.
11. Reformatting or refactors outside the issue.
12. Style that differs from the surrounding code.
13. Vague names (`data`, `util`, `helper`, `temp`) where a domain name exists.
<!-- astack:end -->
