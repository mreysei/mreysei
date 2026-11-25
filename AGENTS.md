# github-profile — guide for AI assistants

This repository is the profile of the owner on GitHub (`mreysei/mreysei`, public). It is one of
the repositories of the mreysei platform: the binding rules (priorities, TypeScript only, commits,
privacy) live in the workspace repository, one level up: `../AGENTS.md` and `../docs/`. Read them
before working. When this repository is opened alone, clone <https://github.com/mreysei/portfolio>
to read them.

## Local specifics

- **`README.md` and everything in `assets/` are written by the program in `src/`, never by hand.**
  The next sync undoes an edit made by hand. Change the content in the API of the portfolio
  (`GET /api/github-profile/content`), or change the program. How it works: `docs/SYNC.md`.
- Branch: **`master`**, the one exception to `main`. A push here publishes the profile, so never
  push unless the owner asks.
- There is no build script. Before committing run `npm run format:check`, `npm run lint`,
  `npm run typecheck` and `npm test`.
- Commits follow the workspace format (gitmoji, English, imperative, at most 72 characters),
  checked by `.githooks/commit-msg`.
- Tests and local runs never call the network: the content and the pictures come from the
  portfolio, and `.env` holds the tokens (never print them).
