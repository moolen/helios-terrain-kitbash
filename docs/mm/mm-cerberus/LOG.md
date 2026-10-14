# mm-cerberus log (round 1)

Round 8 assembly follow-up: eight iterations `086-r8-i1` through
`094-r8-i8-checked` (093 is a rejected precheck inside iteration 8).
See [ROUND-8.md](ROUND-8.md) for review outcomes, exact R7 comparisons and
remaining issues. Final quality remains 60%; the accepted true-3D method is
preserved. Gameplay 491,568 triangles / 109,063 walls / 7,625 rocks;
processed assets 142.25MB. Export filenames remain additive.

Scene: Cerberus Fossae twin fissures, new region `mars.cerberus_fossae`, anchor A 10.30N 156.95E. Captures in
`[path removed]`.

## Setup
- Worktree `[path removed]` (branch `[path removed]`), page `mm-cerberus.html`, server on [port removed].
- Pipeline copied from `[path removed]` / `[path removed]` and adapted (no plumes, deposits, lava; Mars sky, haze, wall kit-bash).
- Data: the full HiRISE DTEEC_009280 strip is a 7.5 x 15.7 km COG at USGS (the io-data sample is a 6 x 7 km crop), so the
  1 m core covers the whole 12 km N-S extent (x -3.7 .. +3.3 km at the south edge, -2.2 .. +1.7 km at the north edge).
  Warped with GDAL straight into the scene frame. CTX mosaic (research) for the E/W margins.
- HiRISE vs CTX heights differ by 48 m (N) to 84 m (S): a relative tilt. CTX is moved onto HiRISE (quadratic fit on the
  plains, residual 2.7 m). CTX pair-mosaic seams showed as wavy metre-scale steps along the trough rims; CTX is
  smoothed over 32 m (it is layout only) and gets 1 m relief transplanted from the HiRISE strip.

## Wall kit-bash
- `wall_modules.py` unrolls straight wall runs of the Earth lidar into strips h[s, d] (depth below plateau vs distance
  from the lip; lip line smoothed so the metre-scale jaggedness of the real cliff stays). Columns where the unroll
  missed the wall are dropped (Dry Falls kept 851/1381, Malad 1017/1197, Snake 2374/3022). Kilauea 2018: polar unroll
  around Halemaumau, high-pass talus chutes on 29-44 deg slopes.
- First try: replace the profile by distance from the nearest lip (s from the nearest lip point). Rejected: s jumps at
  every wall bend (straight seams across the walls) and the module profile does not fit the real wall widths.
- Adopted: depth remap. D = plateau (1.6 km closing) - DEM smoothed 14 m; per module column the profile is smoothed
  heavily (150 m along d) and inverted, so new depth = E(Ms^-1(D)). Large scale follows the real wall (benches, the
  collapsed block, wall width); small scale is the Earth wall: crisp cliff band at the lip, ledges, blocky talus.
  s = Poisson-integrated wall tangent (continuous, no seams). Module variants (Snake x2.6, Snake x1.6, Dry Falls x2.4,
  Malad x2.8) are softmax-blended along s, each dominating a few hundred metres.
- Bad module columns first produced plateau-level "shelves" inside the trough (h ~ 0 at D ~ 130 m); fixed by the
  column filter.

## Iterations
- **it1 (001)**: first full pipeline on a coarse 48 m test mesh: page, Mars sky, haze, scatter work. Lighting flat.
- **it2 (002)**: 4-level plain-grid test mesh (6 m leaves) for fast looks while the real mesh bakes. Wall bands read
  as a uniform 140 m "fence" with a regular vertical comb (shader joints) and the 'cracked' layer made camouflage
  patches on the plains. Joints removed; plate exposure toned down; sun lowered to 16.4 h (elevation ~24 deg).
- **it3 (003)**: module variants (Snake x2.6 / x1.6, Dry Falls, Malad) softmax-blended along the walls. Profile check:
  the plateau closing sat up to 15 m above the rim plain and the remap pushed the plateau 20-30 m into the trough as a
  levee. Fixed by measuring and removing the closing bias on the gentle rim ground.
- **it4**: centred smoothing put each module's cliff at the middle of the real wall ramp (lip moved inward ~25 m).
  Trailing window alone carved every wall 60-80 m too deep and dug trenches into the floors. Adopted a hybrid: trailing
  window down to the module's band foot, centred below (profile plots in /tmp; base vs final: crisp band at the real
  lip, talus converging back onto the real lower wall and floor).
- **it5 (004-007)**: deposit moved onto the real collapsed-block bench (x -770, z -690, ~150 m below the rim; the
  research layout point was on its flank); haze 6.2e-5 -> 3.8e-5 /m (the overview washed out); kit review applied
  (chimney rocks dropped, Mastcam-Z one-sided rocks sunk 30 %); LOD3 rocks (~28 tris) so ~4.5 k rocks render at the
  gameplay camera within budget; bed contacts no longer orange stripes; streaks stronger; trails darker.
- **it6 (008)**: first real error-bounded mesh (6 levels, 7.3 M faces stored). bake_mesh copied the whole 12 k DEM per
  node (np.pad of the full array): fixed by cropping first (node bake ~4x faster). Real mesh: fissure hero reads as a
  fossa (cliff band, spurs, talus, dark sand floor); walls still a uniform "fence", close view smooth, rocks small.
- **it7 (009)**: found the reason for the uniform walls: the Neumann Poisson solve for s only returns the deviation from a
  uniform tangent field, so s was almost constant along straight walls (one module column everywhere, contour stripes).
  s = axis projection + Poisson deviation now. Walls vary along their length (buttresses, alcoves, module changes).
  Added the native-scale (1:1) lidar high-pass on the cliff (metre-scale crags the 1.6-2.8x scaling loses), first
  with a ping-pong along d (made wavy contour lines across the talus), then aligned to the module rows with a fade
  below the module foot. Talus chutes x2.8 (Kilauea). Depth smoothing 8 m (4 m let HiRISE TIN squares through).
  Talus rocks concentrated at the band foot.
- **it8 (013)**: real mesh with the fixed walls: close and wall heroes now show a crisp layered cliff band over a
  bouldery talus with chutes. But the band was a smooth, too-regular "dam wall", gameplay scatter was 565 k triangles
  (912 k total, over budget), and the talus mask started 80 m below the band foot (band-end constant in the wrong
  units), so the foot had almost no blocks.
- **it9**: spur-and-gully rhythm (smooth noise along s scales the upper-wall depth by +-30 %, after the 017719 spur
  spacing), native lidar crags x2 (high-pass 4 m), s now bilinear at 1 m (2 m blocks left dotted stair-steps).
  Talus band end fixed (75 m); talus blocks 1.4-9 m concentrated at the foot; scatter pixel threshold 1.5 px.
  Shader: beds vary along the wall, faint dust streaks down the cliff face.
- **r1 (015)**: slope streaks off (grey dashes), apron albedo x0.86 (square edge), rock pixel threshold 1.8 px
  (gameplay 489 k at 1672 x 941), deposit view lit at 13.6 h. Export written. See ROUND-1.md.

# Round 2 (review: curtain cliff faces, smooth talus, budgets, lip, map edge)
Quiet hours: every bake and capture under `flock [path removed]`, one at a time. Captures `016-r2t1` .. `0xx-r2`.

- **r2-1 (016)**: kit wall modules (snake-a/b, malad) placed along the lip contour (`cliffs.py`, 250-317 modules,
  yaw from the depth gradient, scale from the local drop, top tucked under the rim) with the terrain under them
  pushed back. Result: castellated row of separate blocks, own talus aprons hanging as curtains, hollow side cuts.
- **r2-2..5 (017-020)**: apron cut, side trims, 45 % overlap, ends folded back into the plateau, plateau side
  flattened under the rim, vertical stretch so the feet sink into the talus. Still reads as a row of boxes at the
  gameplay camera, and the modules have the same problem as the terrain: they are heightfield extrusions, so their
  near-vertical faces are long stretched quads with vertical streaks (also noted in the kit review). Kept as an option
  (`?modules=1`, `cliffs.py`), not the default.
- **r2-6..8 (021-023)**: new `ribbons.py`: the cliff band is cut out of the heightfield and meshed on the wall
  itself (columns every 2 m along the real lip, rows every 1.5 m of depth; 283 segments, 2.9 M grid vertices,
  17.5 MB uint16). The band shape per column comes from the rebuilt wall (HiRISE plan + Earth-lidar profile),
  inverted to offset-vs-depth, plus procedural stacked flows keyed to elevation: hard beds stand out, rubbly flow tops
  notch back (ledges), rounded columnar grooves in the massive beds. Terrain behind the band is trenched to the band
  foot (hidden), so the heightfield can't poke through and the terrain mesh loses its near-vertical detail there.
  Drawn joint/contact lines removed from the cliff shader (they made a "circuit board" maze); the geometry carries them.
- Lip fix (`walls.py`): where the unsmoothed DEM is still within ~2-5 m of the rim plane, the real surface is kept, so
  the rebuilt cliff starts at the real lip.
- Talus: blocky scree (pebbly soil + dust-mantled bedrock at two scales), dark basaltic sand down the gullies, dust on
  the spurs (from the fine topographic position); big talus blocks 3.5-13 m (new scatter group), ~1,700 fall
  boulders with trails; rocks graded 42 % toward a dusty talus colour with dustier tops.
- Thermal cells: warm-tinted dust-free floor patch, faint rising vapour (GPU points, 260 per cell, analytic motion).
- Map edge: the last 600 m of the map blend to the apron's colour; normal-map detail fades over the same band.
- Budget: plains nodes without walls get a 3x looser error target (adaptive LOD); leaf error 1.1 m; export height in
  3 cm steps (98 MB instead of 128 MB).
- **r2-9 (024-026)**: the round-2 mesh bake was cut off once (rate limit while it held the lock); re-run detached:
  13.0 M faces before pruning. `prune_mesh.py` drops level 5 under every level-4 node with <= 4 m error (plains):
  4.8 M faces stored, mesh 157 -> 70 MB. Browser masks as lossless WebP (masks_a 18.6 -> 15.4 MB, masks_c 10.3 ->
  6.8 MB). Terrain LOD threshold 1.7 -> 3.6 px and rock threshold 2.2 px: gameplay 496 k at 1080p.
- **r2-10 (030-043)**: the talus read as marbled wood grain at the close camera. Bisected with debug views: (1) the
  pebbly-soil and bedrock scans magnified 2-4x turned their mud cracks into contour loops, (2) the elevation-keyed
  wall bedding leaked onto 30-40 deg talus through the cliff mask noise and the band mask, (3) a per-pixel
  normal-derived streak frame rotated the large world coordinates into swirls. Fixed: scans at their own scale only,
  cliff mask without elevation noise and band shading only above ~45 deg, fixed along-trough streak frame. Trail
  polylines thinned to 3 m vertex spacing.

# Round 3 (Codex continuation; at most eight iterations)

- **r3-1, changes prepared / bake queued:** corrected unbaked handoff format 2 so each column ends at its own band foot; native-scale Snake/Malad offset patches and derivative normals; bedding gain zero; structured collapse/alcoves/pillars. Lip inversion excludes the artificial plateau-padding interval. Deposit changed from radial/noise-threshold blotch to connected terrain exposure. Talus removes noise-based colour patches and cracked-mud normals, retains stronger native scree normal and adds small scan-mesh debris. CTX clean cells retain 10 m filtering (32 m on disagreement cells). Lossless gzip mesh packing with backwards-compatible browser decode. Full prep-to-export bake under shared flock, PID 666359; syntax checks pass after fixing a local variable collision; production build passes. Will judge only after all six captures.
- Before r3-1 bake acquired the lock: fixed another handoff geometry issue—an alcove apron used max(old terrain, cone), leaving the old plateau blocking recessed faces and preserving the original wall in collapsed sections. The upper apron now replaces that terrain and joins back onto measured lower talus over 160 m; default cliff faces themselves are not smoothed.
- r3-1 instrumentation: the old total omitted boulder-trail triangles and the context apron. Added camera-frustum accounting for both, plus tiled trail LOD (3/9/24 m sampling, culled beyond the shader's 2.6 km fade). Subsequent reported totals include all these geometry groups. This means old round-2 totals are not directly comparable. Production build passes; full scene visual verification still pending the bake/capture lock.
- r3-1 scheduler: finest tiles are now scheduled after their parents, only when the parent error exceeds the existing 4 m prune threshold. This is equivalent to the final previous bake/prune selection, avoids baking soon-deleted tiles, and keeps all required wall children.
- r3-1 native talus detail: existing Kīlauea lidar strip high-pass at 1.5 m, gain 1.0, placed at native metre scale only on lower apron cells. Added before final DEM/maps/scatter, so rock bases and exported heights follow it. Cliff faces excluded.
- r3-1 counting follow-up: match Three.js sphere culling for terrain/ribbon/apron/trail meshes; rock batches select instances against the camera frustum with a 64 m shadow margin, and the counter includes every submitted rock instance. Camera rotation also refreshes the selection.
- Orchestrator steering during the first mesh bake: use one lock per heavy step/capture run. Paused only our own chain parent, let its mesh child finish under its existing lock, then release it before individually locked prune/pack/export/capture. Updated run_all.sh so every DEM, mesh and capture step takes its own lock by default. Future runs must not wrap the whole chain in flock.
- Asset scope: BRIEF caps all processed assets, excluding export. Added masks_a.png / masks_c.png under export (new files, identical pixels), removed their redundant processed maps/ copies, retained browser lossless WebP. Updated exporter references and added PNG/WebP equality validation. No existing export file renamed.
- **r3-i1 (046), rejected:** all six cameras captured and inspected against HiRISE, CTX-derived hillshade, Malad Gorge and rover PIA24816. Colour integrates better and deposit noise is reduced, but new lip needles / shelf breaks and a fine dotted/grid talus pattern are obvious. Quality about 50%, a regression. Full 1080p gameplay is 717,385 camera triangles; processed assets 163.24 MB, browser 154.72 MB. Export mask equality and height decode pass (max 0.01504 m). Cannot close the round in this state.
- Diagnosis (047, seven fixed-camera probes): hiding ribbons leaves the terrain needles; disabling scan normals reduces the talus dots; mesh normals expose the wrong backing geometry. Local source inversion can turn a shifted plateau datum into ~20 m false shelves. The 2 m rewrite stamped 2x2 blocks, retained old 1 m wall residuals, and filtered the delta so old 2 m wall residuals survived too. Projection gaps also retain old backing. Ten focused regression tests cover the source/profile and full rewrite seams; the failing cases were observed red before the fixes, then passed (debug/test_face_profile.py, test_terrain_rewrite.py).
- **r3-i2 prepared:** local steep-edge origin for native face patches, preserved original along-source metre coordinates after unroll filtering (missing/short columns copied from neighbouring measured columns, explicitly procedural continuation), 1 m near-face columns with distant spacing retained; continuous backing/apron target reconstruction, old residual removal and small coverage-hole fill; talus scan normal gain 2.4 -> 0.8. No cliff-face smoothing. Rebuild from modules through export, each heavy step taking its own shared lock.

- Before r3-i2 ribbons: the high-pass-on-stretched-macro-profile approach still fell short of the requested 1:1 faces. Changed to full native offsets with one horizontal translation, preserving measured edge irregularity; band height now crops the finite Snake/Malad patch without scaling. Backing and pillar feet use that same full profile. Two additional physical-profile tests failed before this change and now pass; all ten focused regressions pass.

- r3-i2 lossless budget work: MMD3 mesh packing (stride-3 uint16 modular delta, low/high byte planes, gzip), choosing the smaller of it and plain gzip per level. Real L0 sample shrank 138,449 -> 100,844 bytes. Browser and Python restore nine fixtures/encodings exactly, including real L0; packed-level SHA256 validates the full baked files. Auxiliary buffers remain gzip. Legacy [path removed] remain supported.

- r3-i2 rendering: detached pillars were one map-wide mesh, submitting every pillar whenever its global sphere touched the camera. Split identical pillar geometry into 512 m batches for normal renderer/frustum culling. Counter still includes every submitted batch triangle. No pillar removed or softened.

- **r3-i2 (048), reviewed all six:** assets now 119.16 MB processed / 110.64 MB default browser; 1672x941 gameplay 338,839 triangles. Native height P10/P50/P90 13.17/35.76/64.44 m; 12,404 eligible columns collapsed; 99 pillars. Mesh stores 5.44 M faces across all LODs (7.84 M before), with exact lossless packing. Needles are greatly reduced, but smooth tall walls/talus, dark lip seams and shelf-like panel joins remain obvious. Quality about 60-65%, not a finish pass. 1080p measurement/validation queued. Next diagnostic run isolates native faces from backing and compares their elevations, to test whether the short 160 m talus join leaves the older stretched wall visible, whether backing occludes the native patches, and whether texture normals cause the remaining fine grid.

- Pending r3-i3 source correction: a new physical-height regression showed that aligning every native column at its first steep step erased a measured 12 m upper ledge (expected offset difference -2.4 m at 30 m depth, got 0). The extractor now uses the sampled plateau datum and starts at its last flat sample before the steep step, preserving native ledge heights. The test was observed failing before the change; all twelve geometry/codec regressions now pass. Current 048 assets remain the previous extraction until the next bake.

- r3-i2 diagnostics (049): hiding terrain shows the native band is thin and has shelf-like joins; hiding ribbons leaves the large smooth lower-wall/talus shape. Numeric probe finds backing below >99% of near-wall face samples, so widespread burial is rejected. Texture-off barely changes the fine grid. 1080p gameplay: 410,651 triangles, 2.48 ms/composer frame, 358.7 uncapped rAF fps; all mesh SHA256, mask equality and export-height checks pass (0.01504 m max error).
- Shadow diagnostic (050): CSM ignores the supplied shadowNormalBias constructor field, but applying .6 / 2.0 to actual lights does not remove the grid; neither does disabling shadows. Shadow acne is rejected as the main cause. Lossless GN patch versus JPEG is queued (051).
- Pending r3-i3 lip closure: a physical cap/backing test failed because full retreat at the rim left the backing six metres below the plateau under the three-metre cap. The backing retreat now fades in through the first eight metres of depth; full retreat remains below, and native face geometry is unchanged. All fourteen geometry/codec regressions pass.

- r3-i3 prepared / queued, PID 843501: preserve native ledge heights; close the backing under the lip cap; Kīlauea lower-apron relief keeps features through 6 m (gain 1.0, previously 1.5 m); new angular scree group 0.8-2.6 m and 25% more large talus blocks. Extend native face placement to shallower ≥55 m fossae at CTX margins (was ≥80 m), still cropping each band to the available local drop. Earth detail transplant remains explicitly labelled; CTX source resolution remains 20 m. Each heavy step has its own lock. GN diagnostic is queued ahead of this bake; normal-map changes depend on its result.

- GN diagnostic (051, all three inspected): the grid largely disappears with a lossless normal patch of the same DEM; mesh-normal-only shows coarse geometry and does not provide an acceptable substitute. JPEG normal-map compression is the identified grid cause. Iteration 3 now bakes lossless normal_2m.webp and records decoded RGB SHA256, with full-file equality validation. Browser build passes.
- Pending next round: bending native face offsets around a curved Mars lip stretched a 1 m source interval to about 1.5 m. A physical metric regression failed before the change and passes with rigid 80 m patch frames. Eight-metre joins interpolate only the authored placement; source profiles remain unchanged. This implementation was prepared after iteration 3's ribbon step, so iteration 3 does not contain rigid frames. All fifteen focused regressions pass. Apply and review this as round 4 after closing round 3.

- Normal-map budget follow-up: full RGB lossless WebP was 57.79 MB, over the processed-asset budget. Per-pixel octahedral RG7 removes block compression while retaining measured geometry. A precision test exposed unnecessary second quantization when 7-bit codes were stretched into bytes; storing codes 0–127 directly and decoding that range fixes it. Hemisphere orientation, unit length and <2° angular error pass on 10,000 test directions. Actual whole-map angular error and file size are measured by debug/pack_normal.py; reduced shading precision is explicit in credits/export. All fifteen current regressions pass (rigid frame metric is reserved for round 4).

- Iteration 3 normal packing measured 33.416 MB, angular error P50/P95/P99/max 0.4257/0.9264/1.2972/1.8883°. No spatial filtering or geometry change. The normal map's final encoding is octahedral-rg7-upper, rather than the intermediate 57.79 MB RGB WebP. Optional old wall GLBs also pack losslessly in place; their decoder and SHA256 validation retain the optional view.
- Iteration 3 mesh completed: stored triangles L0..L5 = 16,000 / 52,016 / 198,070 / 787,006 / 2,372,340 / 1,602,952; total 5,028,384. Gameplay count and visual review still pending final captures.

- Round 3 closed at 62% after all six 052 images were inspected. 1080p gameplay 496,896 triangles, 2.33 ms render / 352.1 rAF fps; processed 146.86 MB, default browser 139.87 MB. Exact mesh/auxiliary/normal/mask/export validation passes. 053 comparison shows RG7 adds to the fine grid; RGB lossless retains more natural surface detail. Tall curtains and smooth steep walls still visibly fail. ROUND-3.md and additive export review_round3.json record the result.

# Round 4 (second and final continuation round; up to eight iterations)

- Prepared r4-i1: rigid 80 m native-source panels with 8 m authored joins; alcove amplitude 22 -> 45 m, amphitheatre spacing 900 -> 600 m, collapse threshold .22 -> .32. Native source profiles are not stretched or smoothed. The physical interval regression now passes.
- Steep lower wall surfaces previously excluded rubble above 45° and scatter above 40°. Extend measured Kīlauea rubble relief to lower walls up to about 75°, explicitly excluding native face coverage. Add embedded 1.5–7 m Ramon/AA/PH07 scan fragments, aligned normal to the actual DEM and partly buried; their size and placement are procedural, not Snake/Malad lidar. A Three.js rotation regression validates actual bake/runtime axes.
- Higher precision normal encoding RG8 (rather than RG7), with no spatial smoothing or block compression. Exact MFB4 float-field byte planes save 6.41 MB on iteration-3 buffers; all original bytes are retained in Python/browser tests. Eighteen focused tests and production build pass.
- Optional gzip GLB view validated in 054: loads all modules, no browser errors. It still looks boxed and exceeds the main budget (562,912 triangles at 1672), so it remains a comparison only, not a finished variant.

- Before r4-i1 ribbons: projected ray samples were assigned to 2 m cells using the sample's height instead of the actual cell centre coordinate. On a 33° oblique plane with slope 3 this introduced up to 3.7266 m per-sample height error. The physical plane regression failed before the fix and passes after evaluating each target cell centre; all nineteen focused checks pass. This removes geometric aliasing rather than smoothing walls. Paused only our own chain parent while its wall child finished, then resumed before the ribbon step.

- r4-i1 complete: six 055 captures inspected against HiRISE, CTX-derived hillshade, Malad Gorge photograph and PIA24816. Quality 64%; new scan fragments help, but cloth walls and fine grid remain. Gameplay 653,835 triangles at 1080p; processed 157.92 MB / default browser 150.94 MB. Exact validation passes, including 0.01504 m height error; RG8 maximum angular error 0.9375 degrees.
- r4-i2 running, parent 878426 (pipeline child 878448), log codex-r4-i2.log. Try Mars base DEM instead of amplified depth-remapped lower-wall backing; preserve native face scale. Retire unused boxed comparison payload and pack unused texture slots 3/6 interiors, retaining 16 px borders. Active texture pixels remain exact; together this removes about 9.35 MB. All old export filenames remain. New variant must be rejected if it visibly softens walls. Runtime asset backup of iteration 1 is outside public in round4-iteration1-assets.

- r4-i2 complete: six 056 images inspected. Kept Mars backing for rougher lower apron and fewer artificial lip runs. Quality 66%; curtains/grid/CTX margins remain. Gameplay 604,866 triangles, processed 126.08 MB; exact validation passes.
- r4-i3 closed: 5.2 px default terrain LOD; frontend build, exact repacking (all 9 decoded hashes unchanged), export refreshed, all six 057 captures inspected. 1080p gameplay 437,344 triangles, processed 126.08 MB / browser 126.07 MB. Nineteen tests and all final validation pass. ROUND-4.md and additive review_round4.json/JPEGs record 66% quality and unresolved visual problems. Second permitted continuation round completed; no third round.

# Round 5 (one additional owner-authorized focused round)

- Closed after eight iterations, including two previews and the rejected/aborted candidates documented in ROUND-5.md. Shared physical rows, corrected cropped backing, native steep-window selection, coherent authored flow crops, sharp facet normals, side-texture gradient/mip fade and bounded [path removed] LOD. No new native-face spatial blur.
- Six final 065 captures inspected; no browser errors. Gameplay at 1080p: 497,303 triangles, 3.70 ms composer / 205.6 uncapped application fps on RTX 4070 SUPER. Processed 132.17 MB / default browser 132.16 MB; camera, export retention, shared rows, hashes, masks and height checks pass (0.01504 m maximum PNG error). Thirty-one focused checks pass.
- Honest quality 62%, down from 66%: cap and texture sampling improve, but artificial regular flow ledges/grid, repeated vertical relief, smooth lower curtains and some triangular/serrated pose joins remain. Earth 1 m top-down DTM is not a fracture/overhang scan. Additive export review_round5.json and final JPEGs preserve evidence. Final commit is written to STATUS-R5.txt after the scene commit. No ninth iteration.
