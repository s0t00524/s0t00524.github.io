# Soto Anno — Research Portfolio

This repository builds the portfolio at <https://s0t00524.github.io/s0t00524/>. The website and curriculum vitae share one structured source of truth:

- publication bibliography: `data/publications.bib`
- publication-only overrides and links: `data/publications-meta.yaml`
- profile, news, awards, education, experience, and service: YAML files in `data/`
- website: Astro static site
- CV: XeLaTeX, `biblatex`, Biber, and `latexmk`

Generated files (`generated/`, `cv/generated/`, `cv/build/`, and `dist/`) are not committed.

## Prerequisites

- Node.js 22.12 or newer (CI uses Node.js 22)
- npm
- TeX Live 2024 or newer with XeLaTeX and Japanese language support
- `latexmk`
- Biber 2.20 or compatible with the installed BibLaTeX version

On macOS, a complete MacTeX installation is the simplest option. On Ubuntu, the CI workflow lists the exact TeX packages it installs.

## First setup

```sh
npm install
```

## Local web development

```sh
npm run dev
```

Open <http://localhost:4321/s0t00524/>. Astro uses the same `/s0t00524/` base path locally as on GitHub Pages, which catches broken project-page links before deployment.

## Production build and preview

```sh
npm run build:web
npm run preview
```

Open <http://localhost:4321/s0t00524/> (or the port shown by Astro if 4321 is already in use).

## CV build

```sh
npm run build:cv
```

This generates `SotoAnno_CV.pdf` at the repository root for local inspection and stages a copy in `public/cv/` so the download works during local development. During a full build, the PDF is copied to `dist/cv/SotoAnno_CV.pdf`, producing the permanent public URL `/s0t00524/cv/SotoAnno_CV.pdf`.

## Validation and full build

```sh
npm run validate
npm run build:all
```

Validation checks BibTeX syntax and duplicate keys, required BibTeX fields, YAML schemas, publication metadata references, news publication references, and author alias matching. The full build also fails on Astro errors, CV compilation errors, missing routes, or root-relative URLs that would break the GitHub Pages base path.

## How to add a publication

The normal update is intentionally short:

1. Copy BibTeX from Google Scholar or another trusted bibliography source.
2. Append it to `data/publications.bib` with a unique citation key.
3. Only if needed, add an entry with the same citation key to `data/publications-meta.yaml` for `featured`, a non-default category, extra links, tags, equal contribution, or publication-generated news.
4. Run `npm run dev` or `npm run build:all` locally.
5. Commit and push.

An entry in `publications-meta.yaml` is optional. Without one, `@article` becomes a journal article, `@inproceedings` becomes an international conference paper, the publication appears on the web and in the CV, and the list is sorted by year automatically.

For a domestic conference, workshop, demo, or poster, add a category override:

```yaml
citationKey:
  category: domestic-conference
```

To generate news without repeating a title or venue from BibTeX:

```yaml
citationKey:
  news:
    - date: 2026-03
      type: accepted
      venue: Conference Name
```

## Repository structure

```text
data/                         canonical YAML and BibTeX data
generated/                    generated Astro JSON (ignored)
src/components/               reusable publication UI
src/layouts/                  shared page shell and navigation
src/pages/                    /, /publications/, and /cv/
src/styles/                   responsive visual system
scripts/                      parsing, validation, generation, and build checks
cv/SotoAnno_CV.tex            hand-maintained LaTeX presentation template
cv/generated/                 YAML-derived LaTeX fragments (ignored)
public/                       static assets
legacy/                       preserved HackMD export, source Markdown, and old CV
.github/workflows/pages.yml   PR validation and main-branch Pages deployment
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Generate data and run the Astro development server |
| `npm run generate` | Parse BibTeX, merge metadata, and generate JSON/LaTeX fragments |
| `npm run validate` | Validate YAML, BibTeX, citation keys, and references |
| `npm run build:web` | Generate and build the production website |
| `npm run build:cv` | Generate and typeset `SotoAnno_CV.pdf` |
| `npm run build:all` | Validate, build CV and web, and stage the deployable PDF |
| `npm run preview` | Preview the production Astro build |

## Deployment

Pull requests run dependency installation, validation, data generation, the Astro production build, the LaTeX/Biber CV build, and base-path checks. They do not deploy.

Pushes to `main` run the same build, add the generated CV to the site artifact, and deploy `dist/` through the official GitHub Pages actions. In repository settings, GitHub Pages should use **GitHub Actions** as its source.

## Content provenance

The migration used the adjacent HackMD Markdown as the primary source, with the prior exported `index.html` and dated CV as comparison sources. The legacy files remain under `legacy/` for auditability and are not part of the deployed site.
