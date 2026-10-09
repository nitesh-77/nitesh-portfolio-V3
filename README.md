# Nitesh's portfolio

An Astro static portfolio with Markdown and MDX content.

## Run locally

Use Node 22.12 or newer. Install from the lockfile and start the development server.

```sh
npm ci --cache /tmp/portfolio-npm-cache
npm run dev
```

Open `http://localhost:4321`. Run the content and TypeScript checks before building.

```sh
npm run check
npm run build
npm run preview
```

## Add a project or OSS contribution

Copy `templates/work.md` to `src/content/work/your-slug.md` or `.mdx`. Use a lowercase filename with hyphens for its URL. The template directory is outside both content globs.

```yaml
kind: project
title: Your project title
description: A short, accurate description of your work.
order: 8
media:
  kind: placeholder
```

Use `kind: oss` for an open source contribution. `order` must be an integer and controls the position within its category. Adding an entry also generates its `/projects/your-slug/` or `/oss/your-slug/` page. Write Markdown below the closing frontmatter delimiter when the write-up is ready. An empty body displays "Full write-up coming soon."

To add verified external links, use the optional `links` list.

```yaml
links:
  - label: Repository
    href: https://github.com/nitesh-77
```

Replace that URL with the actual repository or contribution URL. Do not infer pull request links.

## Add media

All current previews are neutral decorative placeholders. To use supplied media, put files in `public/media/` and use root-relative paths. The site adds the GitHub Pages base when rendering them.

For a still image, replace `media` with this structure.

```yaml
media:
  kind: image
  src: /media/your-image.webp
  alt: Describe what the image shows.
```

For a silent looping preview, supply a readable poster as well.

```yaml
media:
  kind: video
  src: /media/your-preview.mp4
  poster: /media/your-poster.webp
  alt: Describe what the preview shows.
```

Videos start paused. With JavaScript, they play only while visible and pause when the page is hidden. Reduced motion keeps them paused on their posters. Each video preview has a pause button. Without JavaScript or intersection observation, the poster remains visible. Image and video support has no supplied media to verify yet.

## Publish a blog post

Copy `templates/blog.md` to `src/content/blog/your-slug.md` or `.mdx`. Set `title`, `description`, and `published`, then write your post below the frontmatter. Change `draft` to `false` to include it in the static output. Posts appear newest first by `published`. Drafts have no public route. The current blog index has no posts.

## Build for GitHub Pages

The workflow runs `npm ci`, `npm run check`, and `npm run build` before deployment. After merging to `main`, configure the repository's Pages source as GitHub Actions. No deployment has been run during implementation.

GitHub Actions builds use `https://nitesh-77.github.io/nitesh-portfolio-V3/`. Local development uses `/`. To check the repository base locally, run these commands.

```sh
GITHUB_ACTIONS=true npm run build
GITHUB_ACTIONS=true npm run preview
```

Open `http://localhost:4321/nitesh-portfolio-V3/`. Rebuild without `GITHUB_ACTIONS` to restore root paths.
