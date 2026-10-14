# mm-tranq log (round 1)

Captures: `[path removed]` (+ .json with triangle counts, fps, GPU). Selected copies in `[path removed]`.

## Bake (before iteration 1)
- `prep_base.py`: Kaguya TC (despiked) and TRANQPIT1 warped onto the 2 m AEQD grid (6000²). Strip minus Kaguya: median -1.3 m, plane residual p95 4.7 m. First try kept Kaguya above ~25 m wavelength: the Kaguya part looked like orange peel (stereo noise) next to the crisp strip. Final: Kaguya above ~150 m only (sigma 40 m), real TRANQPIT1 2 m high-pass transplanted below; donor windows with stereo-noise patches excluded (cleanest 35 % kept).
- `kitbash.py`: West crater (Apollo 11 NAC DTM) x1.8 at (-3350, -900); Fecunditatis ridge crest along the real Kaguya ridge in the SW corner (three tries: the first stamp was on the scarp face and only added feather grooves; the across-trend removal + crest-centred donor line fixed that; the result is subtle, as the real ridge); 320 real small-crater stamps; authored pit funnel; fresh-crater detection (1327 craters, 134 with freshness > 0.5).
- `bake_pit.py`: shaft mesh, LOD0 220k tris (720 segments, 154 profile rows, 36 beds), LOD1 22k.
- Rocks: Blender bake of 6 Apollo samples + 6 Poly Haven moon rocks to 2k tris. First bake had thousands of UV islands (scans arrive split along seams); welding before decimation fixed it.

## r1-01
First light. Pit hole cut + shaft mesh work, floor visible, layered walls read. Problems: exposure blown at high sun, halos were soft discs, black speckle on the funnel, wall like a brick wall, 44 rocks at gameplay.

## r1-02
Halos rebuilt (continuous ejecta to ~1.4 R, then rays only). Auto exposure from sun elevation (like a camera), ACES. Wall blocks 3.5-13 m wide + smooth angular noise. Still white-out: traced to the opposition surge + phase curve (the anti-sun point became a white disc) and to albedos that were far too high on steep / blocky ground (0.35-0.4 instead of ~0.1).

## r1-03
Phase curve softened (0.011 mag/deg), surge B0 0.3 / h 0.03; all albedos re-derived from the measured texture means (mare ~0.10, fresh slopes ~0.13, wall basalt ~0.10, floor ~0.12, ilmenite deposit ~0.05). Detail normals weaker; shadow bias up. Wall view reads as layered basalt now.

## r1-04
Halo breakup by the 4 m relief made camouflage blotches: removed (only a light touch left). Close camera moved south of the West crater looking north (sun from the side). Pit funnel no longer flagged as rubble ground.

## r1-05
Terrain LOD tau 1.7 -> 0.45 px: at gameplay the quadtree had picked 2.8 m-error nodes, so small craters cast no shadows. 31k -> 112k terrain tris.

## r1-06
Gameplay sun at 7.3 h (19 deg) still read flat; 6.5 h tested; settled at 6.9 h (~13 deg, long shadows). Crater blocks x2.7 for D >= 30 m craters, larger size range: 1207 rocks at gameplay. Overview shows the real Kaguya wrinkle ridge and doublet crater in the context ring.

## r1-07
Rays narrower (0.35-1.6 deg), 30-60 per landmark crater, broken into clumps along their length (they read as spokes before). New pit hero at 10.4 h from the SE. New 6th view: Earth through the skylight from the pit floor.

## r1-08
OrbitControls' polar clamp moved the from-the-floor camera; unclamped. Earth now sits just above the W lip (az 257.6 deg, el 55.9 deg).

## r1-09
Funnel profile changed to (1 - d)^1.6 (steep at the caprock lip, zero slope at the funnel edge): the crisp ring at the funnel's outer edge is gone. Scatter LOD thresholds raised (LOD0 > 190 px, LOD1 > 32 px, rubble < 0.75 m only above 2.2 px): close view 1.27M -> 0.75M tris. Export written.

## r1-10 / final
Auto exposure steeper with sun elevation (high-sun views were washed out). Earth view exposure x1.6. Perf measured (1920 x 1080, RTX 4070 SUPER). Final captures `014-r1-final-*`.

# Round 2 (coordinator review of r1)

## r2-01
Rocks: boulders now the Moon kit's Apollo scans (LOD0/1/2 with baked albedo + normal, regolith-grey grade by the measured mean), rubble = Poly Haven moon rocks re-baked with three textured LODs; no flat-shaded stand-ins. Rocks sunk 18-30 % with a regolith fillet mound. Crater blocks redistributed as ejecta (rim crest + upper inner wall densest, radial e-folding, ray-aligned clusters, power-law sizes, 5-10 m blocks only on the big rims). Pit shaft rewritten: units 1-8 m that thin and pinch out around the circumference, wandering joints, spalled alcoves, ledges with talus wedges, regolith cap + dark rough lip; anti-tiling on all triplanar projections. Terrain: mare albedo 0.075, regolith scans at 3/13/27/53 m tiles (micro-craters at every range), fresh ejecta x2.25 and blocky. Gameplay re-aimed along the pit -> fresh crater line. Problems: 1.1M tris at the wall/close cameras, white fillet discs, vesicular 15016 reads as a sponge at boulder size.

## r2-02
LOD3 (24-tri silhouettes) for rocks under 12 px; LOD2/3 cast no shadow (that was the West crater's dark shadow carpet, together with the crater's own half-shadow at 7.2 h: close camera moved to 8.4 h). Gameplay 317k tris.

## r2-03
Joints wander row to row, faces spall unevenly; 15016 dropped from the block sets; LOD0 > 300 px.

## r2-04 / r2-05
Fillets dithered (alpha hash) into the ground. Halo apron broken by 28 ray clumps + the regolith scans' own 2-40 m structure (no noise); halos for craters down to freshness 0.12 (it was 0.25), reach 4 R for small craters.

## r2-06
Gameplay frame looking north from the south of the pit (side light at 7.2 h): the west- and east-looking frames were either flat (sun behind) or back-lit. Pit + its rayed halo + a row of small fresh craters in frame; 2 093 rocks rendered, 272k tris.

## r2-07 / final
Regolith contrast x1.6 and stronger close-range normals of the cratered scan; wall / pit views exposure 0.78 / 0.85. Export refreshed (README.json changes.round2). Final captures `031-r2-final-*`.

# Round 3 (coordinator review of r2)

## r3-01
Anti-tiling replaced by hex-tile blending (triangle grid, random translation per vertex, sharpened barycentric + luminance weights, no rotation): the swirl / rosette and the faint grid are gone. Detail normals fade with distance (60-400 m, 400-2200 m, 1.2-5 km for the three scales). Pit walls: 23 massive units of 2.5-14 m (was 47 of 1-8 m), each with rounded / spalled top and bottom edges that vary along the wall and a convex bulge; stronger per-unit setbacks (-1.6..+2.2 m) and joint relief; ledge rubble includes slumped blocks up to 4 m. Pit mid LOD (300 segments) between 260 m and 1.2 km; rock LOD0 > 420 px, LOD1 > 130 px. Wall 874k -> 743k, Earth 808k -> 656k, pit hero 576k -> 498k tris.

## r3-02 .. r3-05
Small fresh-crater halos: strength 0.65-1.0 (by freshness) for craters under 40 m, ejecta apron at least 16 m, halos down to freshness 0.08; immature ejecta x2.5 at full strength. The first version gave star-shaped sprites (rays and lobes at the 4 m mask scale): rays dropped below D 25 m and the lobe break-up kept to D > 40 m. Gameplay now shows the bright-rim / dark-floor speckle of the mare.

## final
Export refreshed (README.json changes.round3). Captures `037-r3-final-*`. Heavy steps ran in the owner's full-force window (before 17:00).
