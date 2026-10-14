# Io asset kit: Dallol, basalt, rocks

You build the shared **asset kit** for Io terrain prototypes. A separate agent is building the three.js map at the same time (brief: `[path removed]`; read it for context) and will pick up your outputs from `[path removed]`.

Context: Helios is a non-commercial game. CC0, CC BY, CC BY-SA, CC BY-NC and CC BY-NC-SA are all fine with credit; ND licences are not. The research is in `[path removed]` and FINDINGS.md. `[path removed]` and `[path removed]` list the kit candidates, including Sketchfab entries with their URLs and licences. Downloaded CC0 textures are in `[path removed]`.

Deliverables in `[path removed]`, all with a `manifest.json` that the map agent can read. Update the manifest incrementally as each item is finished, so it can start using items early. For each item, the manifest records: id, type (texture-set | mesh | decal), files (relative paths), size in metres, tri count, licence, credit, source URL, and notes on intended use.

1. **Dallol sulfur texture sets** (highest priority; the owner loves the Dallol look). From the OPGC Dallol textured photogrammetry model (CC BY-NC 4.0), in `[path removed]` (48 OBJ tiles with 4K textures; see `[path removed]` and `[path removed]` in `[path removed]`), produce **tileable** 2K PBR-ish detail sets:
   - albedo with lighting de-baked as much as practical (remove large-scale shading by high-pass or ratio against a blurred luminance);
   - a height and normal map derived from the mesh geometry, baked from the high-poly mesh with Blender headless if practical, or else from the gridded DEM plus luminance;
   - roughness.
   Make 4–6 distinct sets: acid-yellow sulfur crust, orange and red iron or hot-sulfur crust, white salt/frost crust, dark mound or altered ground, greenish pool crust, and a mixed transition set. Make them seamlessly tileable (e.g. a histogram-preserving blend or a texture-synthesis quilt) and check the tiling with a 3×3 contact sheet. Also produce 2–4 **mesh pieces** (chimneys, salt pillars, crust mounds) cut from the Dallol tiles and decimated to 2–20k tris, as GLB.
2. **Basalt and lava PBR sets** (2K, tileable): fresh glassy pahoehoe, a'a clinker, old weathered basalt, cinder/scoria ground, and a cliff rock for triplanar walls. Start from the downloaded CC0 sets (ambientCG, Poly Haven) and colour-grade them consistently toward Io basalt. Note which are procedural and which are real scans.
3. **Scanned lava rocks and blocks for scatter**: 6–12 rocks or blocks as GLB, with LODs (about 2k / 500 / 100 tris) and baked albedo and normal. Sources:
   - Poly Haven CC0 rocks recoloured to basalt.
   - Sketchfab CC0/CC BY scans: DAAL a'a/pahoehoe/scoria specimens (CC0), Linosa lava blocks, the Mangere ropy pahoehoe, the Mauna Ulu lava field, Batur, and the fissure 8 cone (CC BY). Optionally also the Institute of Natural History Iceland eruption surveys (CC BY) listed in `[path removed]`.
   - Re-check every licence on the model page; exclude ND, and exclude scans built from third-party video.
4. **Asset access.** Account-specific access instructions removed.
5. **A kit contact sheet** at `[path removed]`: every texture set as a lit sphere or plane preview, plus every mesh rendered with Blender headless (Eevee or Cycles at low samples).
6. `[path removed]` with a citation, licence, URL and modifications for every item.

Rules:
- Python: `[path removed] -I script.py <args>`. The venv has open3d, pymeshlab, trimesh, rasterio, numpy, scipy and PIL; add packages with `uv pip install --python [path removed] <pkg>`.
- Blender is at [path removed] (headless, `-b -P script.py -- args`).
- Keep your scripts in `[path removed]`.
- Run heavy steps (Blender bakes, big meshes) under `flock [path removed]`. The machine has shared processing resources and is shared with the map agent.
- Keep the whole kit under about 2 GB including raw files, and the processed outputs under about 300 MB.
- Don't touch the Helios repo or the workbench worktree.
- The harness may block .md report files, which is why the credits file is .txt.

When done, reply with:
- a concise summary of the kit items with their licences;
- the contact sheet path.
