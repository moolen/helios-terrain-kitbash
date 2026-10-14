# Ice-rift port, map 2: Europa ridged plain with graben and fissures (family C), iteration log

> **2026-10-12:** the older generator versions of this region were deleted (owner); only the accepted ice-rift version remains and saves founded on older versions no longer load. See [ice-rift-port.md](ice-rift-port.md). Mentions below of versions "kept for saves" are history.

Plan and deliverables: [ice-rift-port.md](ice-rift-port.md). The sister map is map 1 ([ice-rift-europa-chaos-log.md](ice-rift-europa-chaos-log.md)).
Captures come from `[path removed]`
(`[path removed]`), always after `[path removed]`.
The Shackleton reference is `[path removed]`.

## What was built
- **Field (core).** `[path removed]` builds `[path removed]` from the Needles fault-zone
  lidar (the workbench scene-C source, 1 m bare earth): a 6 × 6 km window around the prototype crop, rotated −52° like the workbench so
  the graben run east-west, ×2 horizontally onto the 12 km map and ×1.6 vertically (walls of 30–170 m, p50 74 m). The planes
  are the wall-midline signed distance (local mid-range contour inside the lidar's steep bands), the smoothed DEM, the high and low
  levels either side of each wall, a graben-floor share and the fissure signed distance (3.9 m). The fissures are the workbench's
  Volcanic Tablelands trace masks, stamped eight times across plains and floors and kept 90 m clear of the walls.
  `NeedlesGraben.cs` (`GrabenField`) drops each wall in a 24 m backing between its levels, with continuous plan-view jogs, a talus
  apron, three families of low double ridges, a fine ridge-and-groove fabric and fissure profiles (5–26 m deep).
  `GrabenRamp` is the prototype's graded road ramp (cut and fill, about 6° here) down the central wall; a `DebrisRamp` carries the
  steep-access transfer. Generator 4/104; v101–v103 stay for saves.
- **Wall modules.** `[path removed]` re-slices the workbench's screened-Poisson mesh of the Zion
  Cable Mountain scan to the steep face only (no talus apron, no summit dome) at 9k triangles per slice, and `bake_cliffs.py`
  (new `[path removed]` options) bakes it with map 1's three toppled-block scans into `europa_graben.hcliff`
  (six walls, four LODs). `GrabenWalls` stands them along every wall midline from the brow (hung 21 m into the backing, 0.92–1.0 ×
  the drop) and lines the open fissures with small modules. `CliffWallField` gained an ice-layering term and a facet share per look.
- **Surface.** `GrabenSurface` draws the field at the micro LODs on the gameplay grid (same offset contract as `ConamaraSurface`);
  vertex colours carry the plain palette with baked cavity and a fissure-margin halo in alpha. `GrabenMaterial` is the terrain
  shader block: the double ridges' lineae (exactly on the core relief, shared constants), broad reddish flank bands, the ridged-plains
  fabric, two dilational bands, fresh blue-white wall ice with rust seepage, reddish lag and frost swaths on the graben floors, frost
  polygons and a hairline fracture net on the plains. `TerrainTextures.EuropaGraben` is the photo recipe. The map renders with the
  frontier budget (`FrontierTerrain.Renders`).
- **Scatter.** `GrabenRocks` places library ice blocks on the talus aprons, behind the brows, along the fissure lips (never inside),
  on the graben floors and sparsely on the plains.

## Iterations
1. **i01, first build.** Shader compile failure: `flat` is a GLSL keyword. Nothing of the graben block rendered.
2. **i02, first look.** Walls read as jointed ice at the scarp camera; the plain palette is clearly not the chaos map. The relief was
   too low (×1.3) at the approach camera, the fissure kit placed 12k modules, and the double-ridge stripes were busy.
3. **i03, ×1.6 relief, sites rebuilt.** The wall-slope threshold was rescaled with the relief, which moved the walls; hubs, ramp and
   steep-access deposit were re-placed. The ramp became cut and fill (a fault fin crossed its line). Walls stood proud of the brow
   as rows of vertical teeth at the gameplay camera.
4. **i04, palette and rise.** Modules 0.9 × the drop, brighter and bluer plain ice, paler floors, wider fissures, a
   far-ring guard in the shader (the far rings carry no UV2 shares and turned orange).
5. **i05, plains fabric.** A ridge-and-groove fabric in the relief and the shader; wider modules (90–170 m).
6. **i06, layering.** Ice layering on the wall shader, smaller toppled blocks, bigger jogs. The stand-in walls still showed teeth.
7. **i07, diagnostic** (walls off, gameplay only): the teeth were the terrain, not the modules: the 15.6/31 m LODs alias the
   step-wise Voronoi jogs and the 10 m backing.
8. **i08, backing and jogs.** Jogs made continuous across cell borders; the backing is 24 m wide and the modules hang from the brow
   into it. The scarp and hero shots now read as one continuous fault wall. Barrier band widened to match.
9. **i09.** Floor palette paler, plains fracture net (barely visible at the hub, which is a flat pad).
10. **i10, sun and lineae.** Local morning sun lowered to 11° (`HELIOS_RIFT_SUN_ELEVATION=11`) for longer shadows; the double ridges
    straightened (warp 70–110 m over 6–9 km) after the horizon shot showed curved lines reading as tracks; the thin trough lines
    fade in only from altitude. Bench-blend ring no longer tinted as talus. Stronger metre-scale crust and fabric relief.
11. **i11.** Floors paler again (owner note on map 1), denser plain scatter (4.0k rocks at the gameplay camera).
12. **i12, lineae** (gameplay, approach, hero only). Broad reddish flank bands like the prototype's double-band lineae.
13. **i13, final set.** Plates: `[path removed]` (`PLATES.md`).

## Numbers (i13)
| View | Shown | Terrain chunks | Walls (tris / modules) | Rocks (tris / instances) |
|---|---|---|---|---|
| close 350 m | 490k | 274k | 130k / 840 | 86k / 2,543 |
| gameplay 2350 m | 484k | 277k | 130k / 1,051 | 77k / 4,000 |
| approach 14 km | 281k | 152k | 130k / 1,190 | 0 |
| graben wall (scarp) | 490k | 274k | 130k / 379 | 86k / 217 |
| hero | 438k | 266k | 130k / 607 | 42k / 2,136 |
| wall close-up | 490k | 279k | 130k / 273 | 81k / 195 |
| horizon | 490k | 293k | 130k / 1,130 | 67k / 3,485 |

15,255 modules are placed (10.7k fault-wall modules over 614 km of traced midline, 4.6k fissure modules, 844 toppled blocks). Kit:
1.5 MB (`europa_graben.hcliff`); layout: 2.9 MB. The capture asserts the 500k ceiling and drawn-height contact for every shot.

## Tests
- `REGION_CATALOG_PASS` with the v104 block (`EUROPA_PLAIN_RIFT_PASS`): wall drops p50 74 m, p90 160 m; open fissures; walls and
  fissures are barriers; both hubs buildable and connected by road down the ramp; the fault-block ice (north-east) is reached only
  by a legal transfer from a terminal on the graben floor; every other deposit is road-reachable; the founding district fits a town.
  v101–v103 still resolve to their pinned hashes.
- **Re-pin:** `europa.ice_plain` v104 = `EB6E1DDFC2FF7A3C3DFF2C637531D60EF74AE198DA9EA7C83D46B123047595E9`. Reason: new campaigns
  now found on the Needles graben field (ice-rift family C). The v103 pin is unchanged and still checked.
- `HELIOS_GAME_ONLY=europa-playable` now also runs the plain: actual foundings on both v104 hubs, a rover-reachable yard, save/load.
  `HELIOS_GAME_ONLY=europa-plain-art` runs the plain's region checks alone.
- `HELIOS_GAME_ONLY=outer-terrain-art` passes (Titan, both plain hubs, both chaos hubs). `HELIOS_GAME_ONLY=outer` stops at the known
  pre-existing Titan methane assertion (`OuterTests.Titan`, Sites.cs:283); every step before it passes (including the plain's
  evidence and region checks); the steps after it (thermal to performance) do not run in that suite.

## Gaps against Shackleton
- Walls beyond about 1.5 km use the 420/110-triangle LODs and read as smooth vertical fluting (same as map 1). *Round 2: the far
  LODs now shade with LOD0's relief map; see "Round 2".*
- The plains are calm by nature: at the gameplay camera the foreground is a bright, gently ridged sheet with lineae and sparse
  blocks, much less busy than Shackleton's boulder-strewn crater rims. The close camera sits on the flat founding pad.
- Rocks at the gameplay camera: 4.0k (map 1 4.7k, Shackleton 6.4k). The 130k wall budget and 277k of terrain leave about 80k triangles.
- Short walls in the far graben belt are drawn by the terrain alone (the module budget goes to the nearer walls) and keep some
  stepped facets.
- Ice-plain Europa is anti-Jovian (5°S 180°E): Jupiter never rises, so no shot shows it (the prototype's Jupiter is artistic licence).
- Fissure interiors are procedural profiles; only their planforms are measured (as in the prototype).

## Reusable for maps 3 and later
`build_graben_modules.py` (scan slicing to a steep band), `[path removed]`, `ScarpEdges.Options`
(`TopBack`, `FootOut`, `Rise`, `RiseSpread`; negative `Out` hangs modules into a wide backing), `[path removed]`,
`FrontierTerrain.Renders`, `RegionDumpTools` raw planes (`HELIOS_DUMP_RAW=1`), and the plates script's `--sister` pairs.

## Round 2 (owner review of the i13 plates, 2026-10-11)
Owner notes: washed-out plains, saturated dark-blue shadowed walls, wall modules separating into sheets with see-through gaps,
a brown band on the approach horizon, sparse scatter, and (shared with map 1) far walls reading as smooth vertical fluting.
Owner decision mid-round: keep the plains bright and icy; add contrast and tonal structure only, with the mean brightness
unchanged. Captures `p2r01`–`p2r06` and the final `plain-r2b` (the map 1 check is `chaos-r2`; 11 of the 12 allowed captures).

1. **r01.** Every fix in a first cut. Shadowed walls turned from saturated navy to grey ice. The first backing patches (flat,
   row-terraced, following the face's depth) read as flat blocks with stretched photo texture. Rocks still 4.0k at the gameplay
   camera, now limited by candidates, not triangles. The horizon band was unchanged: it is the Europa globe beyond the 48 km far
   terrain, not the context ring.
2. **r02.** Patches got fractal relief with AO in their hollows; the cliff streak noise widens and calms with distance; denser
   scatter candidates (5.8k rocks); a horizon blend on the outer-moon globe. The band is gone; the gaps read as recessed ice.
   Plain contrast was *lower* than round 1 (the shadow lift also flattened the plains' micro-relief shading).
3. **r03–r05, plain tone.** The tonal terms had to be strong to survive the tone mapping near white; the 28 m groove term read
   as regular corrugation until it was broken into 60–200 m patches. The terrain's shadow lift now skips near-level ground.
4. **r06, far walls.** The far-LOD relief eases to the module's facing at its side margins (the curled margins printed one dark
   groove per module) and its normal is boosted ×1.5 against mip flattening.
5. **Map 1 check.** The first map 1 capture showed a thin dark seam along a plate brow (back faces of curled top margins shaded
   as joints). Back faces now use neutral AO with an upward bias; the final map 1 set matches the signed-off plates except for
   the far-wall relief.

### What changed
- **Plains** (`GrabenMaterial`, `GrabenSurface`): groove shading, frost and grain at 22 m / 90 m / 900 m, darker and redder
  lineae, margins and fissure halos, sun-independent cavity on crust slopes, stronger vertex concavity occlusion. One knob for
  the brightness: `GrabenSurface.PlainBrightness` (shader `graben_plain_gain`, ArtTune `graben.plainBrightness`, 1.0 = the
  owner-kept round-1 level); `PlainTone` (`graben.plainTone`) scales the structure (0 = round 1).
  Plain patches (luminance, 1080p): gameplay foreground mean 0.730 → 0.740, SD 0.078 → 0.090, mid-scale SD 0.038 → 0.041;
  graben-belt plain mean 0.751 → 0.768, SD 0.077 → 0.086; close camera (the flat founding pad) mean 0.763 → 0.757, SD unchanged.
- **Shadowed walls**: neutral, faintly cool sky fill (`GrabenSurface.Fill` 0.255/0.26/0.27, no Jupiter on this anti-Jovian site),
  `ShadeDesat` 0.55 (the fill and the shadow lift light a greyed albedo) and `ShadeLift` 0.10 (sun-relative bounce on faces in
  shadow only). New generic uniforms `shade_desat`/`shade_lift` in `TerrainShader`, `CliffWallField` (`CliffLook.ShadeDesat/
  ShadeLift`) and `LibraryRockField` (taken from the terrain); every other map keeps 0.
- **Module gaps** (`bake_cliffs.py --backing`, graben kit rebaked): each column of a wall slice's front view is solid from its
  highest scan point to the base; the open corners and notches (up to 25 % of a slice) are closed per LOD by a recessed, rough
  patch (grid 2/5/10/20 base texels, 5 % of the depth behind the face, fractal relief, AO 0.42–0.75). LOD0 grows by 11–1100
  triangles per module. Back faces seen through curled margins shade as ice, not black (winding-free test, so mirrored instances
  are safe).
- **Horizon band**: the far terrain ends at 48 km; beyond it the surface camera sees the outer-moon globe, which at 180°E is dark
  brown. `outer_moon.gdshader` now blends the globe to a region colour around the cut-out (`BodyGlobe.SetCutoutBlend`, from 1.2× to
  9× the drawn half extent); `GrabenSurface.Horizon` supplies the plain colour. The context ring beyond the map also fades to the
  plain palette (vertex colour and shader, 0.3–2.5 km past the edge).
- **Scatter**: wall budget 130k → 100k (the far LODs hold up with the relief maps), candidates 5.5 → 4.4 m spacing, 1.9 km range.
- **Far walls (shared, generic)**: `<kit>.hrelief` per kit (front-view LOD0 normal, AO, cavity; `bake_cliffs.py`, or
  `--relief-only` from an existing kit). `CliffLibrary.Relief` loads it, `CliffWallField`[path removed]`ReliefLod`, ArtTune
  `cliffs.reliefLod`) with it. Every later kit inherits it by baking a `.hrelief`.

### Numbers (round 2)
| View | Shown | Terrain chunks | Walls (tris / modules) | Rocks (tris / instances) |
|---|---|---|---|---|
| close 350 m | 490k | 274k | 100k / 531 | 116k / 3,305 |
| gameplay 2350 m | 489k | 277k | 100k / 657 | 112k / 5,779 |
| approach 14 km | 251k | 152k | 100k / 778 | 0 |
| graben wall (scarp) | 490k | 274k | 100k / 247 | 116k / 292 |
| hero | 464k | 266k | 100k / 406 | 99k / 4,972 |
| wall close-up | 490k | 279k | 100k / 197 | 111k / 278 |
| horizon | 490k | 293k | 100k / 733 | 97k / 5,016 |

Rocks at the gameplay camera: 4.0k → 5.8k (Shackleton 6.4k; it varies 5.6–6.2k between runs with the async rock selection).
Kit: 1.56 MB + 0.49 MB relief. Region hashes unchanged (rendering only); `REGION_CATALOG_PASS` and `europa-playable` pass.

### Still open
- Far walls now carry LOD0 joints and AO, but at the hero distance the modules' regular width still shows as a slab rhythm
  along the wall, and the coarse hulls' tops form V notches.
- The "teeth" (small cones) on the short walls in the far graben belt are terrain, unchanged.
- The close camera sits on the flat founding pad: its contrast gain is small (tone mostly at 90 m and above).
- Shadowed wall faces now read as grey ice; with `ShadeDesat` 0.55 they are close to neutral. Lower it for bluer shadows.
