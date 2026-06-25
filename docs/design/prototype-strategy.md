# Prototype Strategy

This document summarizes the repo-local prototype strategy for Ryan's next personal website rebuild.

For the fuller workspace planning surfaces, see:

- `/Users/noir/Documents/github_portfolio_cleanup/planning/personal_website_design_brief_v0.1.md`
- `/Users/noir/Documents/github_portfolio_cleanup/planning/personal_website_inspiration_audit_v0.1.md`
- `/Users/noir/Documents/github_portfolio_cleanup/planning/personal_website_prototype_strategy_v0.1.md`
- `/Users/noir/Documents/github_portfolio_cleanup/planning/personal_website_technical_options_v0.1.md`
- `/Users/noir/Documents/github_portfolio_cleanup/planning/personal_website_agent_roles_v0.1.md`

## The Three Prototype Directions

### 1. Research Graph Observatory

An interactive repository graph is the centerpiece. Visitors explore Ryan's work as clusters of connected projects, repositories, articles, demos, and themes.

### 2. Cinematic Research Portfolio

A visually dramatic scrolling portfolio with strong typography, atmospheric backgrounds, selected projects, and a repository graph as a major section.

### 3. Lab Notebook Interface

A polished research-workbench style site that connects notes, artifacts, project clusters, and writing into one exploratory surface.

## Recommended Next Build Step

Do not replace the live site immediately.

First, create a prototype branch or separate prototype workspace that can render all three concepts for Ryan review. Use realistic but bounded content and keep all claims conservative.

## Repository Graph Requirements

The graph should support:

- draggable nodes,
- hover summaries,
- click-to-focus behavior,
- theme filtering,
- mobile fallback,
- accessible alternative list/table view,
- and clear links to GitHub, blog articles, demos, or project pages.

The graph data should be explicit and reviewable. Do not infer relationships without an approved rule.

## Hosting Decision

Keep the live GitHub Pages site unchanged until Ryan approves a prototype direction and deployment plan.

Vercel or Netlify may be useful for preview deployments, but no hosting settings should change without a dedicated authorization prompt.
