# Io scene B ("Tarawera fissure" → `io.tvashtar`): round 1

Page: `[endpoint removed]`. The dev server runs on [address removed]. The review camera buttons are at the top left; layer toggles, a time-of-day slider, exposure and debug views are on the right. You can orbit or pan with the mouse and fly with WASD/QE.

## What was built
- **Base (real data, used directly).** The LINZ Bay of Plenty lidar DEM at native 1 m (CC BY 4.0) over a square 7.168 km on a side (EPSG:2193, E 1902200–1909368, N 5758732–5765900). The 1886 joined crater chain runs corner to corner, from Wahanga in the NE through Ruawahia and the dome plateau to the SW chasm end, with Lake Rotomahana's east arm and Lake Tarawera on the W and SW edges. The chasm walls are untouched lidar, crisp at 1 m.
- **Clean-up.** 22 OSM tracks, 1 road and 5 buildings were inpainted (0.32 km²). Footpaths into the chasm were deliberately kept, so the walls are never softened.
- **Flooded patera floors.** The hydro-flattened lakes are raised 5 m into crusted lava plains with a procedural 2.5 m marginal rim, a 2 m sag, and real Big Obsidian pressure-ridge relief.
- **Fissure B (design choice).** A 1 km en-echelon segment that continues the 1886 trend toward Rotomahana. Kit-bashed onto it:
  - the Great Rift spatter-cone row (3DEP 1 m), with 8 cone vents;
  - a 1.05 km² compound flow field: a procedural lava-spread model with 16 units, whose interior relief is real Etna 2004–05 channels and levees plus distal Big Obsidian pressure ridges;
  - procedural spatter ramparts and a 520 m hot channel with levees.
- **Collapse pit beside the hub.** The Plosky Tolbachik summit pit (ArcticDEM 2 m), scaled ×0.28 in all three axes so the wall angles stay real: about 500 m across and 139 m deep, with the rim relief capped at 5 m.
- **Active lava (the signature).**
  - Fissure B's lower 280 m is a chain of jagged en-echelon slot pieces with crust bridges and per-piece heat.
  - A **curtain of fire** runs along them: about 26k GPU clots, ballistic at g = 1.796 m/s², launched at about 11 m/s within ±4°. Clots cool from white-yellow to dull red as they fall onto the ramparts. A per-piece envelope gives uneven jets, and a dim incandescent veil sits at the base.
  - Also: glowing crack networks on the youngest flow unit near the vent, sparse hot breakouts, the hot channel (crusted-over stretches), crack-broken cone throats, and a short active slot deep in the real chasm crater with its own small curtain.
  - The rest of the fissure is dormant and steaming.
- **Sulfur, simulated offline (`deposits.json`).**
  - One mid-size Io-ballistic plume in the chasm floor (58 m/s, 3 M particles, 4 episodes including an old, faster SW-biased one). Its fallout lies across the dome plateau as Dallol cream, yellow and orange zones, with terrain shadowing and lee effects.
  - Terrain-derived fumarole bands on the real chasm rim lips and ledges, plus chasm-floor lows. These are continuous, with 60–120 m hot stretches and gaps.
  - A narrow crust band along fissure B (it survives on the flows), and a crust ring on the real pit rim lip.
  - SO₂ cold-trap frost from horizon-shadowed insolation (faint).
- **Look.** Map A's round-3 shading is ported:
  - mid-dark grey basalt, neutral ambient light, sun 5.2;
  - crusts height-blended into the Dallol micro-lows (dusting, then pale rim, then thick saturated crust), averaging beyond about 1 km;
  - natural wall bedding with lenses, scoria beds and cooling joints.
  - Also: triplanar kit textures with anti-tiling, a 1 m normal map, horizon AO, baked lava irradiance, CSM shadows, bloom, heat shimmer, Jupiter with Jupiter-shine fill, and a 24 km real-lidar apron.
- **Scatter.** 95k instances of the kit's scanned rocks: talus at wall feet, flow blocks, spatter bombs, sulfur blocks and a few Dallol mounds on flat fumarole cores.

## Bake pipeline (`[path removed]`, work data in `[path removed]`)
1. **One-offs.** `base_1m.tif` and `apron_16m.tif` come from the LINZ COGs via `[path removed]` (LERC needs rasterio); `[path removed]` comes from Overpass; textures are packed by `pack_textures.py`.
2. **`prep_base.py`.** Lake detection (exact flatness), despiking, and OSM inpainting with transplanted lidar roughness.
3. **`kitbash.py` + `kitbash.json` (+ `kit_lib.py`).** Patera floors, cones, flow field, active slots, ramparts, channel, pit, and the lava masks and `lava.json` (lights, gas, slot pieces, fountains).
4. **`horizon.py`.** 16-direction horizon angles: AO, insolation and cold traps.
5. **`deposits.py` + `deposits.json`.** Ballistic plume episodes, polyline fumaroles, terrain-derived rim and pit bands, and frost.
6. **`bake_rocks.py`, `bake_scatter.py`.** Kit LODs and instance placement.
7. **`bake_maps.py` + `scene_config.json`[path removed]`scene.json` with the cameras.
8. **`bake_mesh.py`.** Error-bounded quadtree (5 levels, leaf error 0.4 m, 4.14 M leaf faces, pymeshlab quadric collapse that keeps cliff edges as mesh edges).
9. **`bake_apron.py`, `bake_export.py`.**

A full re-bake takes about 40–60 min on the shared machine; most of that is waiting for `[path removed]`.

## Export for the Godot [server assignment removed]
| File | Contents |
| --- | --- |
| `height_1m.png` + `.json` | 16-bit, 7168², with frame, CRS, vertical range and world offset (y = elevation − 600) |
| `material_2m.png` | fresh flow, 'a'a, cliff, flow age |
| `lava_2m.png` | emission, patera mask |
| `[path removed]`, `[path removed]`, `[path removed]`, `[path removed]` | AO, deposits, hotness, frost, fumarole, irradiance and normals, all aligned |
| `features.json` | plume and simulation parameters, fumarole polylines and rim-band parameters, slot pieces with heat, fountains with launch speed and lip heights, fissure B, hub, pits, patera floors, lights, gas, cameras |
| `scatter.json` | 95k instances plus rock definitions |

## Captures (final set, 1672×941, RTX 4070 SUPER via ANGLE/Vulkan)
`[path removed]` (from `[path removed]`). The it01 baseline is `[path removed]`.

## Triangles and frame rate
| View | Total triangles in frustum | Terrain | Scatter instances | fps (rAF, vsync) | GPU ms at 1080p (`perf.mjs`) |
| --- | --- | --- | --- | --- | --- |
| close 350 m | 422k | 335k | 1.9k | 60 | 2.0 |
| gameplay 2350 m | 478k | 305k | 4.3k | 60 | 0.5 |
| overview | 28k | 28k | 0 | 60 | 0.4 |
| wall hero | 494k | 330k | 3.8k | 60 | 1.7 |
| vent / plume hero | 378k | 246k | 3.3k | 60 | 0.5 |
| lava night | 484k | 308k | 4.4k | 60 | 0.4 |
| curtain of fire (extra) | 614k | 374k | 5.5k | 60 | 0.4 |

The gameplay view meets the ~500k budget. The 1080p perf run measured 535k for gameplay (resolution-dependent LOD); the LOD slider trades this off. The GPU ms figures come from `gl.finish()` timing under ANGLE and are indicative only. Every view holds 60 fps.

Assets: `[path removed]` is 199 MB, of which the browser loads about 150 MB (mesh 67, maps 46, scatter 15, textures 12). The export adds 55 MB, mostly the 46 MB 16-bit height PNG. This is over the 150 MB guideline once the export is counted.

## What works
- The real Tarawera chasm reads as Io paterae walls: crisp lidar cliffs, natural grey bedding with rare scoria lenses, and talus.
- The gameplay frame holds the whole story: the pit beside the hub, the dark flow tongue, fissure B with its pale crust line, the curtain and hot channel, the chasm craters with rim crusts, and the yellow plateau fallout.
- The curtain of fire is low, narrow, and broken into en-echelon jets that cool as they fall. Most of the fissure is dormant.
- The deposit simulation gives believable Io colour on the plateau, with lee shadows and streaks following the real gullies. There is no leopard print and no blob noise.
- Flows are dark and matte, and glow only at throats and cracks.

## What does not (known problems)
- **Curtain broadside.** Each slot piece still reads somewhat as its own fountain clump, so the sheet has gaps at the crust bridges. That is by design, but stronger than at Tvashtar.
- **Plume.** The umbrella is sized to its deposit (R ≈ 1.6 km, H ≈ 0.9 km) and is now translucent, but it is still a smooth analytic shell plus grains, with no streamers. The live plume also has no colour variation by temperature.
- **Plateau crust.** It looks speckled up close in the vent hero (Dallol micro-relief thresholding), and backlit crust is close to clipping.
- **Wall tops.** Faceted "teeth" show where the decimated mesh meets the rounded lip (visible in the wall hero, left), and some vertical faces show texture stretch from the geometric-normal blend.
- **Pit rim ring.** The crust ring follows the real lip but is broken into arcs (the Tolbachik rim is rough). There are few talus blocks inside the pit.
- **Patera floors.** They read as flat dark plains. The pressure-ridge relief is subtle at gameplay range, and the patera rim is barely visible.
- **Night view.** It is very dark apart from the lava; Jupiter-shine is faint.
- **Bake time.** The full re-bake is slow on the shared lock, and only about 16 of the 20 iterations were used.
- **Assets.** The total including the export is over 150 MB.

## Next steps
1. Thicker crust contrast on the dome plateau at gameplay range (fallout coverage of 0.4–0.6 is still sparse in the SW).
2. Stream-like plume curtains (sector rays), plus temperature-coloured grains near the vent.
3. Fix the wall-top facets: a denser leaf for cliff lips, or blend the 1 m normal map over the geometric normal near lips.
4. Talus scatter inside the pit, and spatter bombs on the ramparts.
5. Brighter Jupiter-shine fill at night.
6. Reduce the export size (crop the height PNG to Float16 tiles, or drop the duplicate normal JPG).

## Route into Godot
- **Terrain.** Rebuild from `[path removed]` into the game's existing terrain path, with 1 m height plus the normal map. The baked `[path removed]` quadtree can serve as a reference LOD.
- **Shading.** Port the material layer stack as a Godot spatial shader. All masks are aligned 2 m rasters in the same frame, and the Dallol and basalt kit sets are shared with maps A and C.
- **Lava and particles.** Slot pieces, cone throats and fountains are analytic or GPU-particle data in `features.json`: GPUParticles3D with a custom process shader using the same ballistic formula.
- **Plume.** The volume becomes a FogVolume or shell mesh with the same parameters.
- **Scatter.** `scatter.json` maps one-to-one onto MultiMeshInstance3D per rock type.
