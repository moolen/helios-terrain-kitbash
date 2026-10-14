# mm-cerberus, round 7: scan volume and contact repairs

Eight iterations completed in this second authorized round. Final quality
is an honest approximately 60%; the 80% threshold was not reached. All six cameras and the metre frame
remain pinned; images use 1920×1080. Round 6 ended below the threshold, with
sky openings and poor coarse silhouettes despite real scanned columns.
Source licences and authored scale limits remain in CREDITS.md and
WALL-SOURCES.md. The round stops at eight iterations, or earlier only if the
captured result honestly reaches 80%.

### R7 iteration 1 — rejected, about 60%

Six captures `077-r7-i1-*`; gameplay 501,622 triangles, 7,836 visible rocks,
109,321 walls. The buried backing continues below the scanned crop, and
the lowest 48-triangle LOD is decimated from the capped 3D volume rather
than a twelve-triangle scan skin plus many closure triangles. The lower rock
LOD2 threshold changes from 5 to 6.5px while instance visibility remains.
Some gaps close, but bends and upper contacts still expose sky. Hard stacked
seams, broad flat shadows and noisy normal detail hide the coherent columns.
Unlike HiRISE, contacts are broken; unlike Snake River, the ribs do not form
convincing irregular buttresses. Next: recessed lip-following join meshes
within the same total wall budget, then isolate scan normal detail.

### R7 iteration 2 — rejected, about 55%

Six captures `078-r7-i2-*`; gameplay 502,185 triangles, 7,836 visible rocks,
109,884 total walls, including the new recessed join field. The 253 authored
join chunks close many openings, but their initial material incorrectly used
sRGB byte values as linear PBR factors, making them pale. Actual bright-pixel
raycasts distinguish those faces from remaining sky holes. Geometry-only
normal-map probes show the original scan's column joints much more clearly
than full-strength baked facet normals. Compared with HiRISE the contact is
still broken; compared with Snake River the surface reads as assembled sheets.
Next: correct linear colour, extend the plateau underside cap behind the
terrain exclusion, reduce normal-map gain, and retain rock visibility while
reducing distant rock triangle detail.

### R7 iteration 3 — rejected, about 60%

Six captures `079-r7-i3-*`; gameplay 498,924 triangles, 7,836 visible rocks,
109,647 total walls. Every capture passes the black-component regression and
has no startup or browser errors. The underside cap now spans -96 to -1.5m
from the lip, and join colour matches dark basalt in linear space. Bright-pixel
raycasts find only one small remaining sky opening in the sampled wall strips;
the other selected pixel hits gentle terrain. Normal-map gain is 0.35, keeping
all scan vertex positions sharp. Rock LOD2 starts at 7.5px; visibility is unchanged.
Gameplay fits the budget, but close/fissure views expose flat cut planes and
stack seams. HiRISE has a more continuous irregular lip, while Snake River's
buttresses have coherent ribs rather than this patchwork. Next: export finite
tangents and then reduce overlapping module density to spend more of the wall
budget on actual scan joints.

### R7 iteration 4 — rejected, about 60%

Six captures `080-r7-i4-*`; gameplay remains 498,924 triangles / 7,836 rocks /
109,647 walls. Processed payload is 144.27 MB. Explicit finite, orthogonal
TANGENT accessors and normalTexture.scale=0.35 now live in the ordinary GLB;
the renderer uses them rather than recomputing an undefined derivative frame.
Black-component checks and browser error checks pass. This transfers the
render repair to the exported asset without claiming a visual improvement:
close and wall views still contain broad flat cuts and obvious tiers, unlike
the continuous HiRISE contact and fractured Snake River buttresses. Next:
wider straight modules with less overlap; keep narrow corner pieces and
rebuild debris/scatter/joins before capturing.

### R7 iteration 5 — rejected, about 60%

Six captures `081-r7-i5-*`; gameplay 499,825 triangles, 7,859 visible rocks,
109,663 walls. All browser and black-component checks pass. Wider straight
sections with 18% overlap reduce the map to 1,424 stacked pieces; turns retain
28% overlap and narrow panels. The closure field contains 249 chunks / 13,854
triangles within the wall budget. The overview improves, but close and fissure
views still reveal rectangular tiers and flat recesses, unlike Snake River's
coherent fractured ribs. HiRISE's continuous lip is approximated, not matched.
The talus retains visible long stripe relief. Inspection finds that the clipped
round-5-final minus Mars-base residual includes failed wall geometry, not just
rubble. Next: replace that residual with the separately credited native Kilauea
fine-rubble strip and reject tiny detached scan reconstruction fragments.

### R7 iteration 6 — rejected, about 60%

Six captures `082-r7-i6-*`; gameplay 497,710 triangles, 7,790 visible rocks,
109,663 walls. Processed assets 144.84 MB. The active apron now uses the
separate Kilauea fine-rubble strip at native metre spacing, high-pass 6m and
clipped to ±1.8m, rather than clipped obsolete wall offsets. The scan-fragment
audit rejects no additional detached pieces in these already selected crops;
this rules out loose source fragments as the main cause of the large flat
shapes. HiRISE's plan/contact is more continuous, but residual talus stripes
and rectangular tier joins remain; Snake River has much more coherent ribs.
An independent exported-accessor regression fails on zero vertex normals,
which the runtime had been guarding. Next: repair those exported normals from
an incident geometric face, increase the coarse closed-volume LOD to 64 faces
using the reduced placement count, and measure uncapped performance.

### R7 iteration 7 — rejected, about 60%

Six captures `083-r7-i7-*`; gameplay 497,930 triangles, 7,790 visible rocks,
109,883 walls. Coarse closed volumes now target 64 triangles. Zero exported
normals are repaired from a strongest incident face, preserving all vertex
positions. The full uncapped harness measures gameplay at 2.15ms/composer
frame and 274.1 app frames/s on the RTX 4070 SUPER; the six render measurements
range 2.10–7.31ms. Capture fps=60 was a refresh cap, not that measurement.
The scene is comfortably fast but the close result remains below 80%: flat
caps, tier seams and coarse distant ribs differ from Snake River's continuous
fractured buttresses and HiRISE's irregular lip/contact. Next, the final
iteration: close small interior scan holes locally instead of stretching
their boundary caps to the distant backplane, compress photographic lighting
contrast, and correct the counter that reported only the final postprocess call.

### R7 iteration 8 — final, about 60%; iteration limit reached

Final six captures `085-r7-i8-checked-*`, 1920×1080. Small internal scan holes
receive local recessed caps instead of long triangles to the backplane;
photographic luminance contrast is compressed before Mars grading. A final
accessor/winding audit found 1,026 authored join triangles opposing their
supplied normals. The regression failed before repair, then passed after
index reversal. `084` is the pre-validation capture; `085` is the checked
result within the same iteration. All six final captures have no browser
errors and pass the original black-component regression.

Gameplay is **497,900 triangles**, including **109,853 total wall triangles**,
with **7,790 visible boulders**. Processed assets are **145.13 MB** excluding
exports. The uncapped RTX 4070 SUPER measurement is **2.33ms per gameplay
composer frame / 263.7 app frames/s**; six-view render times are 2.33–5.13ms.
The corrected frame counter reports 613 gameplay draw calls across the full
composer, rather than the old final-pass count of one. Diagnostic close,
wall, fissure and deposit cameras exceed the gameplay triangle budget; the
500k requirement is verified at the fixed gameplay camera. Every camera's
walls, including authored closures, remain below 110k.

The nine scanned modules occupy 896 deterministic stacks / 1,424 pieces
along 38 measured lip traces, with 428 authored debris chutes. Piece heights
are 100–139.9m and widths 35.0–149.9m. LOD targets are 20k/5k/1.2k/64,
including closures. The all-map coarse count plus every join is 104,306,
so the wall budget does not require dropping silhouettes. Native HCL1/HRL1
libraries and equivalent Transform3D poses are supplied for both the scan kit
and a separate authored closure library; the latter uses geometric normals,
with neutral relief only as compatibility data. All 28 pre-existing export
files remain, and ordinary GLBs match their inflated runtime counterparts.

Compared again with the actual Cerberus HiRISE ortho and Snake River 2007
photograph, the gameplay footprint and real 3D columns are useful, but the
close result still reads as assembled sheets. Large flat cut caps, repeated
tiers, coarse distant ribs, incomplete corner fitting and residual striped
talus prevent a convincing continuous fractured wall. Narrow corner pieces
are overlapped rather than mutually boolean-trimmed. Some contact openings
remain. The method changed successfully; finish quality did not reach 80%.
Two rounds of eight iterations are complete, so no additional round is used.

Validation passes for actual GLB counts/indices/unit normals/finite tangents,
normal handedness and join winding, source licences, native byte layouts and
pose equivalence, pinned cameras, retained exports, ground packed hashes,
mask pixel alignment, the 3cm height encoding (max checked error 0.01504m),
talus-contact regressions, and the six-camera budget/performance contracts.
RG7 ground normals have scene P50/P95/max angular error 0.425°/0.888°/1.888°
relative to the previous RGB normals; their 2° test budget replaces the old
RG8 1° budget to make storage room. There is no spatial averaging, and scan
geometry and its separate normal bakes retain their precision. Ground LOD
thresholds are 8px generally / 12px for distant wall-adjacent ground, using
inherited node errors whose bounds are not recomputed for the excavation.

Review: [endpoint removed] The six final images are
in `[path removed]` and `[path removed]`; the complete measured review
is `[path removed]`. Round 6's rejected result remains archived.

## Render and contact diagnosis

The owner's `071-r6-i5-checked-wall.jpg` failure is a render failure, not a
JPEG retake problem. With the fixed camera, bloom-off contains the error
and all-wall-normalmaps-off removes it. The context is not lost, gl.getError
is zero, and texture/renderbuffer limits exceed the used sizes. Degenerate
scan cut UV derivatives produce a zero tangent basis; normal shading becomes
non-finite and bloom contaminates large screen regions. Finite explicit
tangents across every LOD repair the original scene. The pixel regression
fails on the original image's 1,431,143-pixel black component, then passes on
all complete later captures. Export validation separately catches zero
vertex normals and now requires unit normals, unit tangents, orthogonality
and valid handedness in actual accessors. A material bake alone would not
protect another GLB loader; these attributes belong in the exported asset.

The pale shards required a different seam. Guessed raycast pixels first hit
ordinary dark surfaces and did not establish a cause. Sampling actual bright
framebuffer pixels instead found sky through open lip/foot coverage, rather
than proving flipped faces. Capped scans and a buried, recessed lip-following
join field close most of these gaps. The first join material added a second
error: sRGB bytes supplied as linear PBR factors, making the new faces pale.
Correct linear colour fixes that; the final review still records residual
corner/contact defects instead of claiming complete watertight coverage.

Source scans retain their original nonplanar surfaces, with whole-crop metre
scaling, QEM LODs, and no wall-vertex smoothing. Stacking limits each physical
piece to 100–139.9m; the scan colour/normal/AO bake and world-metre photographic
triplanar detail are separate from geometry. Small scan holes use local dark
caps to avoid long closure slivers. Flat large cut caps and rectangular tiers
remain the chief morphology limitation, despite the real 3D source data.

All experimental browser harnesses live in the explicit debug directory;
temporary dead probe branches were removed. Every heavy step releases the
shared lock. Captures start only after the dependent pipeline has finished:
the premature `075` capture is diagnostic evidence, and `076` is the completed
round-6 review. The capture browser closes before another begins, and no
unrelated process or owner dev server was stopped.
