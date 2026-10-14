# Io scene A ("Kīlauea patera"): iteration log

Captures are in `[path removed]` (gitignored workbench folder); the best are copied to `[path removed]`.

## Data and pipeline setup (before it01)
- **Crop.** 7168 m square, EPSG:6635 x 258000–265168, y 2143600–2150768: the whole caldera, the 2018 down-dropped block and Halemaʻumaʻu, Keanakākoʻi, Kīlauea Iki (east edge) and the Kaʻū desert / SW rift flank in the south-west. 1 m world grid, origin at the map centre.
- **Elevation.** USGS 3DEP lidar point cloud HI_Volcano_B1_2019, read from the public EPT. First pass: EPT depth ≤ 9 over the whole crop gave only 42 % of 1 m cells with a ground point (30 M points; IDW-filled, effective detail ~1.5–2 m). Second pass: depth ≤ 10 over the central 6.1 × 5 km (caldera, pit, Kīlauea Iki), merged in with a 60 m feather (`merge_dem.py`). The hierarchy walk of the research script was sequential and latency-bound (~2 s per page); it now walks breadth-first in parallel.
- The USGS 3DEP 1 m DEM tiles of 2020 (HI_NOAAMauiOahu_2020_B20) were checked as an alternative: they barely cover the summit (29 % and 0.07 % valid in the two tiles), so they are not used.
- **Human artifacts.** OpenStreetMap (Overpass, ODbL) roads, buildings and parking areas in the crop were rasterised with class widths plus 8 m cut/fill shoulders (1.12 km² masked, 247 road ways, 1022 building/parking polygons), inpainted from the surroundings and given back natural roughness by transplanting high-pass lidar texture from an undisturbed offset, feathered over 6 m. Roads inside the 2018 collapse polygon were left alone (the broken Crater Rim Drive pieces are part of the real collapse). Despiking only touches cells that stand clear of all 8 neighbours by > 1.5 m (1120 cells), so wall edges are never smoothed.
- **Flow field.** A residual-thickness cellular automaton (4 m grid) spreads 22 flow units from two en-echelon fissure segments on the SW-rift flank, each over the topography left by the previous units. Critical thickness scales with 1/slope and a downslope bias turns units into tongues instead of pancakes. First attempts (single unit, no bias) gave one round pancake; the multi-unit + bias version gives lobes and fingers. Fronts are kept steep (3 m ramp); Etna 2004–05 channel/levee relief and Big Obsidian ridges are added inside with a 14 m feather. The CA originally ran over the whole grid and took 8 min; restricting each step to the active bounding box made it ~45 s.
- **Spatter cones.** A 1.1 km strip of the Great Rift DEM (Big Craters / Spatter Cones), detrended, rotated onto the upper fissure segment, relief × 1.5; crater bottoms become glowing throats.
- **Terrain mesh.** Quadtree of 341 nodes (7168 m root → 448 m leaves); each node is gridded at 449² samples and quadric-decimated (pymeshlab, planar quadrics, boundary preserved) to a measured 99.9th-percentile vertical error (leaf 0.4 m, doubling per level), with skirts. The first bake used a broken coarse-level sampler (box sums over the padded array) and produced 500 m errors; fixed with a uniform filter. Cliff edges survive as mesh edges, flats get large triangles.

## it01 (001–003)
First light. Terrain floated 1000 m too high (mesh heights were absolute, world y = elevation − 1000): fixed in the loader. `reversedDepthBuffer` broke the CSM shadows and was dropped. Fumarole puffs were placed at (x, y) instead of (x, z). Everything read as dark brown mud with no sulfur, the plume as a speck.

## it02 (004–006)
Full rebake on the merged depth-10 DEM. Darker basalt, a regional sulfur veneer, two-layer plume particles, lava point lights cut to 4 % (they burned out the ground). The real lidar forms (benches, the pit, ring faults) read immediately; colour was a uniform khaki wash.

## it03 (007)
New deposit colour model: a proximal-fallout component (slow, hot clasts → red/orange apron), umbrella ring in yellow, cold fringe pale, a few radial rays (as at Pele); older episodes revert toward yellow and thin out. ACES instead of AgX (AgX desaturated the sulfur badly).

## Debug (008–009)
Debug views showed the deposit/lava maps mirrored north–south against the terrain: three.js flips textures by default. `flipY = false` for all baked maps. Every earlier capture had misplaced deposits and lava.

## it04 (010)
Maps aligned. Crack emission now filtered by screen footprint (no more sparkle at distance). Overall still khaki, deposits soft discs, walls pale; night flow an orange blob with square sprites. (This set went to the coordinator mid-round; their notes drove it06–it12.)

## it05 (011)
Continuous incandescent fissure slots; kit textures (Dallol sets, basalt sets) packed into texture arrays with anti-tiling (two rotated/offset lookups blended over a low-frequency index field).

## it06 (012) — look rewrite after review
Dark basalt base (two scan textures at macro scale), walls in kit `basalt-cliff` darkened with warped horizontal lava-layer bands; sulfur only on ledges and some bands. Deposits are no longer alpha-blended tints: the simulated amount is thresholded against the Dallol scan's own height maps, so crust edges are sharp; concentric colour zones with crisp boundaries (cream → yellow → orange → red). Deposits are now terrain-controlled in the bake: thicker in lows, thinner on crests and steep faces, condensed into cracks, with a bright rim around each plume vent. Fissure slots and cone throats are drawn analytically in the shader (line/circle distance), which removed the square glow sprites. Result: strong contrast, but crust patches read as cow-hide blotches.

## it07 (013)
Kit scatter: 13 scanned meshes (basalt blocks, a'a, pahoehoe slabs and ropy lobes, scoria bombs, a native-sulfur block, three Dallol mound/pillar pieces), LOD0 = kit GLB with its own albedo/normal, LOD1 decimated, sulfur/frost coat on upward faces from the deposit map. ~38 k instances, size-sorted, culled by projected size.

## it08 (014)
Crust placement driven by the real lidar micro-relief: a 14 m topographic-position map is baked and the crust fills lows first, so deposit patterns follow the actual Kīlauea ground (crack lines, flow-lobe margins, fault scarps). This was the biggest single improvement in deposit realism.

## it09 (015)
Desiccation-style polygon cracks in thick crust; 28 km context apron (same lidar, coarse) so the overview no longer floats in black.

## it10 (016–017)
Raymarched plume volume (canopy shell under the analytic Io-ballistic envelope, falling curtain at the deposit ring, thin column, drifting 3D noise, radial rays), same speed/angle as the deposit sim. First version was invisible: the sprite shaders output premultiplied colour but the materials were not marked so; fixed.

## it11 (018)
Thresholds filtered by their own screen derivatives (no speckle at gameplay range); plume toned down to faint; apron patches removed (they read as camouflage).

## it12 (019)
Bigger talus (to 11 m) and flow blocks; close camera steeper.

## it13 (020)
Rock LOD2 (~40 tris); lava-lake glimpse is now a crusted surface with a hot margin; terrain leaf error 0.4 m and node cap 60 k faces (gameplay terrain ≈ 245–300 k tris); variety (orange/yellow patches) inside the red apron.

## it14 (021)
Frost restricted to flat cold traps (it was icing slopes).

## it15 (022)
Deposit coverage scaled to 0.8 and thin crust brightened (gameplay floor was still too uniformly yellow); LOD error threshold 1.7 px.

## it16 (023)
Uncapped GPU timing (`[path removed]`) and the game-port export (`[path removed]`). Plume volume fades behind terrain instead of being cut; puffs and ground dust fade out beyond ~1 km (they read as rows of dots from the gameplay camera).

## it17 (024)
On slopes the crust runs in downslope streaks (gullies) instead of round blotches. Close camera moved to the fissure and spatter cones (more informative than the pit floor).

## it18 (025) — final
Fresh pahoehoe was a near-mirror (roughness ~0.1) and threw a blown-out sun glint in the close view; now 0.38–0.7, glassy but not mirror-like.

# Round 2 (coordinator review of it18)

Captures `[path removed]` … `039-r2-11-*`. Terrain forms untouched except the new caldera-floor flow and the re-cut fissure slots.

## Bake changes (before r2-01)
- `kitbash.py` now takes a list of flow fields (`flows` in `kitbash.json`). New **caldera-floor flow**: a 250 m ring-fault fissure at the north-east foot of the 2018 block (x −330…−80, z −1110…−990), 7 units, 1.4 M m³, spreading west across the block floor (0.27 km², up to 13 m thick at the fronts, mean 4.5 m) — inside the gameplay frame.
- Fissures are now generated **en-echelon**: 22–60 m slots, alternately offset 2–6 m and rotated 4–12°, 30–50 % of them dark (crusted), each lit one with its own intensity and width; slots are cut 1.5–3 m deep along a jagged centreline. `lava.json` lists the lit segments; the shader draws them analytically with a wobbling centreline, width variation, crust bridges, intensity varying along the slot and glowing / dark spatter clots on the lips. The baked straight halo was removed (it read as a neon tube); fissure light now only feeds the irradiance map, weakly.
- A spatter-cone mask (`masks_c.g`) so cone flanks get scoria/spatter instead of crust glow.
- `deposits.py`: the 18–80 m topographic modulation (the source of the blob pattern) is gone; deposits are thinned only on steep slopes and condensed into metre-scale cracks. Fumaroles are now continuous **fault bands** (core ~5 m, halo ~17 m, fringe ~35 m) with strength varying along the fault. Frost × 0.55. The Halemaʻumaʻu ring fumarole (a polygon) was dropped. Proximal hot clasts leave in 5–9 jets, so the red apron is lobed, not a disc. Radial rays down to 6 % of the particles.
- `bake_maps.py`: new `[path removed]` (talus apron, cone, fissure light).

## r2-01
Shader rewrite for the review: sulfur coverage = smooth simulated amount, crisp edges only from the Dallol scans' metre-scale height (the crust fills micro-lows first; a 40 % cell shows 40 % of its micro-relief crusted). Walls carry deposits only on ledges (1 m normal map) plus a few fumarole streaks. Fresh lava rough (0.82–0.95), glass only in rare small patches. Crust cracks glow only on a sparse subset of plates, never on cone slopes or steep ground. Talus aprons tinted from the coarse rubble textures. Plume: no column, fainter shell, lit mainly in forward scattering and against Jupiter. Apron resampled onto a grid aligned with the map edge, border vertices take the map's height. Result: dark basalt base, deposits finally sparse. Problems: square glow sprites at the cone vents, sparkling glass on the SW flow, rays read as straight stripes, apron seam.

## r2-02
Squares traced to extreme HDR values: the bloom kernel is truncated, so a pixel at ~40 turns into a square. Emission capped, vent cores and slots dimmer. Glass rarer. Hot apron lobed by jets.

## r2-03
Map normals blurred over the outer 450 m toward the apron (mip bias), procedural bump on the apron, hot apron mottled. Plume fainter.

## r2-04
More 'a'a on the SW flow; narrower jets; night camera at 750 m so the en-echelon slots read.

## r2-05
Pit-wall fumarole ring removed (an artificial octagon). Scatter check with/without: invisible at the gameplay camera.

## r2-06
Fissure light in the irradiance map down to 12 % (it lit deposits into a white band in daylight). Talus aprons widened to 55 m below walls; talus blocks 2–8 m, denser, 45 % lighter.

## r2-07
Walls: explicit stacked beds 2–8 m thick (elevation index with a slow warp), each dark grey basalt or reddish-brown scoria, thin dark contacts. Crust relief sampled at 2.6× (metre scale) so the close view has no 10 m blotches. Softer apron bump.

## r2-08
Sulfur scatter blocks restricted to hot deposits (they read as yellow-green speckle everywhere). Terrain specular × 0.45 (dusty basalt; removed the forward sheen at grazing sun). Gameplay scatter went to 369 k triangles (613 k total): over budget.

## r2-09
Scatter LOD tightened (LOD0 > 90 px, LOD1 > 18 px, cull < 1.8 px), talus density back down: gameplay 370 k total. Rift-plume volume gain 0.2 (the close camera sits inside it and the haze washed the view).

## r2-10
Apron specular × 0.3 (the bright far plain in the close view was apron sheen toward the sun). Exposure 1.4.

## r2-11 — final
Lower contrast of the macro basalt mix (it read as camouflage in the overview).

# Round 3 (review: "dull and muddy")

Captures `[path removed]` … `046-r3-07-*`. Composition (zones, bands, fissures, floor flow) unchanged.

## r3-01
Base basalt from texture luminance only (no brown cast), mid-dark grey; sun 3.2 → 5.2, neutral grey sky ambient instead of brown, Jupiter fill less orange. Walls: bedding keyed to absolute elevation with a slight dip (continuous across benches), non-uniform bed thickness from a warped index (0.5–12 m), lateral lenses, mostly grey-on-grey tone steps, scoria only in ~15 % of beds and only where a lens is present, vertical joints in massive beds. Sulfur: dusting halo around crusts, thickness gradation (thin translucent rim → thick crust), crust normal smoother than rock and AO lifted where thick; beyond ~1 km coverage blends to its average (grain). Plume grains 0.9 m, fade below 1 px and within 120–700 m of the camera; fumarole puffs larger but 2× fainter with streaky noise. Main plume: more and faster proximal clasts in 11 jets → larger hot apron. Result: lit/shadow separation good, but too dim and wall scoria beds read as straight red stripes.

## r3-02
Exposure 1.4, basalt × 1.17, scoria beds rarer and desaturated, contacts on half the beds and fainter, sulfur saturation × 1.4.

## r3-03
Apron uses the same grey basalt as the map.

## r3-04
Macro basalt mix contrast lowered (camouflage in the overview); larger red apron (proximal speed up to 0.6 V, hotRadius 0.5); outgassing sprites halved.

## r3-05
Yellow warmer (less lime), apron albedo darker to match the map; plume grains only beyond 300 m; ground dust larger, fainter, wispy.

## r3-06
Thin crust made pale instead of grey-yellow (which read olive). Overshot: washed-out cream.

## r3-07 — final
Thin crust 78 % saturated, crust reaches "thick" sooner, far field uses the thick colour.
