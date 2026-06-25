# Kernel Index Repository Graph Prototype

This is an isolated personal website prototype for a repositories / portfolio explorer tab.
It does not replace the live root site or define the future homepage.

## Scope

- Concept direction: Kernel Index + Open Research Console.
- Data source: public GitHub repository metadata for `ryanjosephkamp`.
- Data mode: generated static snapshot with optional public API refresh in the browser.
- Secrets: none.
- Token use: none for graph data.
- Page role: repositories, projects, and GitHub exploration surface rather than landing page.

## Interaction Notes

- Primary graph edges show cluster membership.
- Dashed secondary graph edges show secondary metadata affinity where a repository also matches another cluster.
- The all-repository default view keeps labels restrained; labels become more available in focused, filtered, or selected states.
- Cluster dragging lightly pulls child repositories so the graph feels more organic without adding dependencies.
- The repository index is collapsed by default and opens to the most recently updated 25 repositories, with a show-all option for deeper review.
- Mobile uses a compact explorer layout with graph, filters, selected detail, and card-style list rows instead of a desktop dashboard stack.

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
