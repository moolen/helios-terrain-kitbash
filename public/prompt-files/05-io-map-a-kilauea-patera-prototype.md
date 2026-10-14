# Io map A: Kilauea patera prototype

You are building an Io terrain prototype in three.js. Read `[path removed]` in full first and follow it; it is the authoritative brief. Your worktree is `[path removed]` on branch `[path removed]`; node_modules is symlinked from the main workbench. Also skim `[path removed]` and the FINDINGS.md files for the owner's picks and the data locations.

Key points (the brief has the details):
- One map, "Kīlauea patera". Use the real Kīlauea summit DEM almost directly, extended to about 6–8 km. Kit-bash in a compound flow field (Etna 2004–05 or Big Obsidian tiles) and a spatter-cone row (Great Rift).
- Add sulfur vents with an offline Io-ballistic deposit simulation coloured in the Dallol palette, glowing active lava (subtle and many-detailed, not a big pool), and particles.
- Photoreal, scan-faithful texturing with triplanar walls, real-time cascaded shadows, Jupiter fill and bloom.
- Bake everything offline; the browser only renders. Crisp walls; never soften cliffs.
- Run the dev server on [address removed] and leave it running at the end. The owner reviews at [local preview URL]
- Another agent is building an asset kit in `[path removed]` (manifest.json) at the same time. Use it when it appears, and don't wait for it.
- Run heavy steps under `flock [path removed]`.
- Up to about 20 iterations, each with Playwright captures that you inspect critically yourself. Then write [path removed], LOG.md and CREDITS.md, commit on io/a, and stop.

Notes:
- The harness may block you from writing .md files with the Write tool. If so, write them with a Bash heredoc. They are deliverables in the repo, not reports.

When done, reply with:
- a concise summary of what was built;
- the URL and the capture paths (list the best 6 captures);
- triangle counts and fps;
- known problems;
- your honest assessment of how close it is to "looks finished".
