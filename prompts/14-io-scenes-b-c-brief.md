# Io scenes B/C brief


# Io maps B and C: brief (2026-10-13)

Read `[path removed]` first. Everything in it applies here unless stated otherwise: the look, the lighting, the active-lava rules, the sulfur deposit simulation, the Dallol palette, the budgets, the review cameras, offline baking, honesty, credits and the round budget. Map A ("Kīlauea patera", scene `io-a`, worktree `[path removed]`, branch `[path removed]`) is the first map and is nearly through its round. **Start from its pipeline.** At the start, copy (don't link) its `[path removed]`, `[path removed]` and `io-a.html` into your own scene folders, then adapt them. Its `[path removed]` explains what worked. The io-a worktree is read-only for you. If you need a later fix from it, copy it again.

The owner's goal: "implement the Kīlauea patera, and then create two more maps using the kit and the examples we've discussed earlier. once they are implemented port them into the game." The three game regions are `io.loki_patera` (map A), `io.tvashtar` (map B) and `io.pele` (map C). Each map is about 6–8 km square; the game's 12 km is allowed to shrink slightly.

The shared asset kit is in `[path removed]`: `manifest.json`, `CREDITS.txt` and `contact-sheet.jpg`. It contains 7 Dallol sulfur sets, 6 basalt/lava sets (including a hot crust with emission), 4 Dallol mesh pieces and 10 scanned lava rocks with LODs. Use anti-tiling sampling for the Dallol sets: their distinctive features repeat.

Lessons from map A's mid-round review:
- Avoid a uniform khaki wash. Use a dark basalt base with sharp, patchy, terrain-controlled sulfur crusts on top, and never soft radial discs.
- Walls are dark layered basalt with sulfur staining in bands, kept crisp.
- Active lava is thin glowing crack networks, hot lobe fronts and small round vents. No flat orange blobs, no square sprites.
- A plume is a ballistic umbrella with a canopy and a falling curtain, not a puff.
- Scatter must be visible.

## Map B: "Tarawera fissure" → `io.tvashtar` (scene `io-b`)
Tvashtar Paterae: en-echelon eruptive fissures with a curtain of fire (1999–2000 and 2007 Galileo/New Horizons), fresh dark flows, stepped patera walls and a layered mesa.
- **Base (used directly):** the Mt Tarawera 1886 fissure chasm. LINZ `nz-elevation` bay-of-plenty_2019-2022 `dem_1m`, CC BY 4.0, EPSG:2193. The research samples are `[path removed]` (2 m, 8×6.5 km) and `tarawera-chasm-closeup` (1 m); the raw files are in `[path removed]`, with fetch scripts in `[path removed]`. LINZ tiles use LERC compression, so read them with rasterio (`merge_rio.py`). Extend or re-crop to about 7–8 km square at 1–2 m, so the joined crater chain runs diagonally through the map with the dome plateau and the Lake Rotomahana basin.
  - Lake and water surfaces are perfectly flat in the DEM. Turn them into a **flooded patera floor**: a crusted lava plain with a slightly raised rim and pressure-ridge texture.
  - Inpaint forestry roads and tracks.
- **Kit-bash:**
  - The **Great Rift spatter-cone row** (`[path removed]`, 3DEP 1 m) along a second, en-echelon fissure segment.
  - A **Plosky Tolbachik** pit (`[path removed]`, ArcticDEM 2 m), scaled down if needed, as the collapse pit beside the hub.
  - Fresh flows from the fissures, using **Etna 2004–05** leveed channels (`[path removed]`) and **Big Obsidian** pressure ridges (`[path removed]`) at basalt-scale relief.
- **Active lava (the signature of this map):** one or two short incandescent fissure segments with a low **curtain of fire**. These are fountain particles: ballistic, under Io gravity, glowing and cooling as they fall. Add spatter ramparts, hot channels, and cooling flows with crack glow. Keep it restrained: most of the fissure is dormant and steaming.
- **Sulfur:**
  - Fumaroles all along the fissure and the chasm rims, with yellow and white crusts on rims and ledges.
  - One vent with a mid-size ballistic plume whose deposit falls across the plateau.
  - Cold-trap SO₂ frost on the shadowed chasm walls.
- Dev server: **[address removed]**. Worktree: `[path removed]`, branch `[path removed]`. Work data: `[path removed]`.

## Map C: "Krafla plume field" → `io.pele` (scene `io-c`)
Pele: a hot vent and lava-lake margin at the centre of a giant red plume-deposit ring, with dark pyroclastic fans, dark flows and collapse pits. At 7 km, the map sits near the vent, so local fallout dominates.
- **Base (used directly):** the Krafla caldera and Leirhnjúkur fissure swarm. ArcticDEM v4.1 2 m mosaic, CC BY 4.0; the research sample is `[path removed]` (2 m, 8×7 km), with scripts in `[path removed]`. Re-crop to about 7–8 km square around the caldera, the fissure swarm, the 1975–84 Krafla Fires lavas and the Víti explosion crater.
  - Inpaint the geothermal power plant, the pipes, the roads and the drill pads.
- **Kit-bash:**
  - A **stitched compound flow field** on the plain. The owner explicitly suggested stitching the **Etna 2004–05** compound flow field into a larger field; combine several Etna tiles (flipped, rotated and feathered) with **Big Obsidian** ridge zones, flowing from the vent fissure as dark tongues and lobes.
  - The **Great Rift** spatter cones on the vent fissure.
  - A Tolbachik or Puʻu ʻŌʻō-style collapse pit.
  - A small **lava-lake margin**: a crusted pond in a pit or depression with a glowing broken rim, after Galileo's I32 Pele night image (`[path removed]`).
- **Sulfur (the signature of this map):**
  - One **dominant plume vent** with a large Io-ballistic umbrella in the browser, and an offline deposit simulation producing the Pele look.
    - Red and orange short-chain sulfur deposits dominate. Use concentric, patchy zones from the vent: a dark pyroclastic fan close in, then red/orange, then yellow, then pale.
    - Terrain shadowing and lee effects break up the rings, so they must not read as perfect circles.
  - Add fumarole crusts along the Krafla fissures in the Dallol style.
  - Colour reference: the Io mosaic crops in `[path removed]` and the reference art `[path removed]`.
- Dev server: **[address removed]**. Worktree: `[path removed]`, branch `[path removed]`. Work data: `[path removed]`.

## For both maps
- **Game port is next.** A separate agent is preparing the Godot port right now. Bake outputs in a form that is easy to export:
  - a float32 or 16-bit height raster with a JSON (metres per pixel, origin, vertical range);
  - deposit, lava, emissive and material masks as aligned rasters;
  - vent, plume, fissure and pit positions as JSON;
  - a scatter instance list as JSON.
  - Also write `[path removed]` listing these files.
- Run heavy steps under `flock [path removed]`. There are three map agents plus a game agent on a shared processing resources machine, so be frugal and don't run more than one Playwright capture browser at a time.
- Budget: up to about 20 iterations, then write `[path removed]`, `LOG.md` and `CREDITS.md`, commit on your branch, leave the dev server running, and stop.
- The harness may block .md files written with the Write tool; if so, write them with a Bash heredoc.

