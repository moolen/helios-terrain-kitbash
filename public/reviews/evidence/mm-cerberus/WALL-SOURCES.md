# Round 6: true 3D basalt wall sources

Verified and acquired 2026-10-14 from the first-party Sketchfab API and the licence records inside the downloaded archives. Both selected assets are freely downloadable **CC BY 4.0 photogrammetry meshes**, rather than airborne-lidar DEMs. The original 3DEP Snake River / Malad / Dry Falls top-down DEMs remain historically credited, but do not meet this round's true 3D wall-source requirement.

## Acquired meshes

| Source | Primary source and author | Verified licence | Source reconstruction | Download |
|---|---|---|---|---|
| Iceland Basalt Canyon | [Model](https://sketchfab.com/3d-models/iceland-basalt-canyon-8a1440f9f4fb4998a7a3cb4cecfa868f), [Sircher](https://sketchfab.com/Sircher); [API metadata](https://api.sketchfab.com/v3/models/8a1440f9f4fb4998a7a3cb4cecfa868f) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Author explicitly describes an Agisoft videogrammetry scan reconstructed from 85 frames of [this video](https://www.youtube.com/watch?v=RIJuiGHX5fw). API: 334,568 faces, 181,002 vertices. | glTF ZIP, 29,794,885 bytes; SHA256 `a91a803e59aa5c088a51c87564cfa34bac0646d5e4ee759ec4071bf6da5b26a1` |
| Basalt organs (photogrammetry) | [Model](https://sketchfab.com/3d-models/basalt-organs-photogrammetry-397bfb89ddbe4b37916e1073a21e8df0), [photogrammetryblender3D](https://sketchfab.com/photogrammetryblender3D); [API metadata](https://api.sketchfab.com/v3/models/397bfb89ddbe4b37916e1073a21e8df0) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Author explicitly identifies photogrammetry, Sony DSC HX-100V, and L'Entre-Deux, Réunion Island. API: 504,323 faces, 252,539 vertices. | glTF ZIP, 15,980,849 bytes; SHA256 `965db4687993fa5dc8985bb21e3ef75435ceaa29dac1af5b6befedc793d8f3fe` |

The archived `license.txt` and glTF `asset.extras`[path removed]`manifest-sha256.json`.

Work paths, deliberately outside the repository:

- `[path removed]`
- `[path removed]`
- Each source folder also contains `metadata.json`, `download-formats.json`, `thumbnail.jpg`, the original ZIP, `[path removed]` and `manifest-sha256.json`.

The glTF download was chosen because it preserves the original scan geometry and UV texture and is directly importable in headless Blender. Mesh splits in the download occur at the 16-bit vertex limit and are not spatial wall modules; import/join before selecting contiguous wall crops.

## Source quality and scale limits

**Iceland:** inspection of the author's thumbnail shows genuine irregular protrusions, recesses and broken column forms, but also missing coverage, disconnected floating patches, water and vegetation. Select continuous exposed-bank interiors; discard water/floor geometry and peripheral fragments. The complete canyon is not a ready-made wall module. No exact canyon name or survey-grade metric calibration is asserted by the author's description; do not claim that the site is verified as Stuðlagil or that file units are measured metres. The linked video's independent metadata could not be retrieved (YouTube oEmbed returned HTTP 403); the scan author's API description is the available acquisition statement.

**Réunion:** inspection shows deep column joints and a compact weathered column face. Column interiors can look rounded in the source thumbnail; crisp target silhouettes must come from actual geometry and source joints rather than smoothing or invented fracture detail. The authored material must remove the cool Earth grade. This is a small source patch in arbitrary coordinates, not a calibrated 100–400 m cliff.

Apply each glTF node hierarchy before deciding vertical and along-wall axes:

- Iceland raw bounds are approximately X `−18.82…45.47`, Y `−32.69…16.93`, Z `−77.89…130.72`; the canyon runs chiefly along Z. Its root applies a roughly 9.93° rotation about X plus translation; glTF world is approximately Y-up.
- Réunion raw bounds are approximately X `−0.512…0.969`, Y `1.025…2.825`, Z `−0.983…1.010`. The root maps raw X to world Y, raw Z to world −X, raw Y to world −Z, with uniform factor `2.1595` and a small rotation. Raw X is therefore the vertical direction after the supplied root transform, not raw Y.

These bounds are an inspection of the downloaded coordinates, **not surveyed sizes**. Cutting, rescaling to 20–150 m wide modules / 100–400 m wall heights, anisotropic fitting, stacking, corner trimming, material grading, ledge dust and placement along Mars fissure lips are authored modifications. The sources establish terrestrial 3D surface detail; they do not establish Cerberus column dimensions or Mars stratigraphy. Record those distinctions in the kit and placement export.

## Comparison references

Use the two genuine Snake River canyon photographs below alongside Cerberus images; the previous `[path removed]` is actually Malad Gorge.

| Visual reference only | Primary/licence record | Existing local image |
|---|---|---|
| Snake River Canyon Idaho 2007 (cut), from Perrine Memorial Bridge, Twin Falls; chadh | [Commons licence/source record](https://commons.wikimedia.org/wiki/File:Snake_River_Canyon_Idaho_2007_(cut).jpg), [original file record](https://commons.wikimedia.org/wiki/File:Snake_River_Canyon_Idaho_2007.jpg), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | `[path removed]` |
| Snake River and Blue Lakes Country Club, 8 July 1989; Dual Freq, own work | [Author's Commons upload record](https://commons.wikimedia.org/wiki/File:Snake_River_and_Blue_Lakes_Country_Club_July_1989.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | `[path removed]` |
| Cerberus Fossae PSP_007131_1905; NASA/JPL/University of Arizona, with Jim Secosky / WolfmanSF annotation in the local image | [HiRISE first-party image record and public-domain usage policy](https://www.uahirise.org/PSP_007131_1905); official map-projected source scale 25 cm/pixel, original acquisition 3 February 2008. The local annotated/downsampled image has a 1,000 m scale bar and is not itself a native 25 cm raster. | `[path removed]` |
| Cerberus twin fissures, PSP_009280_1905 RED orthoimage, same crop as base terrain; NASA/JPL/University of Arizona | [HiRISE DTM/ortho source record](https://www.uahirise.org/dtm/dtm.php?ID=PSP_009280_1905), public domain; local crop is 1 m RED ortho imagery | `[path removed]` |
| Cerberus fossa-wall DTEEC_017719_1890_017218_1890_A01 RED orthoimage; NASA/JPL/University of Arizona | [HiRISE first-party DTM/ortho source record](https://www.uahirise.org/dtm/dtm.php?ID=ESP_017719_1890), public domain; local crop is 1 m RED ortho imagery | `[path removed]` |

Fresh primary page/API snapshots and copies of those local reference images are in `[path removed]`. The photos are visual references, not textures or geometry. In particular, comparing a render with an Earth photograph does not establish a measured Mars wall profile.

The Snake River foreground provides the strongest immediate comparison for deeply shadowed irregular vertical ribs, variable face widths, interrupted ledges, recesses between ribs, and a talus apron that rises into the chutes. Cerberus orbital imagery provides the fissure plan, sharp lip, cliff-over-talus proportions, rubble/boulder continuity and wall/floor tonal separation. Assess both references every iteration: a scan-derived surface can still fail visually through stretched placement, repeated crops, uncovered seams, exaggerated columns or a continuous lower curtain.

## Acquisition controls

The token was read only into isolated Python memory and used only in the `[account access removed]` header of `api.sketchfab.com`[path removed]`[path removed] -I` while holding `[path removed]`. No browser or unrelated process was started or killed.

## Continued source search: stronger coherent wall, 14 October

The first library's Iceland cut retained only a small fraction of its full canyon mesh, and the Réunion source contains weathered column interiors. A second first-party Sketchfab search therefore targeted basalt cliff, Stuðlagil, Giant's Causeway cliff, Devils Postpile, Snake River canyon, Columbia basalt, basalt canyon and columnar basalt. Source metadata and author's thumbnails are archived in `[path removed]` and `[path removed]`. Search hits do not become used sources merely by appearing in this table.

| Candidate / first-party model metadata | Licence / faces | Acquisition evidence and visual assessment | Decision |
|---|---|---|---|
| [Cape Stolbchaty, Kunashir](https://api.sketchfab.com/v3/models/fb29b59bbd4341d295e21cc12831bab4), [Mikhail Volkov (mgv)](https://sketchfab.com/mgv) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 399,999 faces / 209,788 vertices | Author tags `photogrammetry` and `3dscan`, identifies the basalt cape and columnar joints; thumbnail shows a coherent layered column face with projecting buttress, recessed corner and near-vertical back wall. Grass above, shore floor and peripheral holes require removal. Author's general text mentions 40–50 m site cliffs, but is not a survey calibration of this mesh. | **Acquired as the strongest extra basalt wall source.** |
| [Devils Postpile National Monument](https://api.sketchfab.com/v3/models/c1e498cc38994911a06e28b1903912f2), [Matthew Strong](https://sketchfab.com/technolizardms) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), 1,809,283 faces | Author tags `photogrametry`, `metashape` and `photoscan`; no longer acquisition description. Thumbnail shows a continuous upper column wall with a large broken-column rubble apron, but sparse foreground/peripheral reconstruction and trees. | Backup, not downloaded. |
| [Palisades Cliffs, NJ](https://api.sketchfab.com/v3/models/055e1924c6b14359a660a3f781f3227a), [Sara Carena](https://sketchfab.com/saracarena1) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), 116,692 faces | Author tags `metashape` and `agisoft`; identifies the State Line Lookout, Alpine outcrop as a **Triassic diabase sill**, rather than basalt lava. Thumbnail has broad irregular ribs, deep alcoves and an apron with trees. Excellent macroform analogue, different emplacement geology. | Backup analogue, not downloaded. |
| [Shore Rocks River Basalt PBR Scan](https://api.sketchfab.com/v3/models/77585c1bdcd14d8790af67ccf80e50dc), [Pers Scans](https://sketchfab.com/perz_scans) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 257,098 faces | Author explicitly states a neutral-light Iceland river-shore 3D scan, cleaned/decimated; thumbnail shows coherent angular fragmented basalt, but chiefly a low rocky bank rather than columnar wall. | Lower-wall/rubble option, not downloaded. |
| [Disyunción columnar en Boscarro Sud](https://api.sketchfab.com/v3/models/412c95b8fe38486db5b83eb43302063c), [ljbordehore](https://sketchfab.com/ljbordehore) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 328,971 faces | Author identifies the basalt quarry at Boscarró Sur and UPM's 2022 virtual-volcano education project. Thumbnail shows coherent two-tier columns with a broken/entablature top, but this particular description does not state the scan method; some vegetation and weathered interiors remain. | Did not acquire; selected source has explicit photogrammetry tags and larger wall variation. |
| [Schanck1](https://api.sketchfab.com/v3/models/10d89fe246c041d09512d45ebcd08efa), [AusGeol.org](https://sketchfab.com/AusGeol) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 117,603 faces | Author identifies Cape Schanck columnar vesicular basalt above volcanic breccia; `agisoft` / `photoscan` tags. Thumbnail shows a small coherent fractured wall patch with a low hole and ragged top. | Backup, not downloaded. |
| [Basaltic andesites, Spain](https://api.sketchfab.com/v3/models/bcd6c498c7474e8693f29ec68dcf52cc), [Sara Carena](https://sketchfab.com/saracarena1) | [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), 524,410 faces | Explicit drone scans by Apoorv Avasthy; author identifies basaltic andesite, rhyolitic ignimbrite contact and fossil beach. Thumbnail shows a long, shallow wall with strongly inclined fractures. | Different lithology/shape, not downloaded. |
| [Evel Knievel Snake River Canyon Jump Site](https://api.sketchfab.com/v3/models/b94f6aa5791c4af9ac0e111992e0a64d), [Brian Trepanier](https://sketchfab.com/CMBC) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 523,310 faces | Description identifies Twin Falls but no scanning method. Thumbnail is a textured aerial terrain surface plus an added rocket; no usable coherent close cliff is established. | Rejected for wall-source purpose. |

Other Columbia search hits were chiefly hand specimens, and direct Stuðlagil / Giant's Causeway-cliff searches returned no downloadable wall matching those phrases. No airborne-lidar DEM was substituted for a 3D scan.

### Acquired Cape Stolbchaty files

Model: [Мыс Столбчатый, остров Кунашир / Cape Stolbchaty, Kunashir](https://sketchfab.com/3d-models/fb29b59bbd4341d295e21cc12831bab4), Mikhail Volkov, CC BY 4.0. ZIP: **40,571,649 bytes**, SHA256 `655ce4ca104abc4e7b5b6db4e336e48f561ca264c30db01f2ae8b9456c60f012`; extracted files total 44,869,209 bytes. Source: `[path removed]`. Metadata, thumbnail, original ZIP, archive licence and exact per-file SHA256 manifest are in the same isolated folder. The same token-header, `python -I`, safe-extraction and per-step `flock` controls apply; no mesh processing or browser was run for this continued search.

This glTF contains **six separate diffuse materials/UV atlases**, `Stolbchatyi-400k.1001` through `.1006`, rather than one texture for the whole scan. All six must survive import and any bake source setup. Materials are authored as double-sided and `KHR_materials_unlit`; that setting is a scan viewer choice, not physically measured basalt reflectance. The diffuse images contain photographed lighting and vegetation, and must not be described as measured neutral-light PBR albedos.

The supplied root transform uses uniform scale approximately `[path removed]` and maps raw X to world Y, raw Y to world −Z, and raw Z to world −X, with a small orientation adjustment and translation. Raw X is thus the approximate vertical axis. No independent metric calibration or source point-cloud precision is supplied. Preserve scan shape in rigid crop interiors; all final module sizes and any depth/height fitting remain explicitly authored.

### Acquired backup: Palisades Cliffs, New Jersey

The previously shortlisted [Palisades Cliffs, NJ, USA](https://sketchfab.com/3d-models/palisades-cliffs-nj-usa-055e1924c6b14359a660a3f781f3227a) by [Sara Carena](https://sketchfab.com/saracarena1) was subsequently acquired as a stronger macroform backup. The fresh [first-party API record](https://api.sketchfab.com/v3/models/055e1924c6b14359a660a3f781f3227a) and downloaded `license.txt` both confirm **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**, attribution required and no commercial use; this project is non-commercial. The author's `metashape` and `agisoft` tags establish the photogrammetry software association, but the description supplies no camera, survey precision, control points or capture scale.

This is the **Triassic diabase sill** at State Line Lookout, Alpine, NJ, as identified by the author. It has basalt-like intrusive composition and columnar joints, but is not a basalt lava-flow scan or a Mars observation. Use it as an explicitly named terrestrial igneous-cliff analogue. The thumbnail shows broad irregular ribs, deep alcoves and a cliff-over-apron profile; trees/branches in the apron and any incomplete peripheral reconstruction must be excluded from useful wall crops. Diffuse images retain photographic shadows and Earth colour, not calibrated neutral-light PBR reflectance.

API counts: **116,692 faces / 65,629 vertices**. Downloaded glTF ZIP: **18,060,373 bytes**, SHA256 `45a776647c0a19f10fcb22b3d4a2237e80443105ef1c9a02552f822b624221b1`; safe extracted total **19,427,928 bytes**. Files are in `[path removed]`:

- `[path removed]`, `[path removed]`, `[path removed]`.
- Four diffuse UV atlases `[path removed]` through `material3_baseColor.jpeg`. glTF materials are ordered **0, 3, 2, 1**; preserve their assigned texture indices rather than assume numeric file order. No tangent normal texture is supplied.
- `metadata.json`, `thumbnail.jpg`, original `gltf.zip`, `download-formats.json`, `manifest-sha256.json` with exact per-file hashes.

Apply the entire node hierarchy before cropping. The top `Sketchfab_model` matrix has uniform scale approximately **0.672**, a rotation and translation `[-11.20545, 32.24029, -2.41554]`. Its child **`model.fbx` applies `diag(1, −1, −1)`**, a 180° X-axis flip. Thus approximate vertical is **raw −Y**, and along-wall is mostly raw X; using only the top node transform would invert the wall. Exact matrices are retained in `scene.gltf`, and Blender's glTF importer can apply the hierarchy. File units remain uncalibrated, so all final module dimensions, plane cuts, resizing, LOD reductions, geometry normal/AO baking and any eventual Mars placement are authored modifications.

The download, safe archive extraction and file hashing held `[path removed]` and used isolated Python with `-I`. No source code execution, mesh processing, Blender work or browser was performed in this acquisition step.

### Acquired basaltic lava-flow backup: Devils Postpile

The previously shortlisted [Devils Postpile National Monument, USA](https://sketchfab.com/3d-models/devils-postpile-national-monument-usa-c1e498cc38994911a06e28b1903912f2), by [Matthew Strong (technolizardms)](https://sketchfab.com/technolizardms), was subsequently acquired. The [first-party Sketchfab metadata](https://api.sketchfab.com/v3/models/c1e498cc38994911a06e28b1903912f2) and archive `license.txt` both confirm **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**. Attribution is required; use is non-commercial, as authorized for this project. Author tags are `photogrametry`, `metashape` and `photoscan`. The model description is blank, so camera, control points, source image count, survey accuracy and calibrated metric scale are not established.

The [National Park Service's first-party geology account](https://www.nps.gov/depo/learn/nature/geology.htm) identifies the formation as a cooling basaltic lava flow, erupted approximately 80,000–100,000 years ago, whose column faces were exposed by glaciation. The [NPS geologic-formations page](https://www.nps.gov/depo/learn/nature/geologicformations.htm) calls the Postpile an example of columnar basalt. **The detailed NPS geology account formally names the rock basaltic trachyandesite**; this chemical precision is retained rather than claim a chemically pure basalt. It is an **extrusive basaltic lava-flow analogue**, distinct from the intrusive Palisades diabase sill. No connection to measured Cerberus lava compositions or stratigraphy is asserted. NPS page snapshots are saved alongside the scan metadata.

The source thumbnail shows a coherent near-vertical upper column wall above large broken-column rubble, with trees and incomplete coverage on the foreground/periphery. Crop continuous cliff interiors and remove vegetation, gross scan bridges and peripheral fragments. Broken-column rubble can support an explicitly separate talus source crop if useful. Source photograph lighting remains in the diffuse atlas and must not be described as calibrated reflectance; the viewer's emissive/low-roughness appearance is an artistic setting rather than a measured rock property.

API source counts: **1,809,283 faces / 931,714 vertices**. ZIP: **149,344,608 bytes**, SHA256 `6c0c6d6002f8b493c8b6aed40442fe2ce372512270b24a538c7869531a88e1f0`; safe extracted total **188,075,747 bytes**. These are raw work assets, not the processed scene budget. Folder: `[path removed]`.

- `[path removed]`, `[path removed]`, `[path removed]`.
- **One material / UV atlas** named `devils_postpile`, with `[path removed]` and `devils_postpile_metallicRoughness.png`, each **8192 × 8192**. No tangent-space normal image is supplied; geometry normal baking is required. The material reuses albedo as emissive and the second image as occlusion/metallic-roughness; these viewer mappings need independent artistic treatment for Mars.
- The glTF's **34 mesh chunks** reflect index-limit splitting, not ready-made wall modules. Import/join all source chunks before selecting spatial wall crops.
- `metadata.json`, `thumbnail.jpg`, original `gltf.zip`, `download-formats.json`, `manifest-sha256.json`, and NPS primary-page snapshots. Exact downloaded/extracted-file hashes are preserved.

The root node has a rotation of approximately unit scale and translation `[50.37977, 61.02862, 92.25121]`, with no second-node flip. Approximate axes are raw **Y → world Y**, raw **Z → world X**, raw **X → world −Z**, with an appreciable tilt; apply the exact matrix from `scene.gltf`, rather than assume a raw axis is level. The arbitrary root orientation does not establish survey calibration. Cropping, final dimensional scaling, grading, normal/AO baking, decimation and any eventual placement remain authored modifications of terrestrial scan geometry.

Acquisition/extraction and hashing held `[path removed]`, with isolated `python -I` and the existing safe ZIP checks. Only source metadata/header inspection accompanied the download; no Blender, source mesh processing or browser was run by this research task.
