# Portfolio implementation design

The parent supplied the agreed synthesis from two architect candidates and a cross-judge. One `work` collection owns both projects and OSS contributions through `kind: project | oss`. A separate `blog` collection owns dated writing. Model the Domain supplied the schema and kind rather than parallel registries. Type System Discipline supplied schema-derived types and discriminated media.

`src/content.config.ts` validates entries at build time. `src/lib/content.ts` derives types, ordering, and routes from those entries. One `WorkCard` and one `WorkMedia` render both work categories. `src/lib/href.ts` adds the configured base to internal links and public assets. The layout owns global metadata and typography.

The homepage renders both categories as linked sections without JavaScript. Enhancement turns those links into tabs with Projects selected, roving focus, ArrowLeft, ArrowRight, Home, End, and Space support. Titles alone have a brief green glitch. Reduced motion disables that effect and pauses future video previews. Current thumbnails are neutral placeholders. Supplied bodies and media remain deferred.

The project section follows Jake.fun's stylesheet. Desktop titles use its system sans-serif stack at 52.8px; Georgia italic headings and descriptions use 57.6px and 28.8px. Thumbnails use the reference's 1200/630 ratio, with larger gaps between headings, previews, and text. The charcoal background is `#181a1b` and the warm off-white text is `#e8e6e3`, sampled from the supplied screenshot.

The introduction follows the medical reference's monospace styling with locally bundled Fira Mono in regular and bold weights. Only introduction links use gold; tabs and focus outlines remain neutral, and green is reserved for the linked thumbnail and title interaction. Font-loading checks, desktop/mobile screenshots, browser interactions, and responsive overflow checks passed after this revision.

Tab labels also use Fira Mono. The GitHub `@` uses a regular-weight sans-serif glyph while the handle remains bold monospace. Hovering or focusing either a thumbnail or its title highlights the thumbnail frame and offset shadow in green and activates the title glitch together. Reduced motion disables title animation and offset text while retaining the static thumbnail highlight. Browser checks verified these linked states.

## Feature checklist

- [x] 1. `how` over the affected subsystem. n/a, greenfield with no existing application to trace.
- [x] 2. `architect` for parallel design exploration. The parent supplied the completed two-candidate and cross-judge synthesis.
- [x] 3. Write the throughput checkpoint as four todo items.
  - [x] Blocking first steps. Confirm branch, scope, schemas, and compatible dependency versions before writing application logic.
  - [x] Independent workstreams. Content, presentation, and workflow files are separable but one owner implements the coupled feature.
  - [x] Shared mutable state. The feature branch and application files belong exclusively to this implementation worker until it returns.
  - [x] Smallest safe decomposition. One implementation worker prevents shared-file and suite races. The parent handles browser verification after handoff.
- [x] 4. Delegate code-writing to a subagent using your configured feature model. This worker owns the exclusive delegated branch and application writes directly.
- [x] 5. Verify on the matching surface. Astro Check, root/base builds, temporary content publishing checks, and headless Chromium checks passed.
- [x] 6. Rebase into small, ordered commits. Stack follow-ups. skip: local implementation requested; no commit or remote publication requested.
- [x] 7. If the design is contested, `interrogate` before shipping. skip: the parent supplied the agreed synthesis and no contested design remains.
- [x] 8. Run **Opening a PR**. skip: no PR or remote publication was requested.

## Validation

Dependency installation produced the lockfile and reported zero vulnerabilities. Astro Check passed across 13 files with zero errors, warnings, or hints. Root and GitHub Pages base builds each generated 12 pages. The build logs include expected notices for the empty blog collection.

Static artifact checks verified all 10 work routes, empty write-up messages, the blog empty state, canonical URL, and repository-base links and assets. These checks inspect generated files and do not prove browser behavior.

The first check could not write Astro's telemetry configuration outside the workspace. Setting `ASTRO_TELEMETRY_DISABLED=1` allowed checks and builds to run within the sandbox. Use that environment variable for the parent's local dev and verification commands if needed.

Headless Chromium checks passed at desktop and mobile sizes for tabs, keyboard navigation, internal homepage routes, reduced motion, and the no-JavaScript fallback. Screenshots were inspected, and intro width and text weights were adjusted to match the references. Independent source review found duplicated accessible title text in the glitch decoration. The title link now has an explicit accessible name, and the reviewer confirmed the correction.

Temporary Markdown and MDX fixtures verified automatic cards and detail routes, manual work ordering, newest-first blog ordering, and draft exclusion. The fixtures were removed and the final site rebuilt. A generated-output check verified 44 internal page and asset references beneath the GitHub Pages repository base.

No live deployment or user-supplied media verification is claimed. Final `dist` output uses root paths for local preview.
