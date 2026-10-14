# Scene B log: fault scarp + chaos edge

Captures are in `[path removed]`, which git ignores. The key ones are copied to `[path removed]`. Each iteration renders three views: gameplay (eye (0,150,200) → target (0,0,−14.2), fov 78), close-up and hero.

## Sources and setup (before iteration 1)
- **Europa DTM.** I looked at the DLR Conamara HighRes DTM (30 m, 186×238 px, 43 % valid) as a height map. It has a clear raised plateau with a deep trough in front of it, plus a mid-height raft. I chose a 68×68 px crop (col 98, row 122), which is 2.04 km and is used 1:1 horizontally. I rotated it 180° so the plateau sits beyond the trough when seen from the gameplay camera. With the threshold split, the plates sit 129 m and 152 m above the matrix p5.
- **San Gabriel SfM LAZ (CC0).** I downloaded SG1605_3 (148 MB) and SG1608_5 (215 MB) after checking their orthophotos.
  - SG1605_3 is a blocky, jointed granite face of about 42×27 m with columnar joints. It is the best "jointed scarp" source.
  - SG1608_5 is a slabby face of about 116×108 m, with shrubs and a tree at the base.
  - Both have RGB. Excess-green filtering removed 0.8 % of the points (shrubs); the tree in SG1608_5 is mostly outside the windows I used.
- **Poly Haven (CC0).** rock_face_01/02, namaqualand_cliff_01/02, boulder_01, namaqualand_boulders_01, stone_01 and moon_rock_01…07. I took only the glTF geometry (the 1k glTF and its .bin) and no textures, because everything is re-materialled.
- **Licence update (coordinator, mid-round).** I tried the **Mt Bove 2016 TLS** fault scarp (4 LAZ, 167 MB, about 162 M points) as the primary scarp. **It is not usable as a wall source.**
  - I rasterised a 1 m DEM and found the rupture: a straight trace about 250 m long on the slope.
  - Cross-sections show a free face of only **1–2 m**. That face sits in the scanner's **occlusion shadow** (a 1–3 m wide no-data strip along the trace), with about 20–85 pts/m² that far from the scanner.
  - The bands I first took for a scarp turned out to be forest canopy.
  - So Mt Bove stays out, and San Gabriel remains the primary wall source.
- **Mirror Fault, Dixie Valley (SfM LAS, 670 MB, licence not stated).** I meshed it as one extra wall module from iteration 13: a planar polished fault face of about 22×18 m with fracture sets. It is in WGS84 degrees, which I converted to local metres.

## Pipeline
`scan_wall.py`[path removed]`build_assets.py` (windows → decimation → base-centre → curled margins → GLB), and `layout_dtm.py` (DTM → plates, sdf, plate level, matrix floor). Every heavy step ran under `flock [path removed]`.

## Iterations
1. **i01, first build.** Heightfield from the DTM, wall modules along the marching-squares edge, blocks, rocks, Jupiter.
   - The scarp read only as a thin white band on top of a huge brown ramp. The 30 m DTM smears each cliff into a ramp about 200 m wide, so the "floor" next to the edge was still high and the drop was only about 50 m.
   - Plate tops were brown with corrugated stripes, and the close-up looked straight at the procedural backing.
2. **i02, real floor.** Added a 4th layout plane: a matrix floor interpolated by normalised convolution from ground more than 140 m outside each plate. The DTM ramp under the scarp is replaced by the matrix level. The drop at the edges is now p50 89 m / p90 136 m. I moved the steep backing inside the plate (s 0…10 m) so that modules stand in front of it, and moved the module origins to the back of their relief.
   - Result: tall jointed walls appear. But gaps showed long, smooth, stretched "backing" columns, and the scarp sat high in the frame.
3. **i03, layout shift and light.** Shifted the layout +70 m in z so the edge at x=0 sits about 140 m in front of the target. Raised the sun to 17°, made plate tops brighter, and increased wall overlap (0.45) and minimum width (50 m).
   - Result: the scarp fills the upper half of the gameplay view and reads as a jointed ice wall. Shadow acne showed on the close-up.
4. **i04, side light and close-up.** Moved the sun to azimuth 74° (grazing on the main face, so joints read). Set shadow bias and normal bias for the faceted, double-sided sheets. Smoothed the matrix knobs (the 20 m ridged noise was too busy at a 4 m grid) and made the close-up oblique.
   - Result: good contrast on the scarp. The ground stayed orange.
5. **i05, lineae bug.** `lineBand()` was inverted and returned 1 almost everywhere, which is why the tops looked brown. With the fix, the tops are pale cream with thin rust lineae. I also picked a sunlit wall for the close-up and made the blocks bigger.
6. **i06, debris.** Decimated the rocks to 180–320 tris, raised the counts (12k talus, 6k matrix, 900 lip) and the sizes (talus up to 17 m), and lifted the fill and hemi light slightly.
7. **i07, close-up line of sight.** Added a raycast check for the close-up camera. It wasn't the cause: the close-up was simply framed too tight.
8. **i08, close-up framing.** A true oblique along the wall from the talus, with a tight 320 m shadow box per view for crisp shadows.
   - Result: a readable close-up. The flat "card" edges of the module windows were visible.
9. **i09, curled margins.** Wall module side and top margins now bend back into the scarp, so neighbouring modules merge without flat card edges. The scarp now reads as one continuous jointed wall.
10. **i10, chaos rafts.** Added rafts in the matrix (Voronoi cells of 75 m, 36–42 % of cells raised 4–16 m, cream tops), ±1.1 m grid jitter against regular faceting, and dropped walls on edges shorter than 25 m (those had made white slivers on the matrix in the hero view).
    - Result: the hero now reads as Conamara-style chaos.
11. **i11, flatter rafts.** Raft tops were set without the knob noise (still dished). This is the best close-up of the round.
12. **i12, level rafts.** Each raft's top is now levelled at the smooth floor at its Voronoi centre, plus a small planar tilt. Rafts read as flat tilted blocks in the hero view.
13. **i13, Mirror Fault module.** The fresh fault-plane faces mix with the jointed San Gabriel faces.
14. **i14, brighter debris.** Raised rock and block albedo and tried a wider close-up.
15. **i15, final close-up framing.** Camera 62 m out, 36 m along the wall and 30 m up. The final-state close-up looks at a Mirror Fault module in shade beside a lit San Gabriel module. I prefer i11's close-up framing (it shows the sky and the wall receding).

## Numbers (final state)
| Item | Value |
|---|---|
| Terrain grid | 518 k tris (4 m) |
| Edge contour | 5 lines, about 10 km |
| Wall modules | 284 (9 module types) |
| Blocks | 92 (toppled blocks + leaning slabs) |
| Debris rocks | 15.5 k instanced |
| Scene total | about 6.4 M triangles; build about 0.5 s |
| Scarp drop, all walls | p10 34 m, p50 60 m, p90 111 m, max 139 m |
| Scarp drop, gameplay view | 108–134 m (18 modules) |
| Processed assets | 5.8 MB |

The scene total was estimated from the parts; the page's render counter only reports the last post-processing pass.
