# Rift scene C: graben field

You are building scene C ("graben + fissure field") of a three.js terrain proof of concept for the Helios space-colony game. Read the brief first: [path removed] It covers sources, look, camera, conventions, resource limits and the iteration budget. Follow it exactly.

**Setup**
- Worktree: [path removed], branch rifts/c. It is already created, with node_modules symlinked.
- Scene letter "c", dev-server port [removed], raw data folder [path removed]
- Two other agents are building scenes A and B in sibling worktrees at the same time. Don't touch their folders or the shared files in [path removed]
- Use `flock [path removed]` for heavy steps.

**Goal:** a reviewable page `rift-c.html` showing a stepped Europa graben at game scale (1–3 km map):
- Parallel normal faults drop a floor block between them, with open fissures across the surrounding plain.
- Take the layout from a Canyonlands Needles lidar subset if obtainable. Otherwise build it procedurally from real graben geometry, and say which you did.
- Build the walls from the Zion Cable Mountain UAV LAZ (a tall wall with a scar and talus). Process the scans into stylized faceted wall modules, re-textured as Europa ice.
- Scatter Poly Haven CC0 boulders and ice blocks.
- Keep gameplay readability in mind: passable floor, ramps where fault relays connect, chokepoints.
- It must read well at the gameplay camera, and at the close-up and hero cameras.

**Iterations:** up to ~15. Each iteration: change → capture → look at the captures yourself → log. Then write [path removed], commit everything (code, small processed assets, docs, CREDITS.md) on rifts/c, and stop.

**Final message to me** must contain:
- paths of the 3 best final captures
- what is scan-derived vs procedural
- the pipeline used
- any source problems
- the commit hash
