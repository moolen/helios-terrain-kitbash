# Io scene B ("Tarawera fissure" → `io.tvashtar`): iteration log

Captures are in `[path removed]`, a gitignored workbench folder. The best ones are copied to `[path removed]`.

## Data and pipeline setup (before it01)
- **Pipeline.** Copied from map A (`[path removed]`, `[path removed]`, `io-a.html` as of 2026-10-12 22:30), then adapted: `common.py` (NZTM frame, H0 = 600 m), `prep_base.py` (lake detection), `kitbash.py` (rewritten for B; helpers moved to `kit_lib.py`), `bake_apron.py` (NZTM), `bake_export.py`, `deposits.json`, `scene_config.json`, `run_all.sh`.
- **Crop.** A square 7168 m on a side, EPSG:2193, E 1902200–1909368, N 5758732–5765900, chosen from a 4 m overview of the whole massif (`wide_4m.tif`). The joined 1886 crater chain runs corner to corner, from Wahanga in the NE through Ruawahia and the Tarawera dome plateau to the SW chasm end. The east arm of Lake Rotomahana fills the SW corner, and slivers of Lake Tarawera sit on the W and NW edges. The base is native 1 m LINZ lidar (tiles BF38_0101/0102/0201/0202), read through rasterio because of the LERC compression; it has no holes. Relief runs from 296.5 m (Lake Tarawera) to 1109.6 m.
- **Human artifacts.** OSM is sparse here: 22 tracks, 1 road and 5 buildings were inpainted (0.32 km²), mostly farm and forestry tracks on the south plain and the 4WD track to the summit. Footpaths were not inpainted, because they run into the chasm and inpainting them would soften the crater walls. Despiking touched only one cell.
- **Lakes.** The DEM is hydro-flattened, so the lakes were detected as exactly flat regions of more than 4 ha: Rotomahana at 336.69 m (2.32 km² in the crop) and Lake Tarawera at 296.5 m (two pieces, 0.75 km²).
- **Layout.** These are design choices on the real map.
  - **Fissure B.** It runs from (−1300, −60) to (−2150, 470) in world metres: an en-echelon step NW of the chasm's SW end, on the 1886 trend toward Rotomahana, with Great Rift cones along it. Its lower 280 m is active; the rest is dormant and steaming.
  - **Pit and hub.** The Tolbachik collapse pit is at (−2050, −520). The suggested hub is at (−1700, −300), on the terrace between the pit and fissure B.
  - **Chasm.** One mid-size plume vent sits in the real chasm floor at (2042, −1452), so its fallout lands on the Ruawahia/Wahanga dome plateau. A short active slot sits deep in the chasm crater at (610, −418)–(420, −360).
  - **Patera floors.** The lakes are flooded 5 m higher as crusted lava plains.

## it01: first full bake
- **Bake.** Kitbash took 8 min: 1.05 km² of fresh flows, 8 cone vents, a 504 m pit 139 m deep, and a 260-cell hot channel. The mesh has 4.14 M leaf faces (level 4, leaf-err 0.4 m); public assets total 142 MB.
- **Looks:** everything reads as a uniform brown; pale salmon streaks cover every gully; the chasm sulfur is leopard-print blotches (fumarole ellipses with noise); the slots are straight neon capsules; there are square glows; the curtain of fire is invisible; and the wall camera sits inside a slope.
- **Numbers.** Triangles per view: close 470k, gameplay 392k, overview 37k, wall 524k, vent 391k, night 701k (night is a close camera at 1.1 km). All views ran at 60 fps (RTX 4070 SUPER, ANGLE/Vulkan).

## it02–it03: deposits and shader cleanup (coordinator review notes on map A applied)
- **Fumaroles.** Spots are now narrow bands (length 6–11× width), without lobes or halo noise. Plume fallout is thinner (thickness 2.2), so it fades with distance instead of washing the plateau.
- **Shader.** All mid-frequency blotch noise is gone from the sulfur. The crust threshold uses only the real 1 m topographic position plus Dallol micro-relief. Sulfur is masked off fresh flows. The ground is desaturated toward neutral dark basalt.
- **Walls.** Walls are horizontal beds of 2–10 m, dark grey, reddish-brown scoria and near-black, with crisp boundaries and a few pale altered beds. Sulfur sits only on ledges, altered beds and fumarole streaks.
- **Slots.** Jagged pieces with a noise-displaced centreline, crusted-over stretches, per-piece heat and much lower intensity (blackbody ×6 instead of ×16).
- **Diagnosis.** A deposit debug view showed the salmon streaks were cold-trap frost in every gully (the topographic-position term pushed it over threshold). Frost is now weaker in the sim and needs a higher threshold.
- **Squares.** They are bloom-kernel truncation around extremely bright HDR pixels; all emission was dimmed.

## it04–it05: fountains
- **Fountains never rendered.** The cause was `AdditiveBlending` with `premultipliedAlpha: false`: three.js then blends with SRC_ALPHA, and the shader writes alpha 0. Fixed.
- **Shape.** Clots streak vertically (motion-blur sprites), launch speed is re-rolled per cycle with a travelling pulse along the fissure, and a fountain camera was added.
- **More bloom squares** at the cone throats, isolated by toggling layers: point lights 4 m above narrow cone craters. They were raised to +14 m and dimmed.
- **Composition.** An older, faster plume episode (×1.5 speed, biased SW, faded) adds pale fallout across the basin.

## it06: terrain-derived rim fumaroles and cameras
- **Rim fumaroles.** They now come from the real terrain: lips and ledges (lip slope < 28°, a > 40° face within 5 m, TPI > 2 m) in a 260 m corridor around the chasm axis, plus chasm-floor lows. This replaced polylines offset ±85 m from the axis, which painted three parallel "rails".
- **Cameras.** The fountain camera views the curtain broadside (yaw 32°). The gameplay camera now looks east (yaw 270°) so that fissure B, the pit, the chasm and the plateau are all in frame.
- **Looks:** the broadside curtain reads as a row of discrete fountains, but the rim spots look like orange "feathers"; the walls and rims are too orange; and thin black spires appear behind the fissure. The spires are the Tolbachik donor's summit ridges, which become needles at 0.28 scale.

## it07: rim bands, pit rim cap, cleaner walls
- **Rim fumaroles.** They are now continuous bands, not spots. The terrain rim mask is blurred 1 cell and modulated along the rim by 60–120 m hot stretches and quiet gaps. Hot red/orange cores appear only at sparse hotspots; elsewhere the bands are cream/pale yellow (Dallol index 0.3). Chasm-floor lows get a weaker band.
- **Pit rim.** The positive relief of the Tolbachik pit is capped at 5 m and smoothed. The pit wall stays crisp.
- **Walls.** Bed colours are darker and less saturated, bed thickness varies laterally, and the cliff mask only starts above ~45° (the rounded rim tops are no longer striped).
- **Particles.** The fountain gets a dim incandescent "veil" (16 % large, slow, low clots). Plume volume gain is ×3, with fewer, softer canopy grains.
- **Lighting.** The sun is near-white (`#fffaf2`), exposure 1.4, and the Jupiter-shine fill was raised.
- **Looks:** the gameplay frame now holds the pit, the active curtain, the hot channel, the chasm craters and the plateau fallout. The wall hero shows crisp dark layered basalt. Thin dark spires remained.

## it08: tracking the spires
- **Spires.** They vanished with the apron hidden, but a raycast from their pixels put them in the map terrain at x ≈ −3300, up to +200 m above the Lake Tarawera shore. The cause was the lava model's 3.2 km window: lava that reached the window edge could not leave and piled into a wall. The grid edge is now open (edge cells are sinks), and flow thickness is capped at 18 m.
- **Apron.** Vertices just outside the map are clamped below the map's edge height, a separate safety fix.
- **Pit rim.** The pit-rim fumaroles also come from the terrain now (rim lips in a corridor around the pit), replacing the neon ring from the circle polyline.

## it09: map A round-3 shading [server assignment removed] and the spire fix
- **Lighting.** Ported from io/a b6b7d8f: sun 3.2 → 5.2, neutral grey hemisphere ambient (`#8a8c94` / `#3a3634`), paler Jupiter-shine. Sunlit basalt is now luminance-only mid-dark grey with a faint warm cast and broad, slightly redder weathered-scoria patches. The apron uses the same grey.
- **Crust gradation.** Also ported from map A: crusts are height-blended into the Dallol micro-lows (plus the real 1 m lows), going from thin dusting to a pale rim to thick saturated crust. Coverage blends to its mean colour beyond about 1 km, so there is no grain at range. Sulfur stays off the dark fresh flows.
- **More sulfur.** Plume fallout is denser (thickness 2.2 → 1.0, so more of the plateau crosses the threshold). Rim bands are continuous: the along-rim gaps were reduced and the rate went to 1.0. Fissure-B fumaroles are denser (12 m spacing, 95 %).
- **Pit rim.** Dallol mounds and pillars are now placed only on strong, flat (< 12°), wall-free fumarole cores, so the white/orange "decals" on the pit rim are gone.
- **Curtain of fire.** It is now a narrow sheet: launch speed 11 m/s (7 m/s in the chasm), spread 4°, 120 clots per metre of slot, faster cooling (dull red by the time clots land on the ramparts), and a dim incandescent veil at the base.
- **Results.** The spires are gone (the open-edge lava model). The scene is no longer murky. The plateau fallout is clearly Io yellow and cream. The curtain is low and narrow but reads as rectangular spark "boxes".

## it10: wall bedding, curtain envelope
- **Wall bedding.** Ported map A's natural bedding: elevation-keyed beds with a regional dip, non-uniform 0.5–12 m thicknesses, lenses, rare scoria beds and vertical cooling joints. This replaced the regular pink and grey stripes.
- **Curtain envelope.** Each slot piece gets an envelope that tapers at its ends and has an uneven crest (jets every ~3.5 m), which breaks the box silhouette.
- **Crust.** The crust is dimmer and rougher (albedo ×0.95, roughness 0.95), so the backlit plateau no longer blows out.
- **Steam.** Fissure-B steam puffs are spaced 130 m apart, so they no longer form a pearl-string.
- **Look (it10).** The curtain now reads as a low, flickering sheet of fire with uneven jets along the slot pieces, darkening as it falls. Walls are natural grey bedding with a few scoria lenses.

## it11: fissure-B crust
- **Diagnosis.** A bright cream "capsule" at fissure B's NE end, found with layer toggles plus a raycast, was the only fissure-B fumarole crust that survived. The others were wiped by the fresh-flow mask.
- **Fix.** Fumarole crust now survives on fresh flows, in both the simulation and the shader. Plume fallout is still erased there. Fissure-B bands are narrower (width 9–12).
- **Look.** Fissure B now reads at 2.3 km as a continuous pale crust line along the dormant segment, ending in the incandescent active stretch.

## it12–it13: pit rim, apron, bloom
- **Pit rim.** The terrain-lip mask produced scattered blotches on the rough Tolbachik rim, then a too-broad cream ring. The rim crust is now a narrow ring on the real rim lip (annulus 225–275 m from the pit centre × relaxed lip test), modulated along the rim.
- **Apron.** It is a single luminance (no macro patches), which removes the "camouflage" pattern in the overview.
- **Cone point lights.** Removed; the lava light around the cones is baked.
- **Emission.** The HDR peak is clamped to (3.2, 2.4, 1.6), because tiny super-bright vent cores turned into square bloom kernels.

## it14–it16: vent throats, plume, final cleanup
- **Night bloom square.** Isolated by turning the analytic vent glows off: the cone-throat glow was a flat disc of very bright emission. Throats are now crusted and broken by glowing Voronoi cracks, at about 1/3 of the intensity, with a faint halo. Baked lava irradiance was raised ×1.8, so the curtain lights the ramparts at night.
- **Plume.** The canopy shell is softer and thicker (no hard dome edge), and the volume gain is 2.0. It reads as a translucent, particulate umbrella over the fallout zone.
- **Wall sulfur streaks.** Only below strong fumarole cores, at half strength. The hatch-like yellow streaks on the chasm walls are gone.
- **Export.** It was re-run with the final deposits and now includes the rim-fumarole parameters.
- **Final set.** `[path removed]`, copied to `[path removed]`.

# Round 2 (coordinator review of r1)

## r2-it01–02: palette, fissure slots, walls (shader only)
- **Base.** Darker basalt with colour variety: luminance × a broad, terrain-biased mix of dark grey basalt, reddish-brown scoria (more on the dome plateau above about 750 m) and black scoria.
- **Fresh flows.** Glassy black (albedo × 0.16–0.2) and matte (roughness 0.78–0.93).
- **Fissure slots.** Replaced with map A's round-2 fissure loop: jagged centreline, width per piece (new `widthM` in `lava.json` and `features.json`), crust bridges, intensity varying along the slot, and dark spatter clots on the lips.
- **Fountains.** Clots are smaller and rounder. Clots seen from steeply above fade out, because the narrow sheet collapses onto the slot and additive blending piles the clots into "lozenges".
- **Walls.**
  - The steep-face normal is the interpolated vertex normal (30 % flat normal), which removes the sliver-triangle streaks and "teeth".
  - The planar AO is softened on walls.
  - Scoria beds are rarer and greyer, and the cooling joints fade before they alias.

## r2-it03–06: sulfur (bake)
- **Mantle.** A new old-surface mantle in `deposits.py`. Everything that is not a young flow (`oldness = (1 − fresh·(1 − age))²`) gets an aged pale-yellow/ochre veneer: stronger in the real 1 m and 18 m lows and on gentle slopes, absent on crests and walls, and reduced 85 % on the patera floors. It has only km-scale variation (closer to the plume = thicker) and ochre patches in iron-stained lows.
  - The first try used 80 m random patches and read as leopard print. Removed.
- **Plume.** Speed 58 → 68 m/s and thickness 0.8, so fallout reaches across the plateau.
- **Frost.** Stronger cold-trap frost in lows.
- **Fumarole bands.** Wider (σ 1.6 cells) and continuous along the chasm rims.
- **Pit rim.** The crest is traced per azimuth (720 rays, highest point 170–320 m from the centre, median-smoothed). The crust is a continuous band on the crest (σ 9 m) that thins over about 28 m on both sides.
- **Pit talus.** A new `pittalus` scatter group (1,440 blocks on the pit floor and lower walls).
- **Patera floors (kitbash).** Big Obsidian ridge relief ×0.4 (was ×0.12) and a 6 m marginal rim 34 m inside the shore. In the shader: polygonal crust plates with dark seams, frost/sulfur in the ridge troughs, and an older scoria-brown rim zone.
- **Gameplay coverage** (meter `[path removed]`: share of pixels with a yellow hue and luminance > 105): r1 2 %, it04 48 %, it05 45 %, it06 31 % bright / 40 % any yellow. Map A r3 measures 25 % / 35 % on the same meter.

## r2-it05–10: close-range look, budgets
- **Veneer.** Up close the crust threshold produced white "flakes" on grey rock. Added a continuous, matte, fine-grained ochre/sulfur veneer (strongest in the real 1 m lows) under the crusts. The thin-crust colour is now saturated, not grey. The dust term takes the veneer colour.
- **Patera floors.** The deposit layer is suppressed on them (−75 %).
- **Fountain camera.** Turned to look across the dark flow field and ramparts toward the curtain and the mantled slope (yaw 32° → 212°).
- **Wall detail.** The detail normal is two-scale (2 m and 10 m tiles) and fades with distance, which removes the weave on 100 m walls.
- **Budgets.** Scatter LOD tau 1.3 → 1.8 px and LOD0 threshold 60 → 90 px; terrain tau 1.4 → 1.6 px. Gameplay at 1080p: 535k → 405k triangles.
- **Size.** Smooth mask channels (sky visibility, 'a'a, topographic position, frost, fumarole) are quantised to 6 bits and `normal_1m.jpg` is saved at quality 86. The assets excluding the export went from 155 MB to 147 MB.
- **Export.** Refreshed. `README.json` has `changes.round2`; nothing was renamed.

# Round 3 (coordinator review of r2; shading only, no re-bake of terrain or deposits)

## r3-it01–02: walls and the chasm-floor glow
- **Walls.** Reverted the smoothed vertex normals on steep faces; they read as draped cloth. The shading normal everywhere is now the full-resolution 1 m DEM normal map, with a 35 % share of the flat mesh normal only on near-vertical faces (Ngeo.y < .35). There is no smoothing, so breaks come from the real 1 m data.
- **Break-lines.** Derived from real slope discontinuities in the 1 m normal map: the slope difference over ±1.5 m along the fall line. Convex lips get a pale edge (+50 %) and concave toes a dark recess (−60 %), only where the line is resolved on screen.
- **Chasm floor.** The crust near the chasm slot was lit by the slot's point light (intensity 6000, decay 2) and by baked lava irradiance multiplied by bright yellow albedo. The slot light is now 2000, irradiance multiplies min(albedo, 0.25), and terrain albedo is capped at (.6, .52, .3); unsaturated whites go up to .55.

## r3-it01–04: fountain-view "glints"
- **Diagnosis.** With deposits off the slope is a smooth, sun-facing pale grey: high irradiance, not specular. With deposits on, the "glints" were sub-metre crust patches and their Dallol normal detail at 150–400 m, desaturated by ACES at that brightness.
- **Fix.** Crust coverage now blends to its mean colour from 220 m (was 700 m). The crust normal fades out with that blend. The mantle colour is darker and more saturated ochre. Frost, fumarole fringe and crust are all matte (roughness 0.95–1), and the terrain roughness floor is now 0.8.

## r3-it03–06: patera floors
- **Diagnosis.** The pale smooth grey at range was a uniform albedo of ~0.12. It still read pale because the surrounding basalt is ~0.06 and the floor showed no texture at range. An albedo debug view (debug 6–9: albedo, patera-block albedo, layer weights) found it.
- **GLSL fix.** Two `smoothstep` calls had reversed edges, which is undefined in GLSL. Fixed.
- **Fix.** Plates are darker (×0.1), frost only in the ridge troughs (never across the floor, at any distance), and the floor blends to a mean of 0.045 beyond 200–1200 m. Roughness is 0.97.

## r3-it02–06: context apron
- **Palette.** It uses the map's palette at low resolution: dark grey basalt, broad reddish-brown and black scoria, and a faint ochre mantle on flat ground that fades out beyond 6–12 km. My first version (an 80 % mantle in km-scale blobs) read as camouflage; the mantle is now 25 %.
