# Io scene C ("Krafla plume field" → game region `io.pele`): round 1

Page: `[endpoint removed]` (dev server [address removed]). Code `[path removed]`, bake `[path removed]` (`run_all.sh`), assets `[path removed]` (139 MB incl. the 35 MB game export), work data `[path removed]`. Log: `LOG.md`; credits and real-vs-procedural: `CREDITS.md`.

## What was built
A 7.168 km square of the **real Krafla caldera** (ArcticDEM v4.1 2 m: Leirhnjúkur fissure swarm, the 1975–84 Krafla Fires lava plain, the Krafla massif, Víti) dressed as a Pele-type plume field:
- **Collapse pit + lava lake.** The real Plosky Tolbachik summit pit (ArcticDEM 2 m), scaled to a 272 m rim radius and 146 m depth, carved into the plain on the vent fissure; the upper walls are steepened with a concave depth remap (procedural; the plan shape, rim and floor stay real). Its floor holds a ~48 000 m² crusted lava lake: dark plates, only some seams glowing, a broken molten margin (after Galileo I32).
- **Stitched compound flow field (~4 km²).** A lava CA from the south vent fissure on the real topography gives 24 overlapping units with lobes and tongues; the surface relief is a seamless mosaic of ~130 Etna 2004–05 tiles (rotated to local flow direction, mirrored, cosine-blended) with ~100 Big Obsidian pressure-ridge tiles on patchy distal zones. The flows bury the inpainted Kröflustöð site.
- **Great Rift spatter cones** on the north fissure segment (6 glowing throats); en-echelon incandescent fissure with crust bridges on the south segment.
- **Infrastructure removed:** OSM roads, 114 geothermal pipelines, buildings, power plant, drill site, ponds and 157 auto-detected drill pads inpainted (2.4 km²). Víti's flat lake becomes a frozen SO₂ floor.
- **Offline Pele deposit simulation** (`deposits.json`): one Io-ballistic plume (g 1.796, 92 m/s, 3 episodes × up to 3 M particles, azimuthal mass/range lobes, rays), terrain collision, vent-facing/lee incidence weighting, adaptive smoothing of sparse fringe counts, a separate **dark pyroclastic fan** from the coarse proximal clasts, fumarole crusts on the real Krafla fissures / Víti rim / Leirhnjúkur solfatara / pit rim, cold-trap frost (suppressed in the lava-heated pit). Colour: red/orange to ~1 ring radius, acid yellow, then cream; terrain (fine and broad topographic position, slope, roughness of the real buried lavas) decides the zone edges, no noise blobs.
- **Browser:** map A's quadtree terrain, CSM shadows, bloom, AgX/ACES, heat shimmer, Jupiter + Jupiter-shine, particulate translucent plume umbrella (raymarched shell + curtain, sized to the simulated ring) plus GPU ballistic grains, fumarole puffs, ground dust, lava outgassing, ~34 000 instanced kit scan rocks (talus, flow blocks, spatter and pit bombs, sulfur blocks, Dallol mounds). Context apron (16 m ArcticDEM) with the deposit fading out past the map edge. Review buttons for close / gameplay / overview / wall / vent / night; toggles; debug views (deposit, masks, normals, lava, AO, albedo, layer weights).

## Captures (round 1, it19)
`[path removed]` (= `[path removed]`) and `it01-vs-it19.jpg`.

## Triangles and frame time (RTX 4070 SUPER, ANGLE/Vulkan, headless Chrome)
| view | total tris | terrain | scatter (instances) | GPU ms/frame @1920×1080 (perf.mjs) | page fps |
| --- | --- | --- | --- | --- | --- |
| close | 202 k | 130 k | 73 k (1 220) | 0.45 | 60 |
| gameplay 2350 m | 220 k | 71 k | 149 k (3 663) | 0.44 | 60 |
| overview | 18 k | 16 k | 2 k | 0.40 | 60 |
| wall hero | 246 k | 150 k | 96 k (2 038) | 1.72 | 60 |
| vent hero | 175 k | 120 k | 55 k | 0.52 | 60 |
| night | 371 k | 133 k | 238 k (5 795) | 0.42 | 60 |
All views are under the 500 k budget and vsync-capped at 60 fps in the page. The ms/frame figures use map A's method (60 composer renders + `gl.finish`); under ANGLE they are likely optimistic and should be re-measured on the owner's desktop. Mesh: 1.56 M faces at the finest level, leaf error 0.3 m (99.9th pct).

## What works
- Composition reads as Pele from the overview and the vent shot: dark pit and fan, black flow tongues, red/orange near field, yellow and cream fringe, broken by the real Krafla relief (scarps and lava lobes shed or catch fallout), Jupiter overhead.
- The gameplay camera has active lava in view (the en-echelon fissure, the cone throats, the lake glow) and dark grey-black flows whose Etna/Obsidian relief is visible.
- Pit walls are layered dark basalt lit by the lake; lake is a crusted pond with a broken glowing margin.
- Pipeline is reproducible from `run_all.sh`; CA result cached; game export in `[path removed]` (README.json).

## What doesn't (known problems)
- **Deposit edges near flows at night:** thin orange/red lines along some flow margins in the night view (deposit fringe lit by lava irradiance/Jupiter-shine). Day views are mostly fine, but a few flow margins still have a pale fringe.
- **Radial rays** in the red zone are still a bit graphic (starburst) at gameplay range; should be thinner/fainter or come from the simulation only.
- **Pit walls** are smooth at the close camera: the Tolbachik donor is 2 m data shrunk ~3×, so wall detail is mostly shader bedding; no real 1 m cliff texture. Lake crack network is a regular Voronoi pattern and reads graphic up close.
- **Apron**: the deposit fade outside the map is soft but shows mip-level blockiness at the far corners; the square map edge is still faintly visible in the overview.
- **Overview** camera at 9.8 km uses the L0 node only (16 k tris) and looks flat; the plume dome reads as a faint hemisphere.
- Remaining road/pipeline traces are only visible in raking-light hillshades (mostly buried by flows and deposit).
- Scatter density in the deposit plain is low (few blocks visible at gameplay range away from walls and flows).
- Perf numbers are headless; not checked on the owner's machine.

## Next steps
1. Thin the ray streaks and push them into the deposit sim (ray directions as mass lobes only).
2. Replace the pit wall shading with kit cliff scans or a dedicated 1 m wall module (e.g. Tarawera chasm close-up), keep it crisp.
3. Lake: irregular plate pattern (scan-based crust texture) and slow plate drift.
4. Night fringe: fade deposit-edge brightness under irradiance; check all flow margins.
5. Apron: bake a dedicated 64 m deposit-fade raster instead of sampling a high mip.
6. More scatter on rough old lava in the deposit plain; spatter ramparts along the fissure.

## Route into Godot
Use `[path removed]`: rebuild the terrain from `height_1m.png` (+`height_1m.json`[path removed]`maps/masks_a|masks_b|emit|aux.png` in one terrain shader (port of `[path removed]`: triplanar kit sets, deposit threshold against topographic position/slope/roughness, emission), place plume/fumarole/fissure/lake from `features.json` (GPUParticles3D for the umbrella; the deposit rasters are already baked), and instance `scatter.json`[path removed]`io.pele`; the map is 7.168 km instead of 12 km.
