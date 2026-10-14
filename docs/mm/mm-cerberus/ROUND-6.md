# mm-cerberus, round 6: true 3D scan walls

Eight iterations completed. The round ended at an honest approximately 55%,
so work continued into the second authorized round. Real 3D columns finally
replace the failed top-down DTM faces, but joins, coarse silhouettes and
debris contact remain visibly inferior to the photographic references.

Review: [endpoint removed] All six review cameras,
lighting parameters and the Mars metre frame are pinned to round 5. Captures
and gameplay budget checks use 1920×1080.

The acquired sources and primary licence evidence are in
[WALL-SOURCES.md](WALL-SOURCES.md); [CREDITS.md](CREDITS.md) preserves their
authors and all historical sources. The final round-6 kit uses six Cape
Stolbchaty crops (Mikhail Volkov, CC BY 4.0) and three Devils Postpile crops
(Matthew Strong, CC BY-NC 4.0). The initial Iceland/Réunion kit was rejected;
Palisades diabase remains an unused backup. Source units are uncalibrated. Metre scaling,
selection, crop boundaries, material grading, module poses and the hidden
backing/talus reconstruction are authored, rather than observations of Mars
columns or measured basalt stratigraphy.

Blender bisects actual scan surfaces while retaining original UVs and node
transforms. Quadric decimation keeps independent meshes at approximately
20k/5k/1.2k triangles, plus a coarse budget fallback; a source with fewer triangles is not inflated
to meet the largest target. High-scan facet normals and ray-traced AO are
baked onto every LOD, with colour desaturated and graded to dark Mars basalt
and dust on upward ledges. No cliff face is smoothed or generated from a
heightfield. World-metre triplanar detail uses the already credited CC0
dark_rock_02 photographs above baked scan macro colour, with rotated/offset
samples and a pixel-footprint fade; it does not invent fracture geometry.

The final placement traces 38 lips from the real Mars base, placing 1,736
pieces deterministically, with 514 authored talus chutes. Tall walls stack
overlapping 100–139.9m pieces, avoiding extreme vertical scale. Narrower panels fit turns; positive XYZ scales
preserve correct normal transforms. Tops sit under the lowest plateau sample
across their span. Covered raster cliff-band interiors are removed from the
terrain geometry and old ribbons are retired from the active scene. Residual
recessed joins use the true outward direction and neutral basalt. The
heightfield serves the plains, floor and reconstructed backing/talus, with
already credited rubble relief retained on the apron. Dedicated scan boulder
clumps follow the module feet.

The ordinary GLB kit and explicit placement JSON are additive exports.
Native HCL1/HRL1 libraries and equivalent Godot Transform3D poses also match
the existing CliffLibrary/CliffWallField formats. The prototype loads a
losslessly packed GLB; the exported GLB is ordinary uncompressed glTF binary.
The game repository is unchanged.

Every heavy step holds `[path removed]` separately. A capture browser
closes before the next starts. No unrelated process is killed.

## Iterations

Each numbered iteration below has six fixed-camera captures. Failed startup
and premature pipeline captures are explicitly excluded from the final review.

### R6 iteration 1 — rejected, about 40%

Six captures: `066-r6-i1-*`, 1920×1080. Gameplay 465,171 triangles
(156,469 terrain, 199,157 rocks / 6,571 instances, 109,411 scan walls,
134 trails), no browser errors, 60 Hz capture. Processed assets 164.47 MB:
over the 150 MB limit. Close camera exposes oversized Réunion column forms,
large raster talus wedges, panel gaps and open white holes. Unlike the
HiRISE crop, the wall footprint breaks into strips; unlike the actual Snake
River Blue Lakes photographs, the ribs have neither credible scale nor
continuous debris contact. Reject. Next: coherent Cape Stolbchaty scan,
excavate the obsolete terrain band, interpolate loose-debris contact,
bury scan feet and close tiny scan/placement gaps with recessed neutral
backing. Keep the established ground topology to reduce hidden-face storage.

### R6 iteration 2 — rejected, about 45%

Six captures `067-r6-i2-*`. Assets now 146.64 MB, but gameplay 581,481
triangles (241,636 ground, 230,516 rocks / 7,521 instances, 108,975 walls,
354 trails). No browser errors; 60 Hz capture. Some white openings close,
but the foreground still has sharp, impossible terrain wedges and the scan
faces read as hanging sheets in broad gaps. Cape texture detail does not
rescue the footprint. HiRISE shows continuous scarp/talus junctions; Snake
River shows coherent fractured ribs, not exposed smooth backing strips.
Reject. Differential ground-only / scan-only captures will locate the
remaining geometry error before further placement changes. A tangent-frame
V convention mismatch was also identified for the next normal bake.

### R6 iteration 3 — rejected, about 55%

Six captures `068-r6-i3-*`; gameplay 556,119 triangles, 7,013 visible rocks,
108,975 scan-wall triangles. Assets 145.54 MB. The signed-distance apron and
correct skirt identification remove the giant terrain wedges. Regression
profiles now pass below the contact; the sharp lip step is intentionally
excluded from that debris check. Remaining failures are continuous white
foot gaps, broad smooth backing strips, and a wall shape unlike the fractured
Snake River ribs. HiRISE's continuous cliff-foot junction is not reproduced.
Next: preserve talus up to its actual contact (the scan bottom is buried 25 m
below it), put backing behind all scan vertices, correct glTF tangent V, and
allocate fewer triangles to distant loose ground. Postpile crops are added
to the kit as genuine extrusive columnar-flow options, with CC BY-NC credits.

### R6 iteration 4 — rejected, about 60%

Six captures `069-r6-i4-*`. Gameplay 573,210 triangles, 7,013 visible rocks,
108,975 walls; assets 146.89 MB. Foot gaps close, and the nine-module GLB and
native HCL1/HRL1 contracts pass independent counts, indices, source licences,
textures and world-pose checks. All 28 earlier export files and the six
camera settings remain. Postpile facade indices were inward-wound and are
repaired; its emissive/slick viewer material is discarded. Smooth vertical
strips still dominate between rough scan patches, and the talus is too even.
Neither the HiRISE cliff-foot morphology nor Snake River's coherent fractured
ribs is achieved. A second layer probe distinguishes terrain remnants from
scan closures. Next: Postpile participation, better terrain cut classification
and a coarser gameplay ground allocation. Source walls keep independent LODs.

### R6 iteration 5 — rejected, about 55%

Six checked captures `071-r6-i5-checked-*`; gameplay 500,571 triangles,
7,022 visible rocks, 109,426 walls; assets 147.05 MB. The earlier `070` close
capture encountered a JavaScript syntax error and is excluded from visual
evidence. The corrected build passes, but the checked close and wall images
contain large black screen rectangles: ready/error status alone did not catch
the rendering failure. Postpile participation finally exposes real columns,
yet pale shards, smooth retained raster strips and stretched scan colour
remain. This still fails both the continuous HiRISE scarp contact and Snake
River's coherent three-dimensional fractured ribs. The owner independently
identified the black rectangles, pale edge shards and stretched slivers.
Fixed-camera toggles reproduce the black failure with walls and bloom;
disabling either removes it, without WebGL context loss or GL errors.
Investigation continues before iteration 6 is accepted as render evidence.

### R6 iteration 6 — rejected, about 60%

Six captures `072-r6-i6-*`, including the previously failed close/wall views.
Finite explicit tangents on every library LOD remove the undefined shading
and bloom tiles while bloom remains active. The black-region regression
rejects iteration 5's wall image (1,431,143 connected black pixels); these
captures pass. The terrain exclusion now reaches behind the obsolete raster
step, and ground masks/horizons are refreshed. Gameplay 517,128 triangles,
7,757 visible rocks, 109,426 walls; assets 153.04 MB: both total and storage
budgets fail. Visible pale holes and jagged hanging strips remain, especially
on the near lip. Snake River has coherent fractured volume and HiRISE has a
continuous wall-foot contact; this scene still lacks both. Next: retain side
facets/undersides, seal all decimated cut boundaries with dark authored caps,
reject collapsed slivers, then address world-scale surface detail and tall
piece stacking. The image regression is retained in the capture path.

### R6 iteration 7 — rejected, about 60%

Six corrected captures `074-r6-i7-checked-*`. An initial `073` full-frame
failure was a startup error, not a repeat of the bloom bug: the new capped
meshes omitted explicit GLB normals. The exporter now requires normals and
the loader validates required attributes. The complete captures have no
browser errors and pass the black-region check. Full source side facets and
undersides are retained; collapsed slivers are discarded, ragged boundaries
receive neutral dark caps, and world-metre triplanar CC0 basalt detail overlays
the scan colour without stretching with a module. Gameplay 517,253 triangles,
7,757 visible rocks, 109,551 walls; assets 152.52 MB. Broad low-detail pieces,
pale gaps and coarse hanging silhouettes remain. Both HiRISE's continuous
contact and Snake River's coherent buttress/joint structure still fail.
Next: ray-classify pale gaps, cap vertical scaling at 1.4 through stacking,
add irregular talus chutes, and allocate LOD detail across nearby panels.

### R6 iteration 8 — rejected, about 55%

Final six captures `076-r6-i8-final-*`, after all asset steps finished.
The earlier `075` captures ran before scatter/export completion and are
diagnostic only. The new layout has 1,736 scan pieces in overlapping stacks,
each 100-139.90m high (vertical scale at most 1.399), and 514 irregular
authored debris chutes. Geometry stays sharp. Gameplay 519,526 triangles,
7,836 visible rocks, 109,729 walls; assets 142.51 MB. Per-pixel RG7 ground
normal precision makes storage room without spatial filtering; scan normals
remain separately baked. The 16px rock LOD1 change has no useful gameplay
effect because gameplay rocks occupy the lower LODs. The columns and debris
are visible, but stacks expose hard artificial joins, sky holes and broad
flat shadows. HiRISE has continuous wall/ground contacts; Snake River has
coherent ribbed volume. This result still fails that comparison. The targeted
bright-pixel ray probe confirms the pale shards are sky holes with no mesh
intersection. Round 7 is used for these remaining failures; 80% is not claimed.
