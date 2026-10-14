# Io scene C ("Krafla plume field" → `io.pele`): round 2

Page `[endpoint removed]` (server [address removed]). Details per step in `LOG.md` (Round 2 section); credits in `CREDITS.md`; game export `[path removed]` (`changes.round2`).

## Changes against the review
| Review point | Done |
| --- | --- |
| 1. Pit walls smooth/painted | Donor swapped to the **real Puʻu ʻŌʻō 2018 pit, 0.5 m lidar DTM at native scale** (1 m grid, no scaling, walls never feathered or smoothed; rim ~180 m radius, ~270 m deep); real talus aprons at the wall feet; Tolbachik removed. Full citation in CREDITS (no stated licence; USGS/OpenTopography doi:10.5069/G9M32SV1). |
| 2. Lake = regular Voronoi lines | New lake shader: mostly dark rafted plates 2–40 m (three nested scales, random splitting, rotated crust texture, slight tilt, slow drift), sparse torn/curved seams of varying width, broken incandescent margin against the wall, 4 small spatter fountains (ballistic GPU particles + glowing throats). |
| 3. Radial starburst | Removed from shader and simulation (`rays: 0`). |
| 4. Flat red / cookie-cut edges | Terrain-tied rust/orange/ochre mottling (roughness of the real buried lavas, rises vs lows, scan-set structure), stronger relief shading; fan and deposit buried gradually under the flows (no outlines), deposit thins onto flow tops. |
| 5. Camouflage on vent-hero ridges | Softer lee weighting in the sim plus a thin veneer from the 60 m fallout average on lee faces; crust thick in lows and vent-facing slopes. Improved, **not solved** (see below). |
| 6. Scatter on the plain | New groups: 3 900 sparse blocks on the deposit plain, 1 400 ballistic bombs around the pit, 211 Dallol mounds/pillars on the fumarole cores (38 k instances total). |
| 7. Blocky apron / square edge | Apron deposit is per-vertex (extrapolated in the bake, faded radially around the vent): no blocky corners and no rounded-square ring. The map edge is still faintly visible in the overview (brighter cream fringe inside the map vs the apron). |
| 8. Night orange lines | Gone (they came from the hard deposit rim at the flow mask edge). |

## Captures
`[path removed]` (= `[path removed]` and `046-r2-13-*`), `r1-vs-r2.jpg`.

## Triangles and frame time (RTX 4070 SUPER, ANGLE/Vulkan, headless; perf.mjs at 1920×1080)
| view | total | terrain | scatter (inst.) | ms/frame |
| --- | --- | --- | --- | --- |
| close | 174 k | 124 k | 50 k (819) | 0.53 |
| gameplay | 279 k | 104 k | 175 k (4 162) | 0.45 |
| overview | 19 k | 16 k | 3 k | 0.35 |
| wall | 227 k | 141 k | 86 k (1 934) | 1.9 |
| vent | 191 k | 114 k | 77 k (1 633) | 0.44 |
| night | 413 k | 157 k | 256 k (6 074) | 2.06 |
All under 500 k; 60 fps (vsync) in every capture. Assets 143 MB.

## Known problems
- **Vent hero:** lee faces of the southern ridges still read as dark patches with pale rims; softer than round 1 but still somewhat camouflage-like. Next: drive the crest/low rule from the broad 80 m position only on steep ground, and darken the pale thin-film rim.
- **Pit wall shading:** geometry is now real and crisp, but the wall texture is still the procedural bedding pattern (it reads stacked/striped at the wall hero camera); a few steep faces show vertical texture stretching from the 2 m masks. Next: kit cliff scans with triplanar detail, fumarole streaks.
- **Lake** reads well from above at 400 m but the plate seams are still too uniformly lit; fountains are small and hard to see at the close camera.
- Pyroclastic fan is large and very uniform black-brown at gameplay range; could use more internal tone variation (ash vs scoria).
- Overview: faint square map edge (map interior brighter than apron).
- The red/orange plain is flatter than the reference in colour at 2 km; more variation would need a coarser structure in the simulation itself.

## Export (for the game-port agent)
Same files and keys as round 1, nothing renamed. New: `apron_32m_dep.bin`, `features.json.lakeFountains`, `[path removed]` alpha = lava-lake mask, scatter groups `plain` and `pitbombs`. Height raster changed (new pit). See `[path removed]`.
