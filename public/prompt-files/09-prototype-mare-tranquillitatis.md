# Prototype: Mare Tranquillitatis

Build the scene `mm-tranq` (Mare Tranquillitatis, `moon.mare_tranquillitatis`) as an HTML/three.js prototype in the terrain workbench.

Read and follow these:
- `[path removed]` (the general brief, including the Io lessons and owner rules);
- the Moon research: `[path removed]`. Its "proposed kit-bash" is your plan.

Setup:
- Worktree `[path removed]`, branch `[path removed]`, dev server on [address removed].
- Start by copying the Io pipeline (`[path removed]`, `[path removed]`) and adapting it.

The key goals:
1. **The real Tranquillitatis pit as the hero landmark.** TRANQPIT1 (2 m) has no data inside the pit, so build the pit as a mesh from the research measurements and the NAC images in `[path removed]`:
   - a funnel about 143 m wide and 20 m deep, with a bright halo;
   - a shaft about 95 m wide with sheer layered walls and a recess band at about 40 m;
   - a 10–15 m overhang on the E, W and N sides;
   - a floor about 105 m down, covered with boulders.
   Layered basalt walls must be crisp; the Io kit's basalt cliff set and the lava-tube scan are possible sources. The pit floor must be visible in sunlight from the hero camera.
2. **The base:**
   - the Kaguya TC DTM at 8.4 m for the map and the context ring;
   - SLDEM2015 for the skyline;
   - the TRANQPIT1 strip blended in at its real position.
   The real wrinkle ridge should stay visible.
3. **Craters:**
   - the Apollo 11 West crater as a fresh blocky crater stamp, with the steep-access basalt deposit on its inner rim;
   - crisper small craters;
   - a Fecunditatis bouldered-ridge stamp.
4. **Boulders and jagged rocks:** Apollo sample scans, densest at fresh rims and the pit, with dense small rubble at the close camera. Use `[path removed]` Moon rocks if they're there.
5. **Look:** lunar photometry, a very hard sun with long shadows, a time-of-day slider, Earth in the sky, and bright fresh-crater halos and rays.

At the end, export the game format and write `ROUND-1.md`, as the brief says. Reply with:
- a summary;
- the URL;
- the best 6 capture paths;
- triangle counts;
- known problems;
- your honest quality estimate.
