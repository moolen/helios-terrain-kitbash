# Rift scene A: ice canyon

You are building scene A ("ice rift canyon") of a three.js terrain proof of concept for the Helios space-colony game. Read the brief first: [path removed] It has the sources, look, camera, conventions, resource limits, and the iteration budget. Follow it exactly.

Your worktree: [path removed] (branch rifts/a, already created, node_modules symlinked). Your scene letter is "a", dev-server port [removed], raw data folder [path removed] Two other agents are building scenes B and C in sibling worktrees at the same time. Don't touch their folders or the shared files in [path removed] Use `flock [path removed]` for heavy steps.

Goal: a reviewable page `rift-a.html`. It shows a Charon-style branching ice rift at game scale (1–3 km map). The walls are built from real laser-scanned glacier ice: Hornsund TLS, plus Zenodo iceberg OBJ meshes as a secondary source. The scans are processed into stylized faceted wall modules, with broken ice slabs and blocks scattered on the floor and talus, in a Europa palette. Make sure it reads well at the gameplay camera, and at the close-up and hero cameras.

You have up to ~15 iterations, each one being: change → capture → look at the captures yourself → log. Then write [path removed], commit everything (code, small processed assets, docs, CREDITS.md) on rifts/a, and stop.

Your final message to me must contain:
- the paths of the 3 best final captures
- what is scan-derived and what is procedural
- the pipeline used
- any source problems
- the commit hash
