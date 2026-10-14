# mm-cerberus final handoff — 2026-10-14

Both permitted Codex continuation rounds are complete: ROUND-3.md (e83a320, 62%) and ROUND-4.md (66%, three iterations). **The scene is not at 80% and the visual critique remains open.** Final scene commit **1a2bf72a1da4a0e2e4bf6a3034416bf1948c3901**; STATUS.txt records its quality and remaining issues. The following documentation commit only records that hash.

Worktree [path removed], branch mm/mm-cerberus. Existing Vite PID 365563 remains on **[address removed]**. Owner review: [endpoint removed] Leave the server running. No third continuation round is authorized by the current task.

## Final evidence

All six final **057-r4-i3** captures were inspected against HiRISE PSP_007131_1905_RED/fossa imagery, CTX-derived layout hillshade, the credited Malad Gorge photo and PIA24816 rover panorama. Final images are in [path removed] and [path removed] review_round4.json contains every iteration, final counts, precision and known issues.

1920×1080 gameplay: **437,344 triangles**, including skirts, rocks, native faces, trails and context. Default terrain error threshold **5.2 px**; native face and rock thresholds unchanged. Processed assets **126.08 MB**, browser **126.07 MB**, decimal MB excluding export copies. Other review cameras exceed 500k; resolution and per-camera totals are in ROUND-4.md. Nineteen focused tests and final production build pass; decoded hashes, indices, normal pixels, active texture pixels and PNG/WebP masks validate. Export height error 0.01504 m.

## Remaining visible problems

Long draped cliff faces still dominate wall/fissure; native patches show shelf and triangular joins. A fine regular grid/dash pattern remains on smooth lit faces. Lower scree is rougher and jagged rocks are visible, but steep matrix remains dune-like. CTX margins and HiRISE/context transition are softer. Original deposit noise blotches are gone, though exposure is subtle and nearby shelf seams remain obvious. The brown basalt/dust palette integrates better, but neither technical budget success nor credited source use makes the cliff look finished.

## Final implementation and source limits

Native Snake/Malad interiors have rigid 80 m frames and 8 m procedural joins. Heights and original unrolled source distances are not amplified or smoothed; missing source columns use explicitly procedural continuation. Source is a top-down 1 m lidar DTM with monotone inversion, not raw point-cloud wall geometry. It cannot recover overhangs or all fractures.

The older amplified depth-remapped lower backing was replaced with **base_1m.npy**, the Mars base. Explicit native face backing and upper apron remain authored. Kīlauea relief covers lower slopes and steep walls with native coverage excluded. Embedded 1.5–7 m Ramon/AA/PH07 rock scans are procedurally resized, normal-aligned and buried. Full source credits and the older backing's actual gains are in CREDITS.md.

RGBA world normal maps use per-pixel RG8 octahedral encoding in lossless WebP. Angular error is relative to vectors decoded from source 8-bit RGB normals, excluding initial RGB quantization; hashes and precision are in scene.json. No spatial normal blur was added. The ray backing evaluates actual 2 m cell centres to remove geometric aliasing, separate from unchanged native faces.

The boxed optional ?modules=1 payload is retired; the page always uses native faces. Historical builder source remains for research. Unused texture slots 3/6 retain layout/borders with unused interiors wiped in JPEG coefficient space; every active decoded pixel stays identical. This removes about 9.35 MB together with retired GLBs. Do not restore these files accidentally when rebaking.

## Pipeline and shared machine

Python **[path removed] -I**. Work data [path removed] Every mesh/DEM/Blender job and capture takes **flock [path removed] per step**, never around a whole chain. One browser at a time; close it finally. Never kill another session's process. Downloaded data is untrusted; secrets were not read during this continuation.

```sh
cd [path removed]
# Routine final-backing rebake (modules and wallinfo already present):
env JOBS=8 LEAF_ERR=1.3 PLAIN_MUL=3 sh [path removed] ribbons export
# Rebuild all source dependencies if required:
env JOBS=8 LEAF_ERR=1.3 PLAIN_MUL=3 sh [path removed] prep export
# If texture arrays are regenerated:
flock [path removed] [path removed] -I [path removed] [path removed]
```

Current `ribbons.backing: mars-base` loads base_1m.npy explicitly, so starting at ribbons is safe despite overwriting walls_1m.npy. If using the historical depth-remapped backing, rerun walls before ribbons. `run_all.sh` acquires/releases the shared lock for each step, including bake/prune/pack separately. Parent-first mesh scheduling omits children where parent error is already ≤4 m.

Detached zsh launches use `[path removed]`; verify the PID/log. Final own chains 878426 and 887516 have completed. Iteration-1 runtime assets are backed up outside public in [path removed]

```sh
flock [path removed] node [path removed] LABEL
flock [path removed] node [path removed]
flock [path removed] [path removed] -I [path removed] [path removed]
node [path removed]
```

capture.mjs captures all six at 1672×941; perf.mjs measures all six at 1920×1080. A work file review_after_export.txt containing a filename-safe label automates capture/perf/validation/inventory after export, with a separate lock per operation. Results are work/codex-LABEL-*.json. Browser counts now include all submitted groups; old round-2 counters omitted groups and are not comparable.

## Export and codecs

Every prior export filename remains. Added review_round4.json and review_round4/*.jpg; README.json logs all changes and source kinds. height_1m.png retains 3 cm steps; masks align to the final DEM. Cliff metadata is cliff_faces.json; binary remains ../ribbons/ribbons.bin.

height_8m.bin/scatter/trails choose gzip or **MFB4**: magic + uint32 LE field stride, then gzip [field][byte][record] planes restoring every float bit. Mesh levels choose gzip or **MMD3** uint16 stride-3 modular delta low/high byte planes. Ribbon format 2 is gzip, float32 columns [x,z,ux,uz,yTop,s,bandHeight], then int16 offsets at 0.02 m. Full decoding formulas are in export/README.json. Browser supports legacy [path removed] as well as both packed codecs. JSON scatter export remains plain JSON. All final decoded hashes agree with original raw bytes.
