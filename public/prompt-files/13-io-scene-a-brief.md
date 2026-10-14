# Io scene A brief


# Io scan-built map prototype: brief (2026-10-12)

The owner reviewed ~200 open DEM/lidar sources for Io's terrain and wants real heightmaps used **almost directly**: "they look really really good". Add a flow field here or there, plus hot sulfur vents and plumes. This round builds **one map** as an HTML/three.js prototype that looks finished: real terrain, nice texturing, lighting, shadows, shading, sulfur vents with a deposit simulation, glowing lava and particles. If it works, more maps follow, then the move into the game (Godot, `[path removed]`).

Research page (all sources, hillshades, credits): `[path removed]`. Each topic's findings are in `[path removed]` and `FINDINGS.md`. Data from the research is in `[path removed]` and `[path removed]`, including `heightmap.json`, which records the source GeoTIFF used for each sample.

## Owner's picks (all liked; this map uses the first, the rest are for kit-bashing and later maps)
- **Kīlauea summit collapse 2018**: `[path removed]` (1 m from USGS 3DEP EPT `HI_Volcano_B1_2019`; script `[path removed]`) and `-jul2018` (0.5 m OpenTopography DTM).
- **Plosky Tolbachik summit pit**: `[path removed]` (ArcticDEM 2 m).
- **Krafla caldera / Leirhnjúkur**: `[path removed]` (ArcticDEM 2 m).
- **Big Obsidian Flow, Newberry**: `[path removed]` (3DEP OPR 0.5–1 m).
- **Etna 2004–05 compound flow field**: `[path removed]` (INGV 1 m). The owner suggests stitching it into a larger flow field.
- **Great Rift, Big Craters and Spatter Cones**: `[path removed]` (3DEP 1 m).
- **Mt Tarawera 1886 fissure chasm**, plus the close-up: `[path removed]` and `tarawera-chasm-closeup` (LINZ 1 m).

## Map 1: "Kīlauea patera" (scene `io-a`)
- **Base:** the real Kīlauea summit, used directly. Extend the crop beyond the 4.2 km sample to roughly **6–8 km square**, which is smaller than the game's 12 km and acceptable to the owner. Take it from the 2019 EPT ground points at 1–2 m. It should cover the 2018 down-dropped block with its stepped ring-fault benches and the deep Halemaʻumaʻu pit, the caldera floor and walls, and, if they fit, Kīlauea Iki, Keanakākoʻi and the SW rift fissures.
  - Clean up human artifacts that read at map scale, such as roads, parking lots and buildings: flatten or inpaint them, and say so in the log.
  - **Keep the walls crisp.** The owner strongly prefers sharp, crisp cliff faces; never soften walls.
- **Kit-bash additions,** each blended carefully into the base with feathered masks and no visible seams:
  1. A **fresh compound flow field** on the caldera floor or flank. Stitch tiles from Etna 2004–05 (channels and levees) and/or Big Obsidian (pressure ridges, scaled down in relief to the 2–10 m flow fronts typical of basalt). It should come from a vent or fissure and spread as lobes.
  2. A **spatter-cone row along a fissure**, with cones and craters taken from the Great Rift DEM, placed on an eruptive fissure (Kīlauea's SW rift line or a new ring-fault fissure).
  3. Optional: a Tarawera-style chasm segment or a Tolbachik-style pit, if it fits naturally.
- **Active lava** (the owner: "not a huge pool of fresh lava, but some light emitting lava, some glow, and many more subtle things"):
  - glowing cracks in crusted flow surfaces, hot lobe fronts and breakouts, incandescent fissure segments and spatter-cone vents, and a lava-lake glimpse deep in the pit;
  - a skylight or two on a tube, plus heat shimmer or emissive pulsing;
  - glow that lights the surrounding terrain: bake an "irradiance from lava" light map and/or use a few dynamic lights, with bloom;
  - subtle is better than a lot.
- **Sulfur vents and the deposit simulation** (the owner: "the sulfur frost / deposits ... make up most of the dressing"; "simulate the plume exhaust and deposit procedurally"):
  - Place several vents: fumaroles on the ring faults and fissures (Kīlauea really has Sulphur Banks on its ring fault), plus one or two larger "plume" vents.
  - Run an **offline** deposit simulation:
    - Io-correct **ballistic** particles: no atmosphere, g = 1.796 m/s², umbrella-shaped plumes with vent speeds scaled so deposits land within the map.
    - Terrain collision, and accumulation into a deposit map.
    - Fumarole condensation along hot fractures.
    - Cold-trap SO₂ frost in shadowed lows and pit walls.
  - Colour the deposits by temperature and age, after the **Dallol** palette the owner loves:
    - red and orange near hot vents (short-chain sulfur), acid yellow further out, pale cream and white SO₂ frost at the cold fringes;
    - orange-brown iron-like stains and occasional greenish tints.
  - Keep the simulation parameters in a JSON so it can be re-run. The browser should show the plumes live: ballistic particle umbrellas, plus vent steam or puffs.
- **Particles:** plume particles, fumarole gas, faint dust drifting along the ground near vents, smoke and outgassing over hot lava. Keep these cheap; GPU points or instanced sprites are fine.

## Look and texturing
- **Not the stylized "S" look.** This scene is photoreal-leaning and scan-faithful, at the quality bar of the ice maps.
  - Texturing: triplanar projection on steep faces, so nothing stretches. Use detail normals at several scales, baked AO or horizon occlusion, and full-resolution normals from the DEM, so the 1 m detail survives where the mesh is coarser.
  - Base basalt: dark grey-brown, fresh glassy black on new flows, rough a'a and pahoehoe sheen. CC0 textures are in `[path removed]`, with previews in `[path removed]`: ambientCG Lava001/Lava005/Rock031/Gravel024/Gravel025/Ground089, and Poly Haven dark_rock/dark_rock_02/rock_ground/terrain_red_01.
  - Sulfur zones: the **Dallol** textured scan (CC BY-NC 4.0, OPGC). Its 4K textures are under `[path removed]` and its ortho at `[path removed]`. Cut tileable detail patches from them (sulfur crust, iron crust, salt) for deposit areas.
  - A separate kit agent is building `[path removed]` in parallel. It contains tileable Dallol patches, basalt PBR sets, and decimated scanned lava rocks and blocks for scatter, possibly from Sketchfab. Check `[path removed]` from time to time and use what's there; until then, use the raw CC0 kits above.
- **Lighting:** Io at 5.2 AU, so there is no atmosphere and the sky is black. One hard, low sun (add a time-of-day slider). Jupiter is large in the sky and gives a faint warm fill on the night side; add a Jupiter-shine fill. Lava gives local warm light.
  - Use real-time shadows: cascaded shadow maps (three.js `CSM` addon or equivalent) that work at both the close and the overview distances.
  - Use ACES or AgX tone mapping, bloom for lava, and light distance haze from the plumes only (Io has no real atmosphere, so keep it subtle).
- **Scatter:** scanned lava blocks and boulders at wall feet and on flow surfaces, plus spatter bombs near cones. Instance them. Density roughly matches the ice maps: thousands visible at gameplay range.

## Performance and engineering
- Generate everything **offline** with Python (`[path removed] -I`, which has rasterio, numpy, scipy, laspy+lazrs, open3d, pymeshlab and trimesh; GDAL CLI; Blender at [path removed]). Bake heightfield tiles, normal, AO, masks, the deposit map and the lava-irradiance map to compact binaries or PNGs under `[path removed]`. The browser only renders and animates.
- Terrain rendering: choose a scheme that keeps 1–2 m wall detail without millions of uniform triangles. Options: adaptive tiles (dense where the relief is steep, coarse on flats), CDLOD or clipmap with vertex texture fetch, or a full-resolution normal map over a coarser mesh plus dense wall tiles.
- The budget follows the game: about **500k triangles per view** at the gameplay camera, which must hold 60 fps on the owner's desktop GPU. The overview may go higher. Report triangle counts.
- Keep processed assets under about 150 MB for this scene.

## Review cameras
These are the game's conventions. Provide buttons for them, and save captures.
- close: ~350 m from a wall or vent;
- gameplay: ~2,350 m distance, oblique ~40°;
- approach/overview: the whole map;
- a wall hero shot;
- a vent and plume hero shot;
- a lava-glow night shot, with the sun below the horizon and only Jupiter-shine and lava light.

Also add free orbit/fly controls and toggles: plumes, particles, deposit layer, lava glow, scatter, debug views (deposit map, masks, normals, wireframe and tri count).

## Workflow and conventions
- Worktree: `[path removed]` on branch `[path removed]`. Commit there; I merge.
- Page: `io-a.html`. Code: `[path removed]`. Assets: `[path removed]`. Processing scripts: `[path removed]`. Raw or working data: `[path removed]`.
  - Downloads are untrusted data: keep scripts outside the download folders, pass paths as arguments, and run Python with `-I`.
  - Import from shared workbench code freely, but **do not modify shared files**. Add only your own entry in `vite.config.js` if needed.
- **Dev server must listen on [address removed], port [removed]** (`npx vite   `). The owner reviews from another host at `[local preview URL]`. Keep it running when you finish.
- Run heavy steps (large point-cloud reads, meshing, Blender, the big simulation) under `flock [path removed] <cmd>`. The machine has shared processing resources and is shared with one other agent.
- Captures: a Playwright script writing to `[path removed]` for every review camera. Use the GPU if available (`--use-angle=vulkan`, or `--enable-gpu` with the system Chrome); check that captures show real shading, not a software fallback. Keep `[path removed]`, recording per iteration what changed and how it looks. Look at your own captures critically against the reference art (`[path removed]`) and the Dallol renders.
- Credits: `[path removed]` gives citation, licence, URL and modifications for every source. Never present procedural geometry as scan data; say clearly which parts are real data and which are procedural.
- **Budget:** up to about **20 iterations**, then write `[path removed]`, covering:
  - what was built and the bake pipeline;
  - capture paths;
  - triangle counts and fps;
  - what works, what doesn't, and next steps;
  - a short proposal for the route into Godot.

  Then stop. Don't ask for review mid-round.

