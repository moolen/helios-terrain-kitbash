# Europa Conamara chaos (ice-rift family B): plates, map 1

Map `europa.chaos_terrain`, generator v107 (hash `1B4AE55C…DFF7E`), captured with
`[path removed]` (the founding preview renderer, local morning, sun 16° high,
1920×1080, real GPU). Comparisons come from `[path removed]`. The 2026-10-11 set adds the shared far-LOD relief
(walls beyond about 1.5 km shade with LOD0's normal, AO and cavity); everything else is the signed-off floor-r06 look. The Shackleton reference is
`[path removed]` (opening phase, sun 0.6° high). The workbench references are
`[path removed]`. Triangle counts per view are in `stats.json`.

| File | Camera | What it shows |
|---|---|---|
| `close.png` | Founding hub, 28°, 350 m | The matrix floor around the hub: cracked salt-crust photo layer over the paler brine palette, angular gravel on the talus, scattered ice stones, the debris ramp up to the plate (top right), and a talus apron with scanned ice blocks (top left). |
| `gameplay.png` | Founding hub, 24°, 2350 m | Plates with rust lineae and ridge fabric, wall modules along the scarps, chaos rafts, talus and debris in the matrix. Triangles: 490k shown (269k terrain, 130k walls, 91k rocks; 4.7k rocks, 692 wall modules). |
| `approach.png` | Founding hub, 24°, 14 km | The whole 12 km map of real Conamara plates in the measured layout. Stand-in walls line the central scarps; the context ring continues the real chaos. 270k triangles. |
| `scarp.png` | Tallest scarp near the hub (182 m), 14°, 2.4 × height | The scanned San Gabriel/Mirror Fault wall modules as one jointed ice wall, with toppled blocks and talus at its foot and a raft in front. |
| `wall.png` | The same scarp foot, 10°, 95 m | A wall close-up: the scan relief, baked AO and cavity, blue joints, salt/rust seepage, frost on ledges, library ice blocks. |
| `hero.png` | Over the same scarp, 32°, 1.5 km | Hero overview: the plate with its lineae, the continuous scarp and its debris apron, rafts across the matrix. |
| `horizon.png` | Founding hub, 7°, 1.6 km, toward the west | A low view across the scarps toward the horizon. Jupiter is not in this frame at this time of day. |
| `farlod-before-after-{gameplay,hero}.png` | Same cameras | Far-LOD relief: signed-off floor r06 \| now. Triangles, modules and rocks are identical; the mid-distance scarps (hero) show jointed relief instead of smooth flutes. The other views differ by under 1 grey level on average. |
| `floor-before-after-{close,gameplay,approach}.png` | Same cameras | Floor pass (owner note: paler floor, better texture): i16 floor \| floor r06. Paler, less saturated matrix with frost and hydrated-salt swaths; salt crust replaces the gravel macro tiers that read as straw. |
| `vs-shackleton-{close,gameplay,approach}.png` | Same pitch and distance on each map's founding hub | Europa \| Shackleton. |
| `vs-shackleton-scarp.png` | Scarp close-up \| Shackleton rock-detail | The nearest equivalent close views. |
| `vs-prototype-{gameplay,scarp,wall,hero}.png` | In-game \| workbench B shots (i15 gameplay, i11 close-up, i15 hero) | The port against the approved prototype. Framings are close, not identical: the game cameras orbit the hub. |
| `prototype-*.jpg` | Workbench originals | Kept for reference. |

## Honest read against Shackleton
- **Comparable:** the gameplay-camera triangle use (490k, under the 500k ceiling), the photographic ground detail at the close camera, rock scatter density at gameplay range (4.7k against Shackleton's 6.4k), and real measured terrain at every scale.
- **Better than the workbench:** no visible card edges or scan holes in the walls; continuous texture across neighbouring modules; shadowed faces stay readable.
- **Gaps:** see the "Gaps" section of `[path removed]`. In short:
  - walls beyond about 1.5 km fall to the 420/110-triangle LODs; since 2026-10-11 they shade with LOD0's relief map, but their
    silhouettes stay coarse;
  - the context ring beyond the map is soft;
  - plate tops are calmer than Shackleton's cratered regolith (by design, but they carry less detail per pixel);
  - the sun is 16° high here, not Shackleton's grazing 0.6°, so the shadows are shorter.
