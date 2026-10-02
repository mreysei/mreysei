# How this profile is written

`README.md` and everything in `assets/` are **written by a program**, never by hand. The program
reads the content of [www.mreysei.dev](https://www.mreysei.dev) and rewrites the profile when that
content changes, so the profile always says what the website says. An edit made by hand is undone
by the next sync: change the content in the backoffice of the website instead, or the program
here.

## Where the content comes from

The portfolio serves two addresses for this repository (the contract is in `docs/API-CONTRACT.md`
and `docs/contract.ts` of the platform's workspace repository):

| Address                                                         | What it answers                                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/github-profile/content?locale=en`                     | The content as JSON: profile, links, career, technologies, latest posts, featured projects and GitHub figures. Only what the pages of the site already show. |
| `GET /api/github-profile/views.svg?theme=dark\|light&locale=en` | The counter of views, as an image.                                                                                                                           |

The counter is the one image the sync does not write: the README points at the portfolio, GitHub's
image proxy fetches it once per reader, and the API counts that request. The backoffice shows the
figure under Estadísticas → Perfil de GitHub. While the portfolio is down the image is missing and
the rest of the profile stays as it is.

## What the sync writes

| File                               | What it is                                                                                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                        | The profile, in English: the header, the bio, the latest posts, the featured projects, the career and the two cards. A section without content is left out.      |
| `assets/banner-{dark,light}.svg`   | The terminal of the header, with the name, role, headline and current work. Its animation ends before five seconds and never runs for who asked for less motion. |
| `assets/link-*.svg`                | One button per public profile, and one for the website.                                                                                                          |
| `assets/stack-{dark,light}.svg`    | The technologies of the career, most recently used first.                                                                                                        |
| `assets/activity-{dark,light}.svg` | The GitHub figures and the share of each language.                                                                                                               |

The same content always gives the same files, byte for byte, so a sync without changes commits
nothing. An image the profile no longer needs is removed from `assets/`.

Colours come from the two default themes of the portfolio; GitHub shows the dark or the light
image according to the reader's theme. No image loads a font, a style sheet or anything else from
outside: texts are given the width a monospace font takes, and whatever font draws them fits in.

## When it runs

The workflow `.github/workflows/sync.yml` runs every day at 21:17 UTC, when it is started by hand
(Actions → Sync profile → Run workflow) and on every push to `master` that changes the program. It
first checks the program (format, lint, types and tests) and then, in a job of its own that is the
only one allowed to write and installs nothing but what the sync runs with, writes the profile
and commits `README.md` and `assets/` when they changed.

The address of the portfolio is not written in the program: the workflow gives it in
`PROFILE_SITE_URL`, and a repository variable of that name (Settings → Secrets and variables →
Actions → Variables) replaces the one in the workflow file.

GitHub stops scheduled workflows of a repository without activity for 60 days. If the profile
stops following the website, start the workflow by hand once: that turns the schedule on again.

## Running it on your machine

Node 24 runs the TypeScript files as they are; there is no build.

```bash
npm ci
cp .env.example .env  # and set PROFILE_SITE_URL in it
npm run sync          # writes README.md and assets/ from that portfolio
npm test              # the tests
npm run lint && npm run typecheck && npm run format:check
```

| Variable                 | Default            | What it is for                                                                                                |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `PROFILE_SITE_URL`       | None: required     | The portfolio the content is read from, such as `http://localhost:4000` for one in development.               |
| `PROFILE_VIEWS_SITE_URL` | `PROFILE_SITE_URL` | The site whose counter the README shows. Always a public address: GitHub fetches the image, not this machine. |
| `PROFILE_FOLDER`         | The current folder | Where the files are written; another folder lets you look at a result without touching the repository.        |

To see a result without touching the repository, with a portfolio in development:

```bash
PROFILE_SITE_URL=http://localhost:4000 PROFILE_VIEWS_SITE_URL=https://www.example.org \
  PROFILE_FOLDER=/tmp/profile-preview npm run sync
```

## What it trusts

Nothing it reads. The answer of the portfolio is checked before a byte is written, and one that
fails the check stops the sync and leaves the profile as it was:

- Every text but the bio is a single line without control characters, with a size limit. In the
  README and in the images it is written as text: it cannot become markup, a heading, a list or a
  link.
- The bio is the owner's own Markdown and is kept as Markdown, without HTML, as the portfolio
  shows it.
- The pages of the portfolio (home, blog, projects) must be on the address the content was asked
  from. Any other link is https on a public domain, without credentials or a port.
- Icons are path data only, colours are `#rrggbb`, and lists have a maximum length.
- The files written are `README.md` and the images of `assets/`, whose names the program decides.

## What a phone shows

The images are drawn for the width GitHub gives a README on a desk. A phone shows them at less
than half that size, where their small texts are hard to read. Each image has a text read instead
of it, and what the banner says (the headline, the role and the place) is also written as text at
the top of About. A narrow drawing of each image for phones is possible, chosen by the width of
the window, once it is checked on GitHub that its theme switch keeps such a choice.

## Structure

```
src/
  domain/          What the profile says and how it is drawn. Pure TypeScript, no dependency.
  application/     The sync: read the content, build the files, write what changed.
  infrastructure/  Reading the portfolio over HTTP, the schema of its answer, the files on disk.
  main.ts          The composition root, and the only place that reads the environment.
```
