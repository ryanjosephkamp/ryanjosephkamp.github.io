# Personal Website Design Guide

This file is the repo-level design guide for Ryan's personal website.

It is a guide, not an authorization. Follow the project constitution at `/Users/noir/Documents/github_portfolio_cleanup/AGENTS.md` and the current task prompt before changing files, claims, hosting settings, or deployment settings.

## Product Role

The personal website should be Ryan's flagship public portfolio surface.

The related blog at `https://ryanjosephkamp.github.io/blog/` can remain a simpler writing archive. The website should carry the more visually compelling, interactive, and exploratory experience.

## Design Target

The next major design direction should feel like:

- an interactive research-software portfolio,
- a polished personal website,
- a visual map of projects and ideas,
- a credible professional presence,
- and a careful disclosure-first presentation of provisional work.

It should not feel like:

- a generic academic CV page,
- a generic SaaS landing page,
- an S26 AIRP-only site,
- or a commercial/scientific hype page.

## Signature Interaction

The highest-priority interaction concept is an interactive repository graph.

The graph should help visitors understand relationships between projects, repositories, articles, demos, research interests, and S26 AIRP clusters. It should support exploration through hover, click, filter, and focus states.

The graph must not imply scientific validation or endorsement.

## Content And Claims Rules

- Do not invent or strengthen claims.
- Do not rewrite CV/resume claims without a source-of-truth review.
- Keep S26 AIRP framed as AI-assisted research software prototypes.
- Preserve provisional/non-overclaiming language around scientific and domain-specific content.
- Do not add Grok-specific, Grokedex, xAI, or `x.ai` content unless Ryan explicitly authorizes it in a future task.

## Visual Principles

- Make the first viewport memorable.
- Use motion and parallax only when they support orientation.
- Keep typography readable and confident.
- Let the repository graph or another real interactive surface carry the "wow" factor.
- Avoid decorative complexity that slows the site or hides the content.
- Preserve strong mobile readability.
- Respect reduced-motion users.

## Prototype Strategy

Before replacing the current live design, build and review multiple directions:

1. Research Graph Observatory.
2. Cinematic Research Portfolio.
3. Lab Notebook Interface.

Ryan should choose a preferred direction, or combine elements, before a final implementation pass.

## Technical Direction

Preferred next prototype stack:

- Astro with an interactive island for the repository graph, or
- Vite + React if the graph becomes the dominant app-like experience.

Plain HTML/CSS/JS remains acceptable for smaller polish passes.

Keep the final output static unless a future requirement clearly needs server-side behavior.

## Review Gates

- Design-suite review.
- Prototype-direction selection.
- Graph data/category approval.
- Content and claims review.
- Desktop/mobile visual QA.
- Accessibility QA.
- Deployment/hosting approval.
