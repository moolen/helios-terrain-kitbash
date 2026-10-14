# Prototype: Cerberus Fossae (Mars)

Build the scene `mm-cerberus` (Cerberus Fossae, the NEW region `mars.cerberus_fossae`) as an HTML/three.js prototype in the terrain workbench.

Read and follow these:
- `[path removed]` (the general brief, Io lessons and owner rules);
- the research: `[path removed]` (the Cerberus part and its proposed kit-bash), and `[path removed]` there.

Setup:
- Worktree `[path removed]`, branch `[path removed]`, dev server on [address removed].
- Start by copying the Io pipeline (`[path removed]`, `[path removed]`) and adapting it to Mars.

The key goals:
1. **Base:** use anchor A (10.30N 156.95E). Take the HiRISE PSP_009280_1905 1 m strip through the middle (sample in `[path removed]`, raw in `[path removed]`), blended into the CTX 20 m DTM for the rest of the 12 km (the layout is in `[path removed]`). Use CTX only for layout and padding; it has height spikes at wall edges.
2. **Crisp fissure walls (the hard part).** The HiRISE stereo fills the shadowed lower walls with smooth guessed triangles. Kit-bash the walls:
   - a top cliff band from the Snake River / Malad Gorge lidar (stacked thin basalt flows), scaled 2–3×;
   - Kīlauea 2018 talus slopes below (`[path removed]`);
   - Dry Falls for benched sections.
   Use them as heightfield stamps along the wall lines where that works, or as cliff mesh modules (from `[path removed]` when available) where the walls are too steep. The walls must be crisp and layered, with dust on the ledges, boulder trails and fall boulders on the talus (after the DTEEC_017719 images).
3. **Plains:** young platy and rafted lava (Athabasca style; the Amazonis platy DTM in `[path removed]` makes good stamps), rootless-cone clusters, and dust and sand in the lows, with wind streaks.
4. **Mars look:** the measured palette, a butterscotch sky, distance dust haze and a hard sun. Use the Mars kit from `[path removed]` as it appears; until then, use the regraded candidates in `[path removed]`.
5. **Gameplay:** hubs on the north and south plains, the steep-only deposit on the collapsed block in the northern trough, and possible thermal cells (young volcanism) along the fissure floors, marked in the masks.

At the end, export the game format and write `ROUND-1.md`. Reply with:
- a summary;
- the URL;
- the best 6 capture paths;
- triangle counts;
- known problems;
- your honest quality estimate.
