# Ice rift port: scan-built rifts, scarps and graben for the icy bodies

Started 2026-10-11 on branch `[path removed]` (worktree `[path removed]`).

## Background
The owner approved three three.js prototypes built in the terrain workbench (`[path removed]`, main; review page [endpoint removed]
- **A, ice rift canyon:** a Charon chasma profile with wall modules from a Hornsund TLS calving front and iceberg ice blocks. Code is `[path removed]`, assets `[path removed]`, scripts `[path removed]`.
- **B, fault scarp + chaos edge:** the DLR Conamara DTM layout with scarp modules from San Gabriel SfM, Mirror Fault and Poly Haven rock faces, plus Poly Haven rocks. Code is `[path removed]`, assets `[path removed]`, scripts `[path removed]`.
- **C, graben + fissure field:** a Canyonlands Needles lidar layout with wall modules from the Zion Cable Mountain scan and Volcanic Tablelands fissure outlines. Code is `[path removed]`, assets `[path removed]`, scripts `[path removed]`.

Each scene also has `[path removed]` (with a proposed Godot route), `LOG.md` and `CREDITS.md`. All sources are credited; the project is non-commercial.

The owner's direction (2026-10-11):
- These three families become the baseline for **all ice bodies and polar caps**. They replace the existing icy terrains.
- **Shackleton is the in-game quality bar** for detail, texture quality and composition.
- Low-poly cliff faces are acceptable as long as strong PBR textures and shading hide them.
- Each body and region gets its own shading, for a distinct feel.
- Port **one map at a time**. Each map gets **plates** for owner sign-off or feedback before the next starts.

## Region assignment

| Family | Region | Why |
|---|---|---|
| **B, scarp + chaos** | `europa.chaos_terrain` (**map 1**) | It *is* Conamara: real DTM plate heights, chaos rafts, plate-edge scarps. |
| B | `pluto.tombaugh_regio_volatile_plain` | Water-ice mountain blocks breaking from the crust over the nitrogen plain (chaotic block terrain). |
| B | `triton.triton_nitrogen_geyser_field` | Cap edge and cantaloupe-terrain scarp blocks. Also the only polar cap. |
| **C, graben + fissures** | `europa.ice_plain` (**map 2**) | Bands, troughs and open fissures on Europa's ridged plains. Reuses the Europa shading with a distinct plain palette. |
| C | `ganymede.ganymede_shielded_ocean_site` | Grooved terrain is literally sets of tectonic graben. |
| C | `callisto.callisto_valhalla_depot` | Valhalla's outer-ring graben and scarps. |
| **A, ice rift canyon** | `enceladus.enceladus_south_polar_terrain` (**map 3**) | A tiger-stripe trough between flanking ridges, with fresh ice walls. |
| A | `titania.titania_uranus_staging_ridge` | A Messina-style chasma (today 1.6 km wide and 400 m deep), Charon-like. |

There are no Mars polar caps in the catalog. If one is added later, it should use family A (the Chasma Boreale / spiral-trough ice scarps).

**Order:** Europa chaos (B), Europa ice plain (C), Enceladus (A), then the second region of each family (Ganymede, Titania, Pluto, Callisto, Triton). Each later map reuses the earlier tooling: the cliff-module loader, the placement, the ice material and the plate tooling.

## Per-map deliverables
1. **Field:** layout from the prototype's real data, scaled to the 384×384 × 31.25 m (12 km) map.
   - Keep the gameplay contract: two recommended hubs on buildable ground, three or more deposits, and one steep-access deposit reached by a transfer. Tests must pass (`REGION_CATALOG_PASS`).
   - Add a new generator version. (During the port the old versions were kept for saves; they were deleted at the end, see
     "Old generator versions deleted" below.)
   - Re-pin the hash with a stated reason.
2. **Wall modules in game:** a bake step from the prototype scripts and GLBs to a binary module format with LODs. Follow the `.hrock` / `bake_rocks.py` pattern, or extend it.
   - Load the modules and instance them per module type (MultiMesh), placed deterministically along the scarp edges of the field.
   - Use simple colliders, or keep the walls as barriers in `CellFlags`.
   - Stay inside the 500k-triangle view ceiling.
3. **Shading at Shackleton's level:** PBR texture-array layers (biplanar, hex-tiled), detail normals, cavity/AO, and salt staining, so that facets read as rock or ice structure rather than triangles.
   - Each body gets its own palette and recipe.
   - Europa: pale water ice, rust lineae, hydrated-salt staining, black sky, Jupiter.
4. **Scatter:** ice blocks and rocks through the existing `LibraryRockField` / rock library (add shapes append-only), at Shackleton density.
5. **Plates:** each one has these columns:
   - in-game shots at Shackleton's cameras (close 350 m, gameplay 2350 m, approach 14 km, plus a wall close-up)
   - the same cameras on Shackleton
   - the prototype reference

   The plates are published as an artifact for owner sign-off. A map is done only when the owner signs it off.

## Notes
- Shackleton baseline captures: `[path removed]`, from `[path removed]`, opening phase, views close, gameplay, approach and rock-detail.
- Heavy GPU runs go through `[path removed]`, which takes the heavy lock.
- Before merging terrain changes into main, check whether a geometry-bake session is running (`[path removed]`). Merging makes baked geometry stale.

## Status
- **All 8 maps accepted by the owner on 2026-10-12** (maps 1–4 signed off on 2026-10-11; Titania, Pluto, Callisto and Triton on
  2026-10-12) and all merged on `[path removed]`. Triton was the last, merged from `[path removed]` in 8fec9d916. After that merge
  every pin held (`REGION_CATALOG_PASS`; europa, ganymede, enceladus, titania, callisto, triton and pluto playable groups pass), and the
  re-captured plates match the accepted ones: Pluto and Triton bit-identical or within 0.0001/255 (gameplay, close, scarp, approach), the
  other maps under 0.5/255 (largest: Callisto scarp 0.43, Europa chaos close 0.22, as in earlier checks). Accepted pins: Europa chaos v107
  `1B4AE55C…`, Europa plain v104 `EB6E1DDF…`, Ganymede v111 `1B4EABF3…`, Enceladus v104 `D72B6C6B…`, Titania v103 `03C37499…86ECC2`,
  Pluto v102 `FD9A8E7A…71B808D9`, Callisto v115 `5427DF61…`, Triton v103 `C7BD1B6A…1BF6B848`.
  - **Old generator versions deleted (owner, 2026-10-12).** Each of the eight maps now has only its accepted generator:
    `SupportedVersions` is `[CurrentGeneratorVersion]` and the older field, authoring and frozen code is gone (`ValhallaRings114.cs`,
    `OuterJovian.Callisto114.cs`, `IcyLandforms`/`IcyImpacts`/`IcyFaults`, the Europa glacier fields and their DEMs
    `[path removed]`, Triton's generation-2 ridges, dimples and
    streaks, and the old Enceladus, Titania, Pluto, Ganymede and Callisto fields). Presentation that only old versions used went with them:
    `IcyTerrainSurface` (and its mesher, rocks, checks and `icy-terrain-art` mode), `OuterMoonSurface`, `EuropaGlacierMaterial`'s binding
    and assets (`[path removed]`), the `europa-compare` mode and the glacier/escarpment branches of the Europa
    surface. A save founded on an older version of these regions no longer loads: `RegionCatalog.Resolve` returns null and the load
    fails with `SaveLoadException` "region <id> (generator vN) is not available" (no migration, owner's decision). The current-version
    pins above are unchanged. Still to prune: the terrain shader's branches behind uniforms that nothing sets now (`europa_clear_surface`,
    `europa_glacier`, `europa_escarpment`, `europa_plain`, `old_ice`, `ring_*`, `outer_moon`) and the legacy fallback paths in
    `EuropaTerrainSurface` that the eight drawn surfaces bypass.
  - **Shared at the merge.** Triton's coarse-LOD cliff and face-normal fix and Pluto round 2's re-implementation of it were the same
    arithmetic. They are now one opt-in mechanism, `ScarpFaceFix` (`Coarse`, `FaceNormal`), enabled for Pluto and Triton through each
    body's field (`SputnikSurface.ScarpFace`, `TritonCapSurface.ScarpFace`). The per-body shader face blocks stay separate. Callisto's
    `CliffLook.Specular`/`FrostPatch`, Triton's `CliffLook.Range` and Pluto's `ScarpEdges.Options.CornerTrim` and
    `cutout_blend_lambert` remain opt-in, each for its own map.
  - **Open, non-blocking (owner accepted):**
    - on Pluto and Triton, blocks beyond 3–4 km still show smooth faces (the 110k wall budget is spent nearer);
    - a faint map square shows on the approach;
    - Pluto's travel windows arrive 80–110 years out in the shipped navigation model;
    - Titania's plates use the 2037 sun (`HELIOS_RIFT_SUN_YEARS=9`) and map 1's `europa_scarp` kit.
- **Map 1, Europa chaos:** ported on `[path removed]` as generator v107. Signed off 2026-10-11. The log, numbers and
  gaps are in [ice-rift-europa-chaos-log.md](ice-rift-europa-chaos-log.md); the plates are in
  `[path removed]` (`PLATES.md`). The tooling for the next maps:
  `[path removed]` (kits), `CliffLibrary`/`CliffWallField`/`ScarpEdges`,
  the `ice-rift-plates` capture mode, `[path removed]` and `HELIOS_GAME_ONLY=region-dump`.
- **Map 2, Europa ridged plain:** ported on `[path removed]` as `europa.ice_plain` generator v104 (family C, the Needles graben
  lidar ×2/×1.6 with Volcanic Tablelands fissures, Zion wall kit `europa_graben.hcliff`, a distinct bright plain palette). Signed off
  2026-10-11. The log, numbers and gaps are in [ice-rift-europa-plain-log.md](ice-rift-europa-plain-log.md); the
  plates are in `[path removed]` (`PLATES.md`, including `vs-chaos-*` palette pairs against map 1).
  New reusable pieces: `build_graben_modules.py`, `[path removed]`, the `ScarpEdges.Options`
  rise/back/foot controls, `[path removed]`, `FrontierTerrain.Renders` and `HELIOS_DUMP_RAW=1`.
  - **Round 2 (2026-10-11)** answered the owner's review: plain tone at the same mean brightness (one knob,
    `GrabenSurface.PlainBrightness`), grey readable shadowed walls, closed module gaps, no horizon band, 5.8k rocks at the
    gameplay camera, far walls with LOD0 relief. Signed off by the owner on 2026-10-11 (`round2-before-after-*.png`).
- **Map 3, Enceladus tiger-stripe sulcus:** ported on `[path removed]` as generator v104 (family A), merged into
  `[path removed]`. Signed off 2026-10-11. The log, numbers and gaps are in [ice-rift-enceladus-log.md](ice-rift-enceladus-log.md); the plates are in
  `[path removed]` (`PLATES.md`, including `vs-europa-chaos-*` and `vs-europa-plain-*` palette pairs).
  - The field is the workbench scene-A rift as an analytic layout (`TigerStripeSulcus.cs`): a 150 m trough with two wall tiers, the
    Charon bench, flanking ridges, trunk, branch and side fissure, vent cones on the floor.
  - Wall kit: Hornsund TLS slices (`build_rift_modules.py`) and iceberg blocks (`enceladus_rift.hcliff`).
  - Shading: Enceladus's own palette (near-white plain, bluish-green stripe ice, no rust), a nearly white sun for the map, Saturn
    on the horizon.
  - A shader-switch pitfall is in the log: a uniform named `enceladus_sulcus` never reached the GPU. Map 2's `europa_graben` uses the
    same pattern and is worth a check.
  - **Round 2 (2026-10-11)** answered the owner's review: a fractured plain (stronger ropes, parallel fractures, per-pixel fracture
    fabric, boulder fields; no blotch noise), irregular crisp walls (jogs and alcoves, facet shading, run-end taper, a 34° debris
    heap), shaded ice blocks, a sun 20° across the trough. Re-pinned. Signed off by the owner on 2026-10-11 (`round2-before-after-*.png`). New
    shared options, all off by default: `ScarpEdges.Options.EndTaper`, `DebrisRamp.Repose`, `[path removed]`,
    `HELIOS_RIFT_SUN_TOLERANCE`, `HELIOS_RIFT_SCARP_LIT`.
- **Shared for every map:** far wall LODs shade with a per-kit relief map (`<kit>.hrelief` from `bake_cliffs.py`, also
  `--relief-only` for an existing kit; `CliffLibrary.Relief`, `CliffWallField.ReliefLod`). `bake_cliffs.py --backing` closes the
  open corners of scan slices. `[path removed]` and the terrain's `shade_desat`/`shade_lift` set a map's shadow
  side. `BodyGlobe.SetCutoutBlend` fixes a globe colour that does not match the map's horizon. Map 1 was re-checked with the far-LOD relief and
  its plates regenerated (`farlod-before-after-*.png`).
- **Map 4, Ganymede grooved terrain** (`ganymede.ganymede_shielded_ocean_site` generator v111, family C): two sulci of the
  Needles lidar (a different arrangement from map 2, with a regular tilt-block groove set) crossing cratered dark terrain;
  rounded groove walls; a fresh rayed crater whose floor ice is the steep-access deposit (`DebrisRamp`); a two-tone neutral
  grey palette distinct from both Europa maps; Jupiter on the western horizon. Pin `1B4EABF3…B6FE1116` (round 3; round 2 was
  `3B7D3215…55330B`, round 1 `C91F4A15…678DF8`).
  Signed off 2026-10-11 (round 3). Log: [ice-rift-ganymede-log.md](ice-rift-ganymede-log.md); plates:
  `[path removed]` (`PLATES.md`, `vs-europa-plain-*` against map 2). New reusable pieces:
  `GrabenLayout.Load(resource)`, `GrabenRocks.Place` with a candidate function, upper-scarp-only walls via the existing `ScarpEdges`
  `FootOut`/`Sink` options, `ice_rift_plates.py --sister-caption`.
  - **Round 2 (2026-10-11)** answered the owner's review of round 1: irregular, interfingering sulcus margins with no
    bounding scarp or raised swath, wall modules only in runs along tall groove scarps (no margin strips, no kit blocks),
    no repeating stamp on the dark terrain (`round2-before-after-*.png`). New reusable pieces: `GrabenLayout.Plane.SampleSmooth`
    (bicubic) and `HELIOS_DUMP_FINE` in `region-dump` (fine field heights around a point).
  - **Round 3 (2026-10-11)** answered "I prefer the sharp cliffs": steep 70 %/9 m upper cliffs with sharp brows, map 1's scan kit
    along most groove walls (13.8k modules, never on margins), fallen blocks toned to the talus, cliff joints/ledges/brow frost in the
    shader (`round3-before-after-*.png`; pin `1B4EABF3…B6FE1116`). New shared pieces (identity elsewhere): `CliffLook.BlockTone/
    BlockMix/BlockGain` and the terrain shader's `td_geo_n`. Signed off by the owner on 2026-10-11.
- **Map 5, Titania Messina-style chasma** (`titania.titania_uranus_staging_ridge` generator v103, family A): **accepted by the owner
  on 2026-10-12**. A 420 m deep, 2.3–2.6 km wide north–south graben whose walls step down in three
  to four fault scarps with back-tilted terraces, a broad floor with tilted blocks, a landslide scar carrying the steep-access transfer,
  old cratered plains on both rims and a fresh rayed crater (`ChasmaField`, `MessinaChasma.cs`, reusing the Enceladus branch geometry);
  map 1's fault-column kit on every step (the Hornsund slices streaked at this scale); a dark neutral grey Titania palette. Plates use
  the 2037 sun (`HELIOS_RIFT_SUN_YEARS=9`, 14°; at the epoch it never clears 0.8° here); Uranus is below this site's horizon.
  Pin `03C37499…86ECC2`. Log: [ice-rift-titania-log.md](ice-rift-titania-log.md); plates:
  `[path removed]` (`PLATES.md`, `vs-enceladus-*`). New shared pieces (identity elsewhere): `ScarpEdges.Options.Walls`,
  `[path removed]`, `LibraryRockField.RegionForward`, `HELIOS_RIFT_SUN_YEARS`, `HELIOS_DUMP_SUN`. Maps 1–4 re-checked:
  pins unchanged; map 2 and Enceladus re-captures within 0.1/255 of their plates.
- **Map 6, Pluto Sputnik block margin** (`pluto.tombaugh_regio_volatile_plain` generator v102, family B), built on branch `[path removed]`
  and merged into `[path removed]` beside map 5 (2026-10-12). **Round 2 accepted by the owner on
  2026-10-12.** Round 1's plates are kept in `[path removed]`.
  - **Round 2 (drawn-only; v102 and its pin unchanged).** Darker, redder, more muted tholin tops with a fracture net, mottling and frost
    in the hollows; a textured plain (trough flanks from a drawn channel, dusty trough shoulders, pit fields, cream/bluish patches) that
    stays bright; Triton's rim fix ported with a 3° lean and the modules 3 m out (a 9° lean buried them behind Pluto's backing), feet sunk
    into the talus, and a new opt-in `ScarpEdges.Options.CornerTrim` (narrower modules at block corners); Triton's coarse-LOD cliff and
    face fixes re-implemented for Pluto only (no far fluting); an opt-in plain-Lambert globe light inside the horizon blend
    (`cutout_blend_lambert`[path removed]`round2-before-after-{gameplay,hero,scarp,close}.png`.
    Open: a calmer plain than Shackleton's, frost dabs, smooth far faces beyond the wall budget, a dim grey globe band.
  - **Field.** A procedural block field in the spirit of the Conamara layout planes (`SputnikBlocks.cs`): angular water-ice blocks 1–3 km
    across on 1.5 km Voronoi cells, dense and tall at a wavering western margin and drifting out, smaller and lower, over a flat nitrogen
    plain. The plain has 3.4 km convection cells with shallow edge troughs, small drifted hills and drawn-only sublimation pits. The
    blocks have rugged, stepped and cracked tops, 64–265 m scarps (p10–p90), map 1's jogs and talus aprons, and the montes grow on the
    western skyline.
  - **Gameplay.** Two hubs on the plain; the bedrock on a drifted block's top is reached by a `DebrisRamp` transfer; three
    road-reachable deposits.
  - **Look.** Map 1's scan wall kit toned as reddish water-ice bedrock, filtered by `ScarpEdges.Options.Walls` (the same
    wall-name filter map 5 added; default off): tall
    San Gabriel columns only, no small Poly Haven faces. Pluto's own palette: a bluish-white to cream plain, dark tholin-mantled tops,
    fresh ice on the faces, rusty talus. A neutral faint sun and a thin blue horizon haze; the globe haze limb fades inside the region's
    horizon blend. Charon is below the horizon at 175°E.
  - **Pin.** `FD9A8E7A…71B808D9`.
  - **Docs and tests.** Log: [ice-rift-pluto-log.md](ice-rift-pluto-log.md); plates: `[path removed]` (`PLATES.md`,
    `vs-europa-chaos-*`). New `pluto-art` and `pluto-playable` groups, with a Pluto orbital-hub fixture (`OuterTests.PlutoHubs`, a
    Nuclear-Electric Pioneer; every Pluto window arrives about 80+ years out in the shipped navigation model).
- **Map 7, Callisto Valhalla outer ring zone** (`callisto.callisto_valhalla_depot` generator v115, family C). Round 2 accepted by the
  owner on 2026-10-12. Round 1's (v114) plates are kept in `[path removed]`.
  - **Field.** An analytic ring field (`RingField`, `ValhallaRings.cs`) in the basin's own frame (centre 30 km west):
    - outward-facing ring scarps (115–210 m in the map) in en-echelon segments (steps of 380–520 m) whose throws taper into relay
      ramps; each ring drifts by up to ~1 km, so the arcs are not parallel and their spacing varies (~1.2–4.5 km);
    - pinch-outs and ring-scale relays: w2 hands over to w3, e1 to e2, and w1 dies out at the north edge;
    - a trough (unchanged, 195 m) with a counter wall that pinches and swells, and a second narrow trough that pinches out;
    - crisp near-planar cliffs with a taller, longer talus apron (27 % of the throw);
    - the outer plains settle to each ring's smoothed throw, so the hubs' plains stay level (1.3° mean tilt);
    - subdued old craters whose rims break into knobs, a knob field with frost caps, a lag-filled crater and a fresh rayed crater;
    - context rings continuing to the horizon.
  - **Gameplay.** Unchanged layout: both hubs on the dark plain east of the trough; the trough-floor ice only by a transfer down a
    landslide scar (359 m, 28° max); the fresh-crater ice and the lag silicates on the road net.
  - **Walls.** Map 1's fault-column kit with the `Walls` filter, in 1–3 rows by drop, out to ±9 km including the context rings.
  - **Look.** Callisto's own palette, the darkest of the port: a faintly brown lag mantle with darker ponds, frost on poleward slopes and
    knob caps. Round 2: matte, lag-mantled scarp faces with frost only in patches (round 1's white faces came from the module shader's
    sun glint, not the palette), grey debris aprons grading through a dark lag skirt into the plain, lag-coated blocks, boulder patches.
  - **Sun.** The plates use a 37° mid-morning sun 11 days after the epoch (`HELIOS_RIFT_SUN_YEARS=0.03`). Accepted with the map; the
    outward scarps' low side is sunward, so they cast no shadow there.
  - **Pin.** v115 `5427DF61…24E6C58E` (round 1 v114 was `7CC68881…F231DF`).
  - **Docs and tests.** Log: [ice-rift-callisto-log.md](ice-rift-callisto-log.md) (round 2 at the end); plates:
    `[path removed]` (`PLATES.md`, `round2-before-after-*`, `vs-ganymede-*`, `vs-titania-*`, `vs-prototype-*`,
    `vs-shackleton-*`). `callisto-art` and `callisto-playable` groups.
  - **Shared code.** Hooks, plus two opt-in `CliffLook` options (`Specular`, default 1; `FrostPatch`, default 0).
  - **Regression check.** Round 1: map 4 within 0.05/255 of its plates. Round 2: map 5's scarp frame bit-identical to its plate.
  - **Open (round 2).** Gameplay-distance readability of the scarps, no low-side cast shadow at this sun, remaining scan holes, a sparser
    boulder field than Shackleton's, and the faint map square in the approach view.
- **Map 8, Triton southern polar-cap edge** (`triton.triton_nitrogen_geyser_field` generator v103 after round 2, family B), built on branch
  `[path removed]` (worktree `[path removed]`, from `4dfca473f`), merged into `[path removed]` in 8fec9d916.
  Round 2 accepted by the owner on 2026-10-12 (round 1's plates in `[path removed]`, side-by-sides in `round2-before-after-*.png`).
  - **Round 2 (v103).** Double ridges that wander, branch, step en echelon and cross at ~45°; dimples of two sizes on warped domains (core,
    drawn and shader tiers); geyser fans each with its own turn, taper, fade, curve and in places a fork; the terrain cliff behind the wall
    modules (the straw, found with a walls-off capture) now takes field-derived normals and a jointed rock tone from the region position;
    a `sky` plate camera (opt-in `HELIOS_RIFT_SKY`) shows Neptune over the cap edge; cap-edge walls traced 7–15 km beyond the map
    (`CliffLook.Range`, opt-in); the keystone ramp reaches the rim, so the transfer peaks at 28.8°. Pin `C7BD1B6A…1BF6B848`. Open: plain terrain face between modules and small zigzag teeth at foot and brow, the
    far west cap edge still soft (wall budget), the faint map square and globe band at the approach.
  - **Field.** `TritonCapEdge.cs` (`TritonCapField`): a pinkish nitrogen/methane frost cap 120–200 m thick whose scalloped northern edge
    breaks into scarp blocks along a 620 m crack lattice (some slumped), with outlier mesas thinning out over the cantaloupe lowland; the
    lowland is the union of round dimples (540 m, 14–26 m deep, scaled down from the 30–50 km cavi) crossed by two breached double ridges.
    The cap thins to a 5 m frost veneer in the east, where a gentle frost slope carries the road onto it. Twenty dark geyser fans, all
    downwind to the north-east; two of them carry the existing dark plume column (`OuterDressing`).
  - **Gameplay.** `hub.edge` on the lowland below the scarp and `hub.frost` on the thin eastern cap, one road net; the frost on a keystone
    mesa by a `DebrisRamp` transfer; cap frost, streak dust and cantaloupe silicates by road.
  - **Look.** Map 1's scan kit (tall San Gabriel columns only) with tops at the brow leaned back into the block and feet sunk in the talus;
    Triton's own palette (pinkish frost, grey-pink layered faces, a muted grey lowland with lag and rim frost); a coarse-LOD cliff fix
    (now the shared `ScarpFaceFix.Coarse`, 31/62 m levels only) so far block faces keep their walls. The epoch's sun is usable (13°); Neptune is about
    42° up in the north-north-west (round 1: outside every frame the surface rig allows; round 2: the `sky` plate).
  - **Pin.** Round 1 `EB03C6D1…D2F2D800` (v102); round 2 above.
  - **Docs and tests.** Log: [ice-rift-triton-log.md](ice-rift-triton-log.md); plates: `[path removed]` (`PLATES.md`,
    `vs-pluto-*`). New `triton-art` and `triton-playable` groups with a Neptune hub fixture (`OuterTests.NeptuneHubs`, the Saturn hub
    copied as Neptune's, as `UranusHubs`). Maps 1–6 pins unchanged; map 6's gameplay re-capture within 0.03/255 of its plates.
