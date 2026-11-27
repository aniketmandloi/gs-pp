<!-- astack:start -->
## AStack

This repo uses the AStack workflow: plans, specs, and work items live in GitHub issues.

### Commands

- Install: `pnpm install --frozen-lockfile`
- Dev server: `pnpm dev` (the user starts it; agents never do)
- Unit tests: `pnpm test` (Vitest)
- End-to-end tests: `pnpm test:e2e` (Playwright against `pnpm start`; run `pnpm build` first). `e2e/prices.spec.ts`
  expects `e2e/fixture-prices.sql` loaded into a throwaway database, as CI does
- Lint and format: `pnpm lint`, `pnpm format:check`, `pnpm format` to rewrite
- Typecheck: `pnpm typecheck`
- Unused files, exports, and dependencies: `pnpm knip`
- Placeholder and conflict markers in added lines: `.github/scripts/slop-markers.sh main`
- Build: `pnpm build` (needs `DATABASE_URL`; `COMMIT_SHA` is the commit `/health` reports)
- Migrations: `pnpm db:migrate` applies `src/db/migrations/` to `DATABASE_URL`
- Seed: `pnpm seed` loads `~/.cache/gs-pp/goldapi/` and IBJA's 30-day PDF into `DATABASE_URL`, skipping rows already stored

### Conventions

- Pages and route handlers live in `src/app/` (App Router), e.g. `src/app/health/route.ts`.
- Import the database as `db` from `@/db` (`src/db/index.ts`, Drizzle on the Neon HTTP driver).
- Unit tests sit next to the code as `*.test.ts`; end-to-end tests live in `e2e/`.
- Imports into `src/` use the `@/` alias.
- Config files outside Next.js load `.env` with `@next/env`, as `drizzle.config.ts` does.
- Copy shadcn/ui components from its registry into `src/components/ui/` and delete the exports
  nothing imports, since knip fails on unused exports. `src/app/globals.css` defines the theme
  colours their classes name.

### Workflow

- Every change starts from a GitHub issue. One branch per issue, `<n>-<slug>`, from an
  up-to-date `main`.
- Never commit to or push `main`. PRs start with `Closes #<n>` and rebase-merge after CI
  passes, so every commit lands on `main`. GitHub does not enforce this on this plan, so
  agents must.
- Commit each verified logical step separately.
- Deferred work becomes a GitHub issue, never a TODO.

### Environments

- There is one environment: the Vercel production deployment. `.github/workflows/deploy.yml`
  deploys it on every merge to `main`. There are no preview deployments.
- All config comes from environment variables. Nothing in code differs between environments.
- Every new variable goes in `.env.example` with a safe dummy value. Never commit a secret or
  a real `.env` file.
- Deploy secrets are repository secrets named `PROD_<NAME>`; each step that needs one maps it to
  `<NAME>`. Any workflow can read them, so only the deploy and daily workflows reference them.
- Database changes go only through versioned migrations that are safe to run while the
  previous release still serves traffic. The deploy job runs them before it deploys.
- Rollback: 1. `vercel rollback` restores the previous production deployment (the only one
  Hobby allows) and stops production-domain assignment. 2. Merge a revert PR; its deploy run
  fails because its deployment is not assigned to the production domains. 3. Run
  `vercel promote` on that deployment (find it with `vercel ls`) and rerun the Deploy workflow.

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
