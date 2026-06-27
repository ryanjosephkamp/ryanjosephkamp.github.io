# V2 Paper-Minimal QA Checklist

Use this checklist before calling a V2 prototype ready for Ryan review. It is a quality gate for the
paper-minimal direction, not a production replacement plan.

## Direction

- The page should feel like a blank sheet of paper on screen: plain, direct, readable, and
  functional.
- Avoid fake paper texture, notebook lines, graph paper, parchment effects, and decorative paper
  grain.
- Avoid glossy panels, glassmorphism, neon, cyberpunk, dashboard chrome, and commercial landing-page
  polish.
- Prefer direct labels such as Projects, Repositories, Writing, CV, and Public GitHub repositories.
- Avoid metaphor-heavy headings or copy unless Ryan explicitly asks for them.

## Content And Claims

- Do not invent CV, resume, scientific, or domain-specific claims.
- Keep S26 AIRP framed as AI-assisted research software prototypes.
- Keep scientific and domain-specific content provisional and non-validated.
- Do not add Grok-specific, Grokedex, xAI, or `x.ai` visible content.
- Do not fake an official GitHub contribution calendar. If an activity view is based on repository
  metadata, label it that way.

## Interaction

- The repository graph should be low-clutter by default.
- Labels should appear on demand or in constrained situations, not overwhelm the graph.
- Search, filter, graph selection, inspector details, and text-list fallback must all work.
- Graph motion, if any, must stay subtle, readable, and respectful of `prefers-reduced-motion`.
- No bouncy snap-back behavior unless Ryan explicitly reauthorizes it.

## Accessibility And Responsiveness

- Desktop and mobile screenshots must be captured for every meaningful design pass.
- No page-level horizontal overflow at 1440x1000 or 390x844.
- Body text must remain readable at mobile sizes.
- Keyboard focus must be visible.
- Interactive controls should use semantic buttons, links, labels, or form controls.
- Run Playwright and axe checks before reporting the prototype as review-ready.

## Performance

- Keep the prototype static and lightweight unless a future prompt authorizes a larger architecture
  change.
- Avoid heavy animation libraries, UI kits, WebGL, and large graph packages until the direction
  requires them.
- Avoid full redraw or layout work during ordinary scroll unless it is measured and necessary.
- If a graph feels laggy, diagnose runtime work before changing visual constants.
