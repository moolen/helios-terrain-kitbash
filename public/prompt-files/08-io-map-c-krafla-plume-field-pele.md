# Io map C: Krafla plume field (Pele)

You are building Io map C, "Krafla plume field" (to become the game region io.pele), as an HTML/three.js prototype in the terrain workbench.

Read these first and follow them:
1. `[path removed]`, the general Io map brief.
2. `[path removed]`. Its "Map C" section and the shared sections are your specific brief.

Setup:
- Your worktree is `[path removed]`, branch `[path removed]`. node_modules is symlinked.
- Start by copying map A's pipeline and code from `[path removed]` (read-only, uncommitted, still being finished by another agent) into your own `[path removed]`, `[path removed]` and `io-c.html`, then adapt them.
- Use the shared asset kit at `[path removed]` (manifest.json).
- The dev server listens on [address removed] and stays running at the end. The owner reviews at [local preview URL]
- Run heavy steps under `flock [path removed]`. Use at most one Playwright browser at a time.

The round:
- Up to about 20 iterations, each with captures you inspect critically. Compare them to `[path removed]` and to the map A captures in `[path removed]`.
- Then write ROUND-1.md, LOG.md and CREDITS.md in [path removed], plus the export README described in BRIEF-BC.md, commit on io/c, and stop.
- If the Write tool blocks .md files, use a Bash heredoc.

Reply with:
- a summary of the map;
- the URL;
- the best 6 capture paths;
- triangle counts and fps;
- known problems;
- an honest quality assessment.
