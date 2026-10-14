# Europa ridged plain with graben and fissures (ice-rift family C): plates, map 2

Map `europa.ice_plain`, generator v104 (hash `EB6E1DDF…7595E9`), captured with
`[path removed]`
(the founding preview renderer, local morning, sun 11° high, 1920×1080, real GPU). Comparisons come from
`[path removed] plain-r2b <this dir> --prototype [path removed] --pairs
gameplay=019-i14-final-game.jpg,scarp=019-i14-final-close.jpg,wall=019-i14-final-close.jpg,hero=019-i14-final-hero.jpg --sister …`.
This is **round 2** (the owner's review of the i13 set); the round-1 shots are the left half of `round2-before-after-*.png`.
The Shackleton reference is `[path removed]` (opening phase, sun 0.6° high); the sister map is
`[path removed]` (map 1). Triangle counts per view are in `stats.json`.

| File | Camera | What it shows |
|---|---|---|
| `close.png` | Founding hub, 28°, 350 m | The flat founding pad on the ridged plain: ice-grain photo layer, frost mottling, sparse ice stones, a fissure lip with spalled blocks (top left), and the graben walls behind. |
| `gameplay.png` | Founding hub, 24°, 2350 m | Bright ridged plain with frost and grain patches, a broad reddish double-ridge band, open fissures lined with ice walls (foreground), and the north graben belt: stepped fault walls with reddish floors. 489k triangles (277k terrain, 100k walls, 112k rocks; 5.8k rocks, 657 wall modules). |
| `approach.png` | Founding hub, 24°, 14 km | The whole map: the real Needles graben rhythm as Europa troughs, double-ridge lineae crossing the plains, the fissure belt. The horizon beyond the far terrain is plain-coloured (no brown band). 251k triangles. |
| `graben.png` (= `scarp.png`) | Tallest wall near the hub (182 m), 14°, 2.4 × height | The scanned Zion face as a continuous jointed ice wall, its shadowed faces grey and readable; the slices' open corners closed by recessed rough patches; talus and a lined fissure on the floor (right). |
| `wall.png` | The same wall foot, 10°, 95 m | Wall close-up: scan relief, baked AO and cavity, blue joints, toppled blocks. |
| `hero.png` | Over the same wall, 32°, 1.5 km | The graben wall over its reddish floor, fissures on the plain above, lineae bands beyond. |
| `horizon.png` | Founding hub, 7°, 1.6 km, toward the west | Low view across the plain, the ramp and the graben toward the horizon. No Jupiter: the site is anti-Jovian. |
| `round2-before-after-{close,gameplay,approach,graben}.png` | Same cameras | Round 1 (i13) \| round 2: plain tone at the same mean brightness, grey shadowed walls, closed module gaps, no horizon band, denser scatter, far walls with LOD0 relief. |
| `vs-shackleton-{close,gameplay,approach,scarp}.png` | Same pitch and distance on each map's founding hub | Europa plain \| Shackleton. |
| `vs-chaos-{gameplay,close}.png` | Same cameras on both Europa maps | Plain \| chaos: the palettes differ (bright blue-white plains and pale pink-grey floors against the chaos map's rust-brown matrix). |
| `vs-prototype-{gameplay,scarp,wall,hero}.png` | In-game \| workbench C shots (i14 game, close, hero) | The port against the approved prototype. Framings are close, not identical: the game cameras orbit the hub. |
| `prototype-*.jpg` | Workbench originals | Kept for reference. |

## Honest read against Shackleton
- **Comparable:** triangle use at every camera (under the 500k ceiling), real measured layout at every scale, continuous jointed
  walls at the graben camera, photographic ground detail at the close camera.
- **Better than the workbench:** the walls read as ice (blue-white, layered, seeping) rather than soft sandstone; no visible module
  edges; the graben floors and plains carry distinct materials.
- **Round 2:** plain mean brightness kept (gameplay foreground luminance 0.730 → 0.740) with more structure (SD 0.078 → 0.090);
  the brightness is one knob, `GrabenSurface.PlainBrightness` (1.0 now).
- **Gaps:** see "Gaps" and "Round 2 / Still open" in `[path removed]`. In short:
  - far walls carry LOD0's relief now, but at 1.5 km the modules' regular width still shows as a slab rhythm;
  - the plain foreground is calmer than Shackleton's boulder fields (5.8k rocks against 6.4k at the gameplay camera);
  - some short far walls are drawn by the terrain alone;
  - the sun is 11° high, not Shackleton's grazing 0.6°.
