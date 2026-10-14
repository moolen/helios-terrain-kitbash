# mm-cerberus, round 8: scan-kit assembly repairs

Eight iterations completed on `[path removed]`. Final review set:
`094-r8-i8-checked-*`, six pinned 1920×1080 cameras at time 37.
Honest quality remains **60%**. This round improves contact, cap materials and
stretching, but does not resolve the assembled-box appearance. No 80% claim.
The accepted nine true-3D scan modules and sharp lip method from
`68bcd3b5357ebf5f4ea4e4b3f9a7ddc510ce39b9` remain the basis.

## Review requests and final behavior

1. Neighbours now overlap more than their original spacing, with deterministic
   yaw (±0.10 radians), small X/Z tilt (±0.028/0.035 radians), width variation,
   lateral jitter and vertical offsets. Lower pieces are wider and fit the
   next piece's measured bottom anchor. These break some courses, but several
   rectangular seams and steps remain obvious in wall, close and fissure views.
2. Fine-LOD caps use the original scan albedo and transferred source-depth
   relief, with flat geometric normals. They no longer sample one constant
   atlas texel. Feet and upper caps are tucked into terrain/neighbours;
   disconnected coarse cap sheets are removed. Some exposed caps still span
   broad facets, and their shallow relief does not make them convincing rock.
3. Lower modules sink an additional 10m per stack level. An authored 18m
   contact fill and overlapping world-space debris fans pile against their
   feet. Extra 2.8–8m boulders occupy the contact band. A terrain-height dust
   coat carries a common colour into the apron. Contact improves especially
   on the right of the close view, while some long edges remain artificial.
4. Scan height scale is capped at 1.2×. Tall walls use overlapping 100–120m
   pieces, including a third piece in 19 tall stacks. World-metre triplanar
   photographic basalt colour/normal detail avoids stretching the detail
   with the pieces. The original source atlas is retained; some source grain
   and long facets remain visible.
5. Scan albedo is retained, scan normal gain is 0.12, AO contrast is reduced,
   and coherent upward ledge dust replaces fine speckled coverage. Separately
   credited `dark_rock_02` colour and normals provide basalt detail. Dark-piece
   differences remain; colour blending does not erase scan-to-scan transitions.
6. The old 6m directional rubble residual is replaced with a low-amplitude
   1.4m high-pass of the credited native Kilauea rubble, in two orientations.
   Continuous broad drifting debris fans replace nearest-arc cone stamps;
   regular shader runs and wind streaks are suppressed on talus. The close
   apron loses the strong regular stripe relief, but directional streaks
   remain in the fissure and distant gameplay apron. This request is partial.
7. Deep recessed closures and a wider plateau underside close the sampled
   sky shards. One localized LOD2 copy of the existing Devils Postpile scan
   closes the last verified corner sightlines. It is an authored transplant,
   with its original source credit and licence. Pixel/ray checks are sampled
   evidence, not proof that every possible camera is free of openings.

No scan wall vertices were smoothed. The metre frame, fixed cameras, rock
visibility thresholds and export filenames are preserved. All old export
files remain, with new detail-normal and round-8 review files added.

## Eight iterations

Each row refers to the four working cameras unless marked six. Rejected
intermediates remain in `studio-shots`; only the checked final is copied into
the final export review. All bakes, captures, GPU performance and heavy
validation run under `flock [path removed]`, one heavy step at a time.

| Iteration / capture | Gameplay triangles / walls / rocks | Change and review |
| --- | --- | --- |
| 1 / 086 | 496,843 / 109,116 / 7,790 | Wider randomized interpenetrating poses and deeper feet; caps and tiers remain. |
| 2 / 087 | 497,361 / 109,634 / 7,790 | Scan-coloured relief caps, scan-only 48-face coarse LOD, ledge dust and AO adjustment. Flat cuts persist. |
| 3 / 088 | 491,749 / 109,814 / 7,596 | Backing moves to 80m; talus uses its proper material and terrain-height dust. Narrow arc-stamped fans produce knife ridges: rejected. |
| 4 / 089 | 492,277 / 109,814 / 7,623 | Broad continuous world-space fans replace knife ridges. Scan normal gain 0.12; foot improves, small openings remain. |
| 5 / 090 | 491,710 / 109,151 / 7,626 | Height limit 1.2×, 1,792 pieces and scan bottom-anchor fitting; lower cuts still float. |
| 6 / 091 | 491,503 / 109,015 / 7,624 | 1,811 pieces; third pieces on tall stacks; lower pieces sink deeper. Wider underside leaves two measured corner sky pixels. |
| 7 / 092 | 491,503 / 109,015 / 7,624 | Flat cap normals, cap relief below lip, actual bounds/native UV repair, photographic triplanar normals. Independent gap rays still miss. |
| 8 / 093 precheck; 094 checked (six) | 491,568 / 109,063 / 7,625 final | Wider lower pieces. Generic 24m corner backing makes broad boards visible in 093 and is rejected within this iteration. Restore 80m everywhere; add one localized accepted-scan copy at the measured gap. 094 is final. |

The last repair is a correction inside iteration 8, not a ninth iteration.
The generic shallow-corner backing from 093 is absent from the final bake.

## Final evidence and limits

Final captures have no startup/browser errors and pass the black-component
capture regression. Gameplay has **491,568 triangles**, including **109,063
wall triangles**, with **7,625 visible boulders**. The six captured wall counts
are close 103,571; gameplay 109,063; overview 104,225; wall 109,230;
fissure 109,902; deposit 109,076. All are ≤110,000. Hero cameras have larger
terrain/scatter totals; the ≤500,000 total target applies to gameplay.
Processed assets are **142.25MB**, excluding exports.
Measured gameplay composer rendering is **2.37ms/frame** on an RTX 4070 SUPER;
the uncapped application harness records **257.5fps**. These are local harness
measurements, not a portability claim.

The final review JSON contains the measured uncapped GPU/composer performance,
asset inventory, all iterations and the six camera statistics. Actual exported
GLB accessors, finite tangent frames, winding, source licences, full tilted
native transforms, lossless packed assets, matching masks and quantized-height
agreement are checked independently. The north talus contact regression checks
for obsolete heightfield teeth. Both measured corner rays now hit local scan
geometry at approximately 6,273m and 6,281m.
The final bright-pixel probe finds no sky misses in its below-horizon regions;
only one bright gameplay sample and the explicit R7 fissure shard sample
qualify in the final frame. It cannot exclude dark holes or unsampled views.
A flat-authored-join normal test initially rejects one tiny smooth-normal scan
triangle after nonuniform scale. Scan copies are now checked against their
actual source topology and positive affine geometry; authored cap/field
winding retains the geometric-normal check. No source faces were reversed to
silence the check.

Comparisons use exactly `085-r7-i8-checked-*`, with the final image below:

- [Gameplay](shots/r8-compare-gameplay.jpg)
- [Fissure](shots/r8-compare-fissure.jpg)
- [Wall](shots/r8-compare-wall.jpg)
- [Close](shots/r8-compare-close.jpg)

Remaining issues: conspicuous box seams and broad cap facets, coarse distant
ribs, source colour/grain differences, directional apron streaks, and some
sharp artificial contact/cut edges. The accepted scan silhouettes remain;
the assembly is still a prototype. Stop at the authorized eight-iteration
limit. Source data, scale and authored geometry remain distinguished in
[CREDITS.md](CREDITS.md) and the export metadata.
