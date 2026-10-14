# mm-cerberus, round 5

**Closed after eight iterations: 62% quality (previously 66%).** The cap is crisper and side-tile repetition is reduced, but the authored stack still looks too regular. This does not meet the desired finished-wall appearance. The owner authorized one additional focused round, with at most eight iterations, restricted to fissure faces. Round 4's estimate was 66%. This document supersedes the older stopping instructions only for this newly authorized round.

Review page: [endpoint removed] The existing server stays on [address removed]. All six camera targets, distances, angles and lighting settings are pinned to the round-4 scene. The gameplay triangle cap is checked at 1920×1080.

## Diagnosis

Fixed-camera wall probes compared normal detail off, shadows off, geometric facet normals, neutral albedo and native faces hidden. The regular grid persisted with detail normals and shadows disabled; neutral albedo removed it. The repeating side-projected basalt tile was the principal texture source. Texture arrays already had generated mipmaps, trilinear filtering and anisotropy; mipmaps alone did not remove partially resolved repetition.

Separate geometry problems were identified: neighbouring fractional-height rows connected different physical depths; lateral Snake/Malad source switching bridged unrelated ledges; per-column exposed cuts left long continuation skirts; folded flow offsets were passed to a monotone backing inverse; unused lower flows excavated under short bands. Repeating native plateau aprons beneath every flow and translating with global source medians produced broad artificial terraces.

Cropping below the plateau alone still included broad native benches. In the Snake source, a 24 m interval beginning 4 m below the plateau had median horizontal width 14.69 m; the steepest native intervals had median width 3.08 m. Selecting a different physical source interval is distinct from compressing the bench or amplifying relief.

## Iterations

| Iteration | Evidence | Decision |
|---|---|---|
| 1 | 058-r5-i1: wall, close, fissure, gameplay | Offset side projection, footprint normal fade and geometric facet normals improved the pattern/cap, but curtains remained. |
| 2 | 059-r5-i2-preview: wall, close, fissure | Shared physical rows, continuous source runs and buried continuation. Face-only preview against old backing; not a complete-scene quality grade. |
| 3 | Regression and own bake log; no final capture | Tall authored stack exposed invalid folded backing inversion. Stopped only this run's verified process tree before accepting its mesh. |
| 4 | 060-r5-i4: all six cameras; 462,681 gameplay triangles, 130.63 MB | Sorted/cropped backing envelope, plateau guard and retained flow-top LOD rows. Rejected broad artificial staircase faces. |
| 5 | 062-r5-i5: all six cameras; 470,172 gameplay triangles, 129.91 MB | Local rigid panel datums and source crop start at 4 m. Broad native benches and smooth curtains still remained. The 061 wall image was an earlier preview against old backing. |
| 6 | 063-r5-i6: all six cameras; 638,956 gameplay triangles, 132.35 MB | Steep native windows and terminal-mip fade. Rejected blocky staircases and failed gameplay budget; joins still bridged unrelated along-wall relief. |
| 7 | 064-r5-i7: all six cameras; 565,503 gameplay triangles, 132.17 MB | Coherent source locations remove unrelated-buttress connectors; retained source placement, rejected gameplay budget. |
| 8 | 065-r5-i8: all six cameras; 497,303 gameplay triangles, 132.17 MB | Final [path removed] LOD and buried continuation culling pass budget; visual limits remain. |

The 1080p mip probes used one browser, the same camera and identical submitted geometry in each pair. They are diagnostics, not additional geometry iterations. Preview and aborted candidates are counted above; no unfinished candidate is presented as validated.

## Final implementation and source limits

Native Snake/Malad source crops retain their metre axes and relief within rigid 80 m interiors. Source windows span 16–24 m (Snake) or 12–18 m (Malad), starting at least 4 m below the source plateau. Selection minimises median native horizontal width within a panel; it does not smooth or compress samples. Source depths, crop heights and widths are recorded in `sourceFlowCrops`. The cached selection windows have median panel slope 80.81° (P10/P90 67.39°/84.61°); this includes unused portions of complete generated profiles and is not a measurement of every visible Mars triangle.

Flow stacking, source selection/reflection, relative translation, the 1.5 m flow-top connectors, 0.8–2.2 m lateral offsets, cap connector, alcove placement, band-height variation and talus cuts are authored. Final stacks keep one source and coherent along-source locations per contour, reusing physical crop interiors; these are not independently measured flows. The existing 8 m pose joins interpolate placement; native interiors remain rigid. Earth source data is a top-down 1 m lidar DTM, not a wall point cloud. It cannot recover true sub-metre column fractures or measured overhangs. Malad Gorge/HiRISE photographs remain visual references and are not textures; CREDITS.md records the distinction.

The ribbon binary remains version 2: shared segment extent decodes the same physical depth across neighbouring columns, while `exposedHeightsM` records actual visible cuts. Continuation rows lie inside the apron; only wholly buried continuation triangles are omitted. Distant LODs retain flow-top corner rows. Folded hidden backing uses a deepest sorted envelope, cropped at the exposed cut, with the plateau retained behind the cap. No new native-face spatial blur or relief gain was added.

Selected-triangle facet normals preserve the cap and physical slope breaks. Side PBR projection uses translated source lookups with explicit gradients. Partially resolved side detail fades to the existing source's terminal mip; unresolved detail normals also fade by footprint. Gentle terrain sampling and active texture image pixels remain unchanged. Final native LOD column spacing is 1/4/24/48 m at the unchanged 450/1300/3200 m thresholds. Flow corner rows remain. Wholly buried continuation quads below the maximum original cut within each interval plus a 1 m guard are omitted; crossing quads remain. Distant proxy nodes at level 3 or finer intersecting native-band XY spheres plus 100 m use 8 px error at bounding-box distances at least 900 m. Other terrain stays at 5.2 px. This also reduces adjacent proxy ground detail within those nodes; it is not source-face smoothing. Rock detail thresholds stay unchanged. Within iteration 8, separate native-only and backing-only fixed-camera comparisons measured the tradeoff before the combined final configuration.

## Validation and export

Thirty-one focused geometry, rotation, codec and normal checks pass, including physical row correspondence, native interval preservation, bench exclusion, coherent flow joins, buried foot, folded backing, plateau guard and terminal cut coverage. Production build passes. All six final browser captures have no errors or warnings. Exact packed mesh/auxiliary hashes, index bounds, active texture pixels, world-normal pixels, PNG/WebP masks and export height checks pass. The final contract confirms all six camera settings equal round 4, all 18 prior export files remain, all 327 segments use shared physical rows, cliff_faces.json equals ribbon metadata, gameplay stays below 500k and assets below 150 MB.

The height raster retains 3 cm encoding and the established frame. Material/gameplay masks, scatter, features and cliff metadata are rebaked to align with the faces. Ribbon version 2, MMD3 mesh packing and MFB4 auxiliary packing keep their existing filenames and decoding formats. All previous export filenames, including older review evidence, are retained. Added export/review_round5.json and export/review_round5/{view}.jpg after inspecting all six. Diagnostic iteration-5 mip pairs and a rejected iteration-6 wall image are explicitly labelled. The exported source samples and packed meshes remain complete; runtime LOD does not reduce export resolution.

Each heavy step holds [path removed] separately, including baking, meshing, packing, builds and browser runs. One Playwright browser runs at a time and closes in finally. No other session's process was killed. The final scene commit will be recorded in STATUS-R5.txt after committing, as requested.

## Final measurements and remaining issues

| Camera at 1920×1080 | Submitted triangles | Composer ms/frame | Uncapped application fps |
|---|---:|---:|---:|
| close | 1,113,138 | 4.25 | 130.1 |
| gameplay | 497,303 | 3.70 | 205.6 |
| overview | 504,129 | 2.19 | 434.0 |
| wall | 1,131,528 | 3.82 | 153.8 |
| fissure | 1,314,372 | 3.78 | 139.6 |
| deposit | 987,560 | 5.55 | 144.1 |

Measured on RTX 4070 SUPER through ANGLE/Vulkan. Composer timing includes gl.finish; application rate includes the animation loop. The stale stats.fps field is not used. The 500k cap applies to the fixed gameplay view; diagnostic close, wall, fissure and deposit views exceed it. Gameplay has only 2,697 triangles of headroom at this frame, so this is not a guarantee for arbitrary camera movement or larger viewports.

Processed assets: 132.17 MB; default browser assets: 132.16 MB (decimal). Gameplay submits 250,128 terrain + 194,121 rocks + 52,966 native faces/pillars + 88 trails, with 6,479 visible rock instances. Mesh stores 5,984,312 triangles across all stored nodes/LODs. Actual exposed band P10/P50/P90: 21.29/64.55/130.43 m, with 28,346 columns, 6,997 collapsed columns and 99 authored pillars. Maximum height-PNG error is 0.01504 m.

All six final 065 views were compared with round-4 wall evidence, the Malad Gorge photograph and HiRISE PSP_007131_1905_RED. Boulders remain visible, cap facets are sharper and the tall band varies with alcoves and talus cuts. The grade is **62%**, below the earlier 66%: artificial stack ledges and repeated vertical source relief now compete with the improved cap. The photographs show irregular fractured walls that this top-down DTM transplant does not reproduce.

- Long smooth/draped lower walls and upper talus curtains remain visible.
- Authored flow ledges are too regular; repeated vertical relief and horizontal bands form a conspicuous geometric grid, especially in wall and deposit views.
- Some shelf-like, serrated and triangular pose/cap joins remain; metre-scale DTM relief does not provide convincing basalt column fractures.
- Side texture repetition is reduced, not proven absent at every distance or movement; distant 24/48 m native LOD reduces buttress detail and can expose coarse facets.
- CTX margins stay softer than the stereo interior; subtle deposit readability remains an inherited limitation.

Final views: [wall](shots/r5-wall.jpg), [close](shots/r5-close.jpg), [gameplay](shots/r5-gameplay.jpg), [fissure](shots/r5-fissure.jpg), [overview](shots/r5-overview.jpg), [deposit](shots/r5-deposit.jpg). Controlled iteration-5 shading pair: [before terminal-mip fade](shots/r5-mips-wall-control.jpg), [after fade](shots/r5-mips-wall-terminal-mip.jpg). These pairs are not final geometry.

The additional authorized round is complete. No ninth iteration and no game integration. The existing dev server remains on [address removed]. STATUS-R5.txt records the actual scene commit after committing; older status and handoff files remain historical.
