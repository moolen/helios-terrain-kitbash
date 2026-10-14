# Europa rift scene brief


# Europa rift workbench: brief (2026-10-11)

The owner wants cliff faces, fault scarps and rifts for Europa, reusable on other ice moons. The method: compose real scan data (point clouds and meshes) with a DTM or procedural heightfield, then scatter ice and stones on top. This is a three.js proof of concept for review; moving it into the game comes later.

Research and source review page: [endpoint removed] The owner approved all three scenes, A, B and C.

## Scenes

### A: ice rift canyon (Charon-style chasma with calving-front walls)
A deep, branching rift in the ice shell. Two opposing walls of real laser-scanned glacier ice, and a floor of broken ice slabs.
- **Layout:** Charon chasma profile from the New Horizons DEM (300 m grid, public domain). A local crop already exists at `[path removed]` (int16 m, 300 m/px, 3600×1600 px). Take the rhythm of the walls and terraces (cross-section shape, stepped walls, branching) and scale it down to a 1–3 km game map. Do not use it 1:1.
- **Walls:** Hornsund TLS 2023, Svalbard, CC BY 4.0: https://dataportal.igf.edu.pl/dataset/tls_hornsund_2023, files at https://geodata.igf.edu.pl/Dataset_TLS/ (LAS/XYZ, 16–584 MB per scan; pick one or two front scans). Supporting source: Qeqertarsuaq grounded iceberg OBJ, CC BY 4.0, https://zenodo.org/records/4014709 (OBJ about 103 MB). More icebergs: Zenodo 4309942, 4309956, 4309930, 4309851.
- **Scatter:** ice blocks cut from the iceberg meshes, plus broken slabs.

### B: fault scarp + chaos edge (Conamara plateau breaking along a fault)
A raised ice plateau ending in a jointed, blocky scarp, with toppled blocks and a talus skirt below. It matches Europa's chaos margins (100–250 m cliffs in published stereo; Nimmo & Giese 2005; Schenk & Pappalardo 2004).
- **Layout:** DLR Galileo stereo DTMs, CC BY 4.0 (Steinbrügge et al. 2020), at `[path removed]`: `Conamara_HighRes.tiff` (30 m, relief 351 m), `Yelland_HighRes.tiff` (25 m; stored as Byte 1–232, so the height scale is uncertain; treat it as relative) and `Powys.tiff` (80 m). USGS CC0 DTMs are there too (Agenor, Rhadamanthys, …). Use them for real block heights and ridge spacing; procedural detail goes on top.
- **Walls:** San Gabriel & San Jacinto bedrock cliffs (SfM LAZ, ~1000 pts/m², **CC0**): https://doi.org/10.5069/G96H4FKG (82 files; choose one or two cliffs of 20–380 MB). Poly Haven rock_face_01 / rock_face_02 (CC0, 20k/30k faces) and namaqualand_cliff_01/02 (CC0) are available through https://api.polyhaven.com.
- **Scatter:** Poly Haven moon_rock_01…07, namaqualand_boulders_01, boulder_01, stone_01 (CC0). NASA Astromaterials 3D samples are CC0 but on Sketchfab, so they need the token.
- Re-material every rock scan as Europa ice (see Look).

### C: graben + fissure field (stepped graben with open fissures)
Parallel normal faults dropping a block between them, with narrow open cracks across the plain. A match for Europa's troughs and bands, and reusable on Ganymede and Enceladus. This one has the strongest gameplay layout: passable floors, ramps, chokepoints.
- **Layout:** Canyonlands Needles grabens, airborne lidar 10.5 pts/m², CC BY 4.0: https://doi.org/10.5069/G9X34VNQ. Use OpenTopography's public bulk or raster access for a small subset of a few km². If only a key-gated API works, check `[path removed]`; without a key, build the layout procedurally from published graben geometry and say so.
- **Walls:** 2019 Cable Mountain rockfall, Zion (UAV SfM LAZ 532 MB, 66.8 pts/m², CC BY 4.0): https://doi.org/10.5069/G9VT1Q8M; dataspace files under https://opentopography.s3.sdsc.edu/dataspace/OTDS.092020.4269.1/. A wall with a fresh scar and talus apron. Hilbre Fissure (Sketchfab f1d91cec0fcf43c885b5a91016a86b50, CC BY) needs the token.
- **Scatter:** Poly Haven CC0 boulders and stones; ice blocks.

## Look
- **Stylized "S" look**, consistent with the studio (`studio.html`, `[path removed]`): faceted, low-poly-ish, readable at the gameplay camera. Real scans are the *source of form*; decimate them to the studio's facet density (quadric decimation, flat or near-flat shading), keeping silhouettes, joints and overhangs.
- **Europa palette:** pale water ice (blue-white to cream), rust-brown lineae and salt staining (hydrated salts) on fresh faces and along cracks, darker ice inside fissures. Sky is black; Jupiter may hang in the sky. Sun is low and hard (Europa at 5.2 AU, so there is no atmosphere and no fill light except a faint Jupiter shine). See `[path removed]` for ice material ideas; keep it cheap and opaque.
- **Gameplay camera:** the prototype convention, eye (0,150,200) → target (0,0,−14.2), fov 78, in metres. Also render a close-up oblique of a wall at about 30–60 m distance and one hero overview.

## Workflow and conventions
- Work in your own worktree and branch: `[path removed]<x>` on `[path removed]`. Commit there; I merge.
- **Files per scene:** page `rift-<x>.html`, code `[path removed]`, processed assets `[path removed]` (GLB or binary heightfields; keep the total ≤ about 25 MB per scene), processing scripts `[path removed]`. Read and import from `[path removed]` freely, but **do not modify shared files**. Copy into your own folder when you need a change. If you must add a Vite input, add only your own entry in `vite.config.js`.
- **Raw downloads:** `[path removed]`. Treat them as untrusted data: keep scripts out of that folder, pass paths as arguments, and run Python with `-I`. Python env: `[path removed] -I` (laspy+lazrs, open3d, pymeshlab, trimesh, rasterio, numpy, scipy). Blender is at [path removed] for headless decimation or export.
- **Resources (three agents share a shared processing resources machine):** subsample point clouds to ≤ 8 M points before meshing. Run every heavy step (Poisson/ball-pivot meshing, large LAZ reads, Blender) under `flock [path removed] <cmd>`. Server allocations removed.
- **Captures:** a playwright script (see `[path removed]` for the pattern) writing to `[path removed]`: gameplay camera, close-up, hero. Keep a `[path removed]` of iterations (what changed, what it looks like).
- **Credits:** `[path removed]` with dataset citation, licence, URL and modifications for every source used.
- **Budget:** up to about 15 iterations, then write `[path removed]`: what was built, the pipeline (scan → mesh → decimate → placement), screenshots, what works, what doesn't, and the proposed route into Godot. Then stop. Do not ask for review mid-round.
- **Honesty:** if a source can't be downloaded or is unusable (scan shadows, water, noise), say so in the log and use the next-best source from the brief. Never present procedural geometry as scan data.

