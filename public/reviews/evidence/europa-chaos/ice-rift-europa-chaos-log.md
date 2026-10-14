# Ice-rift port, map 1: Europa Conamara chaos (family B), iteration log

> **2026-10-12:** the older generator versions of this region were deleted (owner); only the accepted ice-rift version remains and saves founded on older versions no longer load. See [ice-rift-port.md](ice-rift-port.md). Mentions below of versions "kept for saves" are history.

Plan and deliverables: [ice-rift-port.md](ice-rift-port.md). Captures come from `[path removed]`
(`[path removed]`). The Shackleton reference is `[path removed]`.

## What was built
- **Field (core).** `[path removed]` builds `[path removed]` from the DLR Conamara
  HighRes (30 m) strip as a central inset and the LowRes (120 m) chaos around it, both at 1:1, ×1.4 vertical. The planes are the
  workbench layout's (dtm, signed plate distance, nearest plate level, matrix floor). `ConamaraScarps.cs` ports `terrain.js`:
  Voronoi plan-view jogs (two octaves), plate tops with 35 % of the measured relief plus ridge pairs, a 10 m wall backing,
  the talus apron, matrix hummocks and tilted chaos rafts. Generator 7/107; v106 stays for saves.
- **Wall modules.** `[path removed]` bakes the nine workbench wall GLBs and three block scans into
  `europa_scarp.hcliff` (four LODs, smooth normals, ray-traced AO and cavity per vertex). `CliffLibrary` loads kits,
  `ScarpEdges` traces edges (marching squares) and places walls and toppled blocks (port of `placement.js`),
  `CliffWallField`[path removed]`ConamaraWalls` is the Europa family.
- **Surface.** `ConamaraSurface` draws the field at the micro LODs, tied to the gameplay heights by the bench offset;
  vertex colours carry the Europa palette with baked cavity; `ConamaraMaterial` is the terrain-shader block (lineae, cracks,
  seepage, matrix brine) plus the `EuropaRift` photo recipe.
- **Scatter.** `ConamaraRocks` places library ice rocks on the talus aprons, behind the brows, on plates and in the matrix.

## Iterations
1. **i01, first build.** Everything renders, but on the old chaos shading branch: orange, blotchy, with walls hidden in the
   wrong place for the camera. The context faded to a flat plain, which looked artificial in the approach view.
2. **i02, rift material and close-up.** Own shader block and recipe, layout mirror-folded beyond 7.4 km (the context continues
   the chaos), automatic scarp and hero shots. The scarp close-up shows the scan walls reading as jointed ice. Walls ran out
   of budget after 440 instances, so many scarps were bare ramps. Toppled blocks were too white.
3. **i03, LOD and palette.** LOD thresholds raised, distant stand-ins thin to every other module, a calmer and less saturated
   palette, larger and taller rafts (120 m cells, 4–14 m), HR matrix noise blurred. Distant scarps now carry walls. The hub
   bench was smearing the scarp next to it.
4. **i04, gameplay contract.** Hubs moved onto open matrix floor (pad blends stop short of the aprons); a debris ramp
   (`DebrisRamp`) on the isolated plate north of the hub carries the transfer corridor (vertical scarps exceed the 45° corridor
   limit); matrix relief low-passed (80 m) and hummocks softened, so roads reach a third of the map. The hero and scarp
   shots read like the workbench B scene.
5. **i05, rafts per pixel.** The rafts were saw-toothed by the 31 m vertex colours. The shader now draws their outlines
   from the core Voronoi (`rn_hash` is an exact port of `RegionNoise.Hash`), with blue-grey sides. Plate tops got the
   ridged-plains striations. The fill gain was raised to 2.6 so shadowed scarps stay readable.
6. **i06, warm fill.** A Jupiter-shine fill colour for the map (`ConamaraSurface.Fill`), subtler striations, and small
   stones on hub ground.
7. **i07, matrix detail.** Thermal-contraction polygons and salt patches in the matrix. Pads keep a quarter of the
   metre-scale crust, so the ground is not glassy. The debris ramp is coloured as talus.
8. **i08, horizon view.** Added the `horizon` shot. Rafts are gameplay-scale, so they now fade out beyond the map (the
   125 m context printed single-sample raft spikes as dark cells). Coarse chunk levels take their normal over the block
   footprint.
9. **i09, plates script.** First comparison plates. The context outside the map no longer shows "confetti" relief.
10. **i10, wall close-up.** Added the `wall` shot at the workbench close-up framing, and more matrix clasts, including
    occasional 5–10 m ice blocks.
11. **i11, scan holes.** The Poisson density trim had left see-through holes in the wall sheets. `bake_cliffs.py` now
    closes interior holes (up to 160 boundary edges). Wall overlap went to 0.38, the scarp backing between modules is
    tinted to match the modules, the macro photo tier on walls is stronger, and deposits at a scarp foot keep their wall.
12. **i12, rock contrast.** Pale ice blocks against the dark matrix, frost-shattered debris on the plate tops, and
    lineae that fade near the ground.
13. **i13, checks and pin.** The plates mode now asserts drawn-height contact (4096 samples, under 1 mm) and the 500k
    ceiling for every shot. The region hash is pinned (see Tests).
14. **i14, ground photo.** The matrix's debris slot moved from dirty ice to angular gravel, with stronger macro tiers
    (1.25 / 0.9, near Cabeus's 1.35 / 1.0). The close camera now reads as gravel at Shackleton's crispness, not mottling.
15. **i15, horizon diamonds.** The 31 m sun-margin raster printed dark diamond cells on lit scarp faces and wall modules.
    On this map the gate is now `smoothstep(-3°, 0.5°, margin)`, and the shadow maps draw the near shadows.
16. **i16, approach.** Raft colour also fades beyond the map, and the wall range is 16 km, so stand-ins line the
    central scarps at the 14 km approach camera (270k triangles). This is the final plate set:
    `[path removed]` (`PLATES.md`).

## Floor pass (owner note: "slightly more pale", fix the floor texture)
Matrix floor only (hub ground, matrix, talus where it blends in). Six capture rounds, labels `floor-r01..r06`.
1. **r01.** No effect: the mode does not build, so it ran the old assemblies. Run `[path removed]` first.
2. **r02.** Matrix palette paler and colder; kilometre-scale frost swaths (pale, cool) and darker hydrated-salt ground in the
   shader; the debris slot moved from gravel to `dry_ground_rocks`. The straw was gone, but the close camera went soft and
   beige.
3. **r03.** Debris slot moved to the salt crust (`CeresSalt`, albedo 0.55). The ground is crisp and isotropic again, and reads as
   salt crust with grit. The run timed out under machine load, so use `--seconds=600`.
4. **r04.** The talus gravel is sampled at 10 m tiles (it was 1.8 m, and faded out before the close camera), with lower
   contrast. Salt albedo 0.5.
5. **r05.** Salt albedo 0.42. Footprint fade on the fine scarp-seepage octaves. `td_side_power` (biplanar exponent, default 4)
   is 9 on this map. Neither change removed the hair-like band on the raft-foot aprons at the gameplay camera, which was there
   before this pass too.
6. **r06 (final).** Matrix saturation back up a touch: matrix `(0.45, 0.36, 0.315)`, light `(0.55, 0.46, 0.40)`. Mean floor
   colour at the close camera went from HSV v 0.48 / s 0.41 (i16) to v 0.57 / s 0.33. That is paler and slightly greyer,
   and still rust-brown.

Cause of the straw: at 350 m a pixel is about 0.3 m. The gravel's true-scale tier (1.8 m tiles) is faded out there, so the
8× macro tier (gain 1.25) drew 1 m stones 2–4 pixels wide, foreshortened into fibres. The salt crust's macro tier draws
polygons and grit instead. The region hash is unchanged (rendering only); `REGION_CATALOG_PASS` and `europa-playable` pass.
Plates: `[path removed]` (`floor-before-after-*.png`).

## Far-LOD relief (2026-10-11, with map 2 round 2)
A shared fix for the far walls (they read as smooth vertical fluting beyond about 1.5 km). `bake_cliffs.py --relief-only`
wrote `europa_scarp.hrelief` from the unchanged kit: per wall module, LOD0's normal, AO and cavity in its front view.
`CliffWallField` draws LOD2/3 with it (easing to the module's facing at the curled side margins, normal x1.5 against mip
flattening). The cliff streak noise widens and calms beyond about 0.5 m pixels. Back faces seen through curled margins
shade as ice with neutral AO. The map's shadow settings (`shade_desat`/`shade_lift`) stay 0.

Check capture `chaos-r2` (all seven views) against the signed-off `floor-r06`: triangle counts, wall modules and rocks are
identical in every view. Mean pixel difference is 0.1–0.4 (out of 255) at the close, gameplay, approach, scarp and wall cameras,
0.8 at the horizon and 2.2 at the hero, where 3 % of pixels change: the mid-distance scarps show jointed relief instead of smooth
flutes (`[path removed]`). A first cut printed a thin dark seam
along a plate brow (back faces shaded as joints). It was fixed before the final set.

## Numbers (i16)
| View | Shown | Terrain chunks | Walls (tris / modules) | Rocks (tris / instances) |
|---|---|---|---|---|
| close 350 m | 490k | 296k | 130k / 627 | 64k / 1,792 |
| gameplay 2350 m | 490k | 269k | 130k / 692 | 91k / 4,699 |
| approach 14 km | 270k | 152k | 119k / 1,082 | 0 |
| scarp | 490k | 301k | 130k / 626 | 59k / 450 |
| hero | 490k | 274k | 130k / 753 | 86k / 4,162 |

7,279 modules are placed over 199 km of traced edge (5.7k walls, 1.4k toppled blocks and slabs). The wall budget is
130k, with the rocks clamped to what is left of 490k. Kit: 2.3 MB (`europa_scarp.hcliff`); layout: 1.0 MB.

## Tests
- `REGION_CATALOG_PASS` (all regions) with the v107 Europa block (`EUROPA_RIFT_PASS`): scarp drops p50 102 m, p90 127 m,
  4.3k barrier cells, both hubs buildable and connected by road, plate-top ice reachable only by a legal transfer up the
  debris ramp, and every other deposit road-reachable. v101–v106 still resolve to their pinned hashes.
- **Re-pin:** `europa.chaos_terrain` v107 = `1B4AE55C593D48A9D575CF64FA0D5EF713ABB1B787D5F13E7566B71BDC1DFF7E`. The reason
  is that new campaigns now found on the Conamara scarp field (ice-rift family B). The v106 pin is unchanged and still
  checked.
- `HELIOS_GAME_ONLY=europa-playable`: actual foundings on both v107 hubs, a rover-reachable yard, and save/load.

## Gaps against Shackleton
- Walls beyond about 1.5 km use the 420/110-triangle LODs and read as smooth vertical fluting, not jointed rock. Better
  far LODs (normal-mapped impostors) would close this. *Done 2026-10-11: the far LODs shade with LOD0's relief map (see
  "Far-LOD relief"); the coarse hulls' silhouettes stay.*
- The context ring beyond ±6 km is soft. The plates are there, but at 125–500 m sampling.
- Plate tops carry less per-pixel detail than Shackleton's cratered regolith; their texture is mostly lineae and fabric.
- The local morning sun is 16° high. Shackleton's grazing 0.6° sun gives it much longer, more dramatic shadows.
- At grazing angles, the outermost hub-bench blends still show a gentle ramp to the matrix.

## Reusable for maps 2 and 3
`bake_cliffs.py` takes any workbench GLB set: `--src`, `--kit`[path removed]`CliffLibrary` and
`CliffWallField` are kit-agnostic, and `ScarpEdges.Trace`/`Place` work on any signed-distance field. The rest carries
over too: the `ice-rift-plates` mode (`HELIOS_RIFT_REGION`, `HELIOS_RIFT_SHOTS`), `[path removed]`
(`--prototype`, `--pairs`), the region dump tool (`HELIOS_GAME_ONLY=region-dump`), `DebrisRamp` for steep-access
transfers up a scarp, and the `ConamaraLayout` planes format with its layout builder pattern.
