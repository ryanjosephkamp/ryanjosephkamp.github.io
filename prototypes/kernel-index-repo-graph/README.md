# Kernel Index Repository Graph Prototype

This is an isolated personal website prototype. It does not replace the live root site.

## Scope

- Concept direction: Kernel Index + Open Research Console.
- Data source: public GitHub repository metadata for `ryanjosephkamp`.
- Data mode: generated static snapshot with optional public API refresh in the browser.
- Secrets: none.
- Token use: none for graph data.

## Local Review

From this folder:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Refresh The Snapshot

From the repository root:

```bash
node prototypes/kernel-index-repo-graph/scripts/fetch-public-repos.mjs
```

The script calls the public GitHub API without auth headers and writes:

```text
prototypes/kernel-index-repo-graph/data/repos.snapshot.json
```

## Guardrails

- This prototype filters provider-specific repository metadata that Ryan asked to keep out of this website direction.
- Clustering is deterministic and reviewable, based on public metadata only.
- S26 AIRP is framed as AI-assisted research software prototypes with provisional scientific/domain content.
- No scientific validation, production readiness, or CV/resume claim is implied.
