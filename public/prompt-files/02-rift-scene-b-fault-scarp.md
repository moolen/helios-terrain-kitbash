# Rift scene B: fault scarp

You are building scene B, "fault scarp + chaos edge", of a three.js terrain proof of concept for the Helios space-colony game. Read the brief first: [path removed] It has the sources, look, camera, conventions, resource limits and iteration budget. Follow it exactly.

Your worktree is [path removed], on branch rifts/b. It already exists and has node_modules symlinked. Your scene letter is "b", your dev-server port is 5312, and your raw data folder is [path removed] The Europa DTMs are already in [path removed]

Two other agents are building scenes A and C in sibling worktrees at the same time. Don't touch their folders, and don't touch the shared files in [path removed] Use `flock [path removed]` for heavy steps.

Goal: a reviewable page, `rift-b.html`, at game scale (a 1–3 km map). It shows a raised Conamara-like ice plateau whose layout and block heights come from the real Europa DTMs, with procedural detail on top. The plateau ends in a jointed, blocky fault scarp, 100–250 m tall:
- Build the scarp from real CC0 rock scans: the San Gabriel cliff LAZ, and Poly Haven rock_face / namaqualand_cliff.
- Process the scans into stylized faceted wall modules re-materialled as Europa ice.
- Add toppled blocks, a talus skirt and Poly Haven CC0 rock scatter.

It must read well at the gameplay camera, and at the close-up and hero cameras.

You have up to ~15 iterations. Each iteration is change, capture, look at the captures yourself, log. Then write [path removed] and commit everything on rifts/b: code, small processed assets, docs and CREDITS.md. Then stop.

Your final message to me must contain:
- the paths of the 3 best final captures
- what is scan-derived and what is procedural
- the pipeline you used
- any source problems
- the commit hash
