# Paper Minimal V2 Prototype

This is an isolated coded prototype for Ryan's Personal Website V2 direction. It does not replace the live website root or the current repositories page.

## Concept

Working direction: **paper-minimal personal website with an embedded public repository explorer**

The prototype combines:

- a sparse homepage with direct navigation,
- public repository data shown as a quiet plotted diagram,
- a compact repository inspector and accessible list fallback.

## Features

- Lightweight static HTML/CSS/JS.
- Canvas-based public repository graph using the existing public repository snapshot.
- Low labels by default; repository names appear on hover/focus/selection.
- Click a repository point to reveal details in a compact inspector.
- Minimal repository search and cluster filters.
- Site-wide theme control: system, dark, and light.
- Compact public repository activity strip based on public repository metadata.
- Accessible repository list fallback.
- S26 AIRP provisional/non-overclaiming framing.
- No secrets or tokens.

## Local Review

From the repository root:

```bash
python3 -m http.server 4179
```

Then open:

```text
http://127.0.0.1:4179/prototypes/v2-silent-source-constellation/
```

## Guardrails

- This prototype is not a live-site replacement.
- It does not change GitHub Pages settings or repository metadata.
- Repository descriptions come from public repository metadata.
- S26 AIRP repositories remain framed as AI-assisted research software prototypes with provisional scientific/domain-specific content.
- No scientific validation, CV/resume claim, or production-readiness claim is implied.
- Provider-specific excluded content is not included.
