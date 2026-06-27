# Personal Website V2 Prototype Strategy

## Principle

V2 should begin as isolated concept and prototype work. The current live
homepage and repositories page remain stable until Ryan explicitly authorizes a
production replacement.

## Recommended Phases

### Phase 1: Concept Ideation

Create a V2 concept lab with six to nine distinct visual directions. Each
direction should describe:

- first-screen composition,
- homepage flow,
- visual language,
- content hierarchy,
- motion/interaction model,
- repository graph or project-exploration concept,
- mobile strategy,
- implementation risk,
- and why it differs from V1.

Use the V1 archive as reference, not as a constraint.

### Phase 2: Shortlist

Choose three candidate directions. Compare them by:

- visual memorability,
- fit with Ryan's voice,
- content clarity,
- performance feasibility,
- mobile readability,
- accessibility,
- claim-safety,
- and ability to support a reimagined repository graph.

### Phase 3: Isolated Coded Prototypes

Build shortlisted directions under paths such as:

```text
prototypes/v2/concept_slug_here/
```

Prototype work should not alter the live root. Each prototype should include a
README that states its concept, risks, and review notes.

### Phase 4: Repository Graph Reimagining

Treat the V2 repository graph as a separate interaction design problem. Do not
assume the V1 SVG force-like graph is the final architecture.

Options to evaluate later:

- a simplified graph with stronger information design,
- a canvas-based or hybrid renderer for performance,
- a staged exploration flow instead of all repositories at once,
- semantic clustering with public GitHub metadata,
- a separate embeddable graph tool,
- or a project atlas that is graph-inspired without being a literal node map.

The first graph prototype should be performance-first and should preserve an
accessible non-graph list or index.

### Phase 5: Production Rebuild

Only after Ryan selects a direction should V2 move into a production branch.
That branch can decide whether to remain plain static HTML/CSS/JS or move to a
lightweight static framework.

## Technical Defaults

- Keep early concepts static and cheap to review.
- Avoid heavy runtime dependencies until a concept earns them.
- Use no secrets or tokens for public GitHub data exploration.
- Prefer local snapshots and graceful refresh behavior for GitHub metadata.
- Treat reduced-motion and mobile behavior as required, not optional.

## Impeccable Review Loop

Use the Impeccable references intentionally:

- `shape.md` before committing to a direction,
- `brand.md` to avoid generic portfolio patterns,
- `layout.md` for hierarchy and rhythm,
- `animate.md` only when motion improves orientation or memory,
- `polish.md` before any prototype is considered ready for Ryan review,
- `overdrive.md` only after Ryan chooses a high-ambition interaction direction.

Do not run live mode unless a future prompt explicitly authorizes it.
