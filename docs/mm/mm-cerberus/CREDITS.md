# mm-cerberus: sources, licences and what is real

Helios is non-commercial. Every source used in the scene is listed here, with what was done to it. Procedural parts are named as procedural; nothing procedural is presented as scan data.

## Terrain data (real)

| Use | Source | Licence | Modifications |
|---|---|---|---|
| Base terrain, 1 m core (plains, trough floors, collapsed block, wall plan and large-scale wall shape) | HiRISE DTM DTEEC_009280_1905_009557_1905_A01 (PSP_009280_1905 / PSP_009557_1905), NASA/JPL/University of Arizona; controlled COG from USGS Astrogeology (astrogeo-ard, `[path removed]`) | Public domain (NASA/JPL/UArizona; USGS) | Warped (bilinear) into a Mars-sphere azimuthal-equidistant frame centred 10.30N 156.95E at 1 m; heights unchanged; 220 m feather into CTX at the strip edges; wall cells rebuilt (see walls) |
| Layout and padding of the E/W margins (outside the HiRISE strip), context apron | USGS controlled CTX DTM mosaic, 10 stacked pair DTMs (geoid-adjusted, 20 m), USGS Astrogeology / NASA/JPL/MSSS; list in `[path removed]` | Public domain | Despiked (pair-disagreement spikes), filtered 10 m on clean cells / 32 m on disagreement cells, moved onto the HiRISE heights with a fitted quadratic (HiRISE - CTX = 48..84 m N->S); 1 m detail transplanted from the HiRISE strip along the trough direction (plains/floors only). The native CTX source remains 20 m. |
| Plains detail: young platy / rafted lava | HiRISE DTM DTEEC_004202_1915_003701_1915_A01 (Amazonis platy flows), NASA/JPL/UArizona | Public domain | High-pass (45 m), clipped +-4 m, mirror-tiled; full weight in the CTX margins, 25 % on the HiRISE plains |
| Rootless-cone clusters (2 sites) | HiRISE DTM DTEEC_001606_1900_002226_1900_A01 (Athabasca Valles cone field), NASA/JPL/UArizona; USGS COG | Public domain | High-pass (60 m), stamped with a 250 m feather, kept clear of the hub pads |
| Wall module: cliff band, straight runs | USGS 3DEP 1 m lidar, Snake River Canyon S wall at Twin Falls / Blue Lakes alcove, Idaho (project ID_SouthernID_2018_D19) | Public domain (USGS) | Older macro backing: unrolled along a hand-placed line, uniformly scaled x2.6 and x1.6 (two variants); native-sampled 4 m high-pass relief has amplitude gain 2.0. This scaled backing is distinct from the unscaled default face patches described below. |
| Wall module: benched walls | USGS 3DEP 1 m lidar, Dry Falls / Grand Coulee, Washington (WA_NorthCentral_2021_B21) | Public domain (USGS) | Unrolled, scaled x2.4 |
| Wall module: crisp narrow walls | USGS 3DEP 1 m lidar, Malad Gorge, Idaho (ID_SouthernID_2018_D19) | Public domain (USGS) | Unrolled, scaled x2.8 |
| Talus chutes and spurs below the cliff band | USGS (2018b): Kilauea Volcano, HI July 2018 airborne lidar (0.5 m DTM), NCALM/CRREL/USGS, distributed by OpenTopography, https://doi.org/10.5069/G9M32SV1 | No licence stated ('Not Provided'); public USGS-funded research data, used with citation (non-commercial project) | Older macro talus: Halemaumau collapse walls polar-unrolled, high-pass 18 m on 29–44° source talus, procedurally remapped below the scaled wall variants with chute amplitude gain 2.8, laid on a 36° extension. Separate round-3/4 fine rubble uses gain 1.0 as described below. |
| Visual reference only (no data used) | HiRISE DTEEC_017719_1890 fossa walls and its ortho (boulder trails, boulder falls, cliff-over-talus profile) | Public domain | - |

## Kit (Mars kit `[path removed]`, regraded to the measured palette)

| Item | Use | Licence | Credit |
|---|---|---|---|
| mars-dusty-regolith | terrain texture layer | CC0 1.0 | red_sand by Rohit Seervi, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/red_sand) |
| mars-dust-mantled-bedrock | terrain texture layer | CC0 1.0 | dark_rock by Amal Kumar, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/dark_rock) |
| mars-layered-basalt-cliff | terrain texture layer | CC0 1.0 | dark_rock_02 by Amal Kumar, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/dark_rock_02) |
| mars-layered-sedimentary-cliff | terrain texture layer | CC0 1.0 | cliff_side by James Ray Cock, Dario Barresi and Jenelle van Heerden, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/cliff_side) |
| mars-pebbly-soil | terrain texture layer | CC0 1.0 | dry_ground_rocks by Rob Tuytel, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/dry_ground_rocks) |
| mars-basaltic-sand | terrain texture layer | CC0 1.0 | coast_sand_05 by Rob Tuytel and Dario Barresi, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/coast_sand_05) |
| mars-wind-ripples | terrain texture layer | CC0 1.0 | aerial_beach_01 by Rob Tuytel, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/aerial_beach_01) |
| mars-light-toned-bedrock | terrain texture layer | CC0 1.0 | rock_boulder_cracked by Dimitrios Savva and Dario Barresi, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/rock_boulder_cracked) |
| mars-olympus-black-lava | terrain texture layer | CC BY 4.0 | "Lava field from Mauna Ulu - Kilauea, Hawaii" by Tom (trbaker, https://sketchfab.com/trbaker), CC BY 4.0; tileable set from the Io kit (basalt-pahoehoe-fresh) (https://sketchfab.com/3d-models/923fcaded6f646b09a7abb935bc82893) |
| mars-polygon-cracked-ground | terrain texture layer | CC0 1.0 | mud_cracked_dry_03 by Dario Barresi and Dimitrios Savva, Poly Haven (polyhaven.com), CC0 (https://polyhaven.com/a/mud_cracked_dry_03) |
| mars-tex-ripples-acg (mars-jezero-kit candidate, ambientCG Ground098) | small ripples in the sand lows | CC0 | ambientCG.com, regraded to #9c6943 |
| mars-rock-rochette | scatter (plain, one-sided scan, sunk 30 %) | CC BY 4.0 | "M2020 ZCAM -- Rochette pre-abrasion, sol 180", NASA/JPL-Caltech/MSSS/ASU/Cornell; 3D model by the Mastcam-Z team (sketchfab.com/Mastcam-Z), CC BY 4.0 |
| mars-rock-bettys-bedded | scatter (outcrop, one-sided scan, sunk 30 %) | CC BY 4.0 | "Bettys Rock (VR)", NASA/JPL-Caltech/MSSS/ASU/Cornell; 3D model by the Mastcam-Z team (sketchfab.com/Mastcam-Z), CC BY 4.0 |
| mars-rock-meeker-outcrop | scatter (outcrop, one-sided scan, sunk 30 %) | CC BY 4.0 | "M2020 ZCAM -- Mount Meeker, sol 856", NASA/JPL-Caltech/MSSS/ASU/Cornell; 3D model by the Mastcam-Z team (sketchfab.com/Mastcam-Z), CC BY 4.0 |
| mars-boulder-namaqualand-03 | scatter (talus) | CC0 1.0 | Namaqualand Boulder 03 by Jenelle van Heerden and Dario Barresi, Poly Haven (polyhaven.com), CC0 |
| mars-boulder-namaqualand-04 | scatter (talus) | CC0 1.0 | Namaqualand Boulder 04 by Jenelle van Heerden, Poly Haven (polyhaven.com), CC0 |
| mars-boulder-ph07 | scatter (talus) | CC0 1.0 | Rock 07, Poly Haven (polyhaven.com), CC0 |
| mars-slab-ph09 | scatter (talus) | CC0 1.0 | Rock 09, Poly Haven (polyhaven.com), CC0 |
| mars-ventifact-ensg | scatter (plain) | CC BY 4.0 | "Galet eolise - ventifact" by Ecole Nationale Superieure de Geologie (https://sketchfab.com/ENSGeologie), CC BY 4.0 |
| mars-rock-ramon-jagged | scatter (flow) | CC BY 4.0 | "Desert Rock Formation, Makhtesh Ramon, Israel" by Doron Altaratz (https://sketchfab.com/doron_altaratz), CC BY 4.0 |
| mars-rock-aa-jagged | scatter (flow) | CC0 1.0 | "Igneous rock: Basalt (A'a Lava Rock)" by Digital Atlas of Ancient Life (model by Emily Hauf), Sketchfab, CC0 |

## Procedural (our design, not scan data)

- Placement of the wall modules: the spur-and-gully rhythm (smooth noise along the wall scaling the upper-wall depth +-30 %), the depth remap that maps the real (smoothed) wall depth onto the module profile, the softmax blending of the module variants along the walls, the along-wall coordinate (Poisson-integrated wall tangent), and the 36 deg talus extension below each module.
- The CTX-margin detail transplant (real HiRISE relief, procedurally placed).
- All masks: dust, sand in the lows, wind streaks (downwind smear of obstacles; wind from azimuth 25 deg is our choice), cliff band / talus, platy cover, thermal cells, deposit, hubs.
- Thermal-cell positions (on the deepest floor line, randomly chosen), hub / deposit / expansion sites (from the research layout), rock placement and the boulder trails (steepest-descent roll on the final DEM).
- Sky, haze, sun and all shading.

## Round 2 additions
- Kit wall modules mars-wall-basalt-snake-a / -b, mars-wall-basalt-malad (USGS 3DEP 1 m lidar, public domain) placed by `cliffs.py` (optional view `?modules=1`).
- Cliff-band ribbons (`ribbons.py`): the band shape is data-derived (rebuilt wall); the stacked-flow beds, flow-top notches and columnar grooves on it are **procedural**.
- Thermal vapour and talus colour streaks: procedural.

## Round 3 (Codex continuation)
- Default cliff faces now use full native-metre horizontal-offset profiles from the **Snake River and Malad 1 m lidar** listed above. Their complete shape and relative lip offsets are retained with one panel translation; height variation crops a patch at its original scale (up to 69.5 m / 54.5 m), without stretching or high-pass filtering. Finite panels reflect along the lip as procedural placement. Hidden cap/foot connectors are procedural. Normals are derivatives of the same sampled face geometry, retained at all browser LODs. The old procedural beds/notches are removed from the default face. These are transplanted Earth data, not observations of a Mars cliff. A 1 m top-down DTM cannot recover true overhangs or sub-metre fractures.
- Alcove/amphitheatre offsets, variable band heights, collapse selection, talus extensions and detached pillar meshes are **procedural placement/geometry**, not scan data. The original Mars plan and broad trough relief remain the layout source.
- Deposit exposure selection follows connected slope/elevation on the collapsed block; it is an authored gameplay deposit, not a measured mineral detection. Small debris uses the existing credited rock meshes with procedural placement.
- CTX clean cells are filtered at 10 m instead of 32 m; detected stereo-disagreement cells retain stronger filtering. CTX remains 20 m source data, with transplanted higher-resolution detail explicitly labelled.
- Mesh gzip/MMD3 byte packing is lossless and changes no geometry.
- Visual comparisons in this continuation: local HiRISE fossa-wall ortho/PSP_007131_1905_RED; local Snake River photo-c1 (credit/licence in its photos.json); NASA/JPL-Caltech/MSSS/ASU rover panorama PIA24816. Reference photos are not used as textures.
- Analogue reference `[path removed]` is actually **Malad Gorge**, photographed by photophat, CC BY 3.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Malad_Gorge_-_panoramio_-_photophat_(1).jpg (the research directory name differs from the photo subject).
- Lower-apron microgeometry also receives the Kīlauea talus strip's high-pass at 6 m (gain 1.0), mirror-placed only on lower 19–45° apron cells. Its polar unroll has 1 m radial sampling and nominal 1 m angular sampling at radius 330 m; angular ground spacing varies with radius. Same July 2018 OpenTopography source/DOI above. This is transplanted measured rubble, not a Mars measurement. The older depth-remapped macro talus still uses the amplified source listed in the table.
- The CTX-derived hillshade in `[path removed]` is a layout reference from measured DEM data, not an orbital photograph. That folder's `photo-c1.jpg` is HiRISE imagery despite the CTX folder name; attribution remains in its photos.json.
- Native face extraction uses the sampled plateau datum and retains measured ledge heights above the first ≥60° step in the unrolled lip window. Flat plateau padding is excluded. Original along-source metre coordinates are retained after unroll filtering. Missing or short columns use a neighbouring measured column, explicitly a **procedural continuation**, not new scan coverage. The browser's closest face grid samples at 1 m; distant LOD remains coarser.
- The backing/apron repair fills small projection holes and interpolates its authored target continuously onto the 1 m grid, without retaining old wall residuals. This is procedural kit-bash reconstruction, separate from the unsmoothed native face patches.
- A fixed-camera comparison against a lossless copy of the same DEM normals identified the old JPEG's compression grid. The final world normal map uses per-pixel 7-bit octahedral RG in lossless WebP, with reduced normal-vector precision measured in scene.json. This changes shading precision, not geometry, and uses no block compression or spatial smoothing. Source and encoded-pixel SHA256 are recorded; decoded encoded pixels are checked exactly.
- New 0.8–2.6 m scree instances use Ramon-jagged, AA-jagged and PH07 scan meshes already credited in the kit table. Their selection, size, orientation, placement and dust coating are procedural.

## Round 4

- Native Snake/Malad profile interiors use rigid 80 m pose frames; source along-wall and height intervals retain their measured metre scale. The connecting 8 m joins interpolate placement and are explicitly procedural. Alcoves/collapse placement is larger and more frequent; no source relief gain or wall-face smoothing is added. The top-down DTM and monotone inversion limits remain.
- The same Kīlauea nominal-metre rubble strip now also covers steep lower walls, with gain 1.0 and native face coverage excluded. This remains a relief transplant with the polar sampling limits described above.
- Embedded fracture fragments use the credited Ramon-jagged, AA-jagged and PH07 scan meshes. They are procedurally resized to 1.5–7 m, aligned to the DEM normal and partly buried. They are not new lidar measurements or a scan of the Mars wall.
- World normals use per-pixel RG8 octahedral encoding in lossless WebP. Vector precision is measured in scene.json; geometry is unchanged by this encoding. MFB4 groups original float-record byte planes before gzip and is strictly lossless, verified by original decoded SHA256.
- Iteration 2 replaces the older amplified depth-remapped lower-wall backing with the Mars base DEM. Native Earth face patches and the explicitly authored backing/upper apron remain transplants. The Mars stereo source includes uncertain shadowed wall surfaces; this change cannot manufacture scan detail there. The older scaled-module descriptions above record the development history, not the shipped backing.
- The boxed optional round-2 module payload is retired from public assets. Unused texture-array slots 3 and 6 retain their layout and borders, with their unused interiors wiped in JPEG coefficient space. All active decoded pixels remain exact; their SHA256 values are recorded in layers.json. Original source credits remain.

## Round 5

- The owner authorized one additional round restricted to fissure faces. The existing **Snake River / Malad USGS 3DEP 1 m top-down lidar DTMs** supply the face-offset crops. `flow_faces.py` stacks separately cropped source profiles, rigidly translated at their native metre scale, to cover taller bands. Crop heights, along-source selection, reflection, flow arrangement and the finite flow-top joins are **authored placement**, not measured Mars basalt stratigraphy. Native relative horizontal and vertical crop intervals are retained; the existing 80 m rigid pose interiors and 8 m procedural pose joins remain. No new raw point-cloud wall scan or sub-metre column fracture data was acquired.
- Shared physical depth rows replace the former fractional-height correspondence between neighboring columns. Foot continuations lie inside the authored upper talus apron. These connectors are procedural and are separate from exposed native profiles. The existing backing/apron reconstruction remains authored; no additional native-face blur or source relief amplification is applied.
- Relative translation between flow crops can create an authored recess or overhang at their join. These joins are not recovered from the top-down lidar. The hidden backing uses a sorted deepest envelope for folded horizontal offsets, with the upper plateau preserved behind the cap. This is procedural reconstruction; exposed source profiles remain unchanged by that envelope.
- Final source crops select the steepest native interval within each 80 m panel, starting at least 4 m below the plateau datum. Intervals span 16–24 m (Snake) or 12–18 m (Malad), without stretching or compressing the source. Selection minimises median native horizontal width and excludes broad plateau/bench sections; it does not filter the samples. `sourceFlowCrops` records the actual native start depths, crop heights and median widths. Each panel has a rigid local horizontal placement datum, interpolated only in its authored 8 m pose joins; metre-scale relief within each source crop stays intact. The sharp Mars cap connector and 0.8–2.2 m flow-top offsets are authored, not measured lips.
- Final stacks keep one source and coherent along-source positions throughout a contour. This reuses native physical crop interiors in an authored stack; it is not a sequence of independently measured basalt flows. Different source locations across vertically adjacent flows created oversized artificial connectors in the rejected candidate. Coherent source relief removes that mismatch without per-column relief warping.
- Cliff facet normals now come from the selected mesh. Offset sampling of existing PBR side projections reduces the repeated two-metre basalt square; explicit gradients preserve mip selection. Partially resolved side detail fades to the existing source's terminal mip by screen footprint, while geometric face normals stay sharp. A controlled 1080p wall/close/gameplay comparison checked the residual pattern after offset sampling. These are shading changes, not additional scan coverage. Existing texture images, licences and world-normal encoding remain as credited above.
- Round 5 comparisons use the same local **Malad Gorge photograph by photophat, CC BY 3.0**, and **HiRISE PSP_007131_1905_RED** reference identified above. They are visual references, not textures. A 1 m DTM and an authored flow stack cannot establish true column fractures or overhangs.
- Iteration 8 retains native source samples in the exported binary, with runtime column spacing 1/4/24/48 m at the unchanged distance thresholds and flow corners retained. Only wholly buried continuation quads below the maximum native cut plus a 1 m guard are skipped. Distant proxy terrain nodes around native bands use an 8 px error threshold at distances at least 900 m, compared with 5.2 px elsewhere; this also reduces adjacent proxy ground detail within those nodes. Near native sampling, rock thresholds and the full height/export data remain unchanged. Hard facet shading remains; this LOD choice does not spatially blur the walls.

## Round 6 true 3D wall scan sources

The two scan assets below were acquired for the new wall-module kit. They are terrestrial photogrammetry, not scans of Mars, and have no author-supplied metric calibration. Cut selection, scaling to the Cerberus wall heights, stacking, decimation, normal baking, Mars colour grading, dust, corner treatment and deterministic placement are authored modifications; the final kit manifest records the selected modules. Full first-party metadata, archive hashes and scale/coverage limits are documented in [WALL-SOURCES.md](WALL-SOURCES.md).

| Source | Author / credit | Licence | Acquisition and limits |
|---|---|---|---|
| [Iceland Basalt Canyon](https://sketchfab.com/3d-models/iceland-basalt-canyon-8a1440f9f4fb4998a7a3cb4cecfa868f) | [Sircher](https://sketchfab.com/Sircher) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Agisoft videogrammetry reconstructed by the author from 85 frames of the video linked in the model description; 334,568 source faces. True 3D scan mesh with incomplete peripheral coverage, water and vegetation to exclude from wall crops; file units are not established as measured metres. |
| [Basalt organs (photogrammetry)](https://sketchfab.com/3d-models/basalt-organs-photogrammetry-397bfb89ddbe4b37916e1073a21e8df0) | [photogrammetryblender3D](https://sketchfab.com/photogrammetryblender3D) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Sony DSC HX-100V photogrammetry of the basalt organs at L'Entre-Deux, Réunion Island; 504,323 source faces. Compact weathered column-face patch; not a surveyed 100–400 m cliff. |

Attribution text supplied by the downloaded models:

> This work is based on "Iceland Basalt Canyon" (https://sketchfab.com/3d-models/iceland-basalt-canyon-8a1440f9f4fb4998a7a3cb4cecfa868f) by Sircher (https://sketchfab.com/Sircher) licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/).

> This work is based on "Basalt organs (photogrammetry)" (https://sketchfab.com/3d-models/basalt-organs-photogrammetry-397bfb89ddbe4b37916e1073a21e8df0) by photogrammetryblender3D (https://sketchfab.com/photogrammetryblender3D) licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/).

Additional visual references for this round (not textures or geometry):

- **Snake River Canyon Idaho 2007 (cut)** by chadh, [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/), [Commons source/licence record](https://commons.wikimedia.org/wiki/File:Snake_River_Canyon_Idaho_2007_(cut).jpg); local `[path removed]`. It is a crop of the photographer's Snake River Canyon image from Perrine Memorial Bridge, Twin Falls.
- **Snake River and Blue Lakes Country Club July 1989** by Dual Freq, own work, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), [author's Commons upload](https://commons.wikimedia.org/wiki/File:Snake_River_and_Blue_Lakes_Country_Club_July_1989.jpg); local `[path removed]`. Reference imagery remains under its source licence.
- The existing credited **HiRISE PSP_007131_1905**, **PSP_009280_1905 RED ortho**, and **DTEEC_017719_1890_017218_1890_A01 RED ortho** are also used for comparison; NASA/JPL/University of Arizona, public domain. Fresh first-party image/DTM page verification is recorded in WALL-SOURCES.md. No new Mars 3D wall measurements are claimed.

Processing for the first round-6 kit uses Blender plane cuts with original scan UVs, rejection of gross reconstruction bridges, and QEM decimation without face smoothing. Two incomplete Iceland cuts are rejected; the usable library contains one Iceland buttress and six Réunion sections. Crops are scaled to a 100 m local height with explicit positive axis scales in the placement file. These scales are authored, including the depth fitting; they do not establish real Cerberus column widths. High-scan facet normals and twelve-ray scan AO are baked, while diffuse colour retains measured photograph luminance after desaturation and grading toward dark Mars basalt. Dust colour follows upward scan facets. The native HCL1/HRL1 export uses the actual scan geometry and AO with neutral cavity (0.5), not invented measured cavity data.

The new talus/backing reconstruction follows the measured Mars lip plan. Its 34° apron, scan choice, overlap, corner-width reduction, finite raster exclusion and neutral outward-facing join material are authored. Plains and floor retain the prior dataset outside the wall repair. Early round-6 aprons clipped inherited residuals to ±1.8m; round 7 replaces these with the separately credited Kilauea fine-rubble strip at native metre spacing, high-pass 6m and clipped to ±1.8m. Additional wall-foot clumps use the existing credited PH07, Namaqualand 03 and AA-jagged scan rocks, with deterministic authored placement. Previous ribbons, face metadata and all older source descriptions remain historical compatibility evidence; they are not the active exposed wall renderer.

### Additional round-6 scan acquisition: Cape Stolbchaty

- **[Мыс Столбчатый, остров Кунашир / Cape Stolbchaty, Kunashir](https://sketchfab.com/3d-models/fb29b59bbd4341d295e21cc12831bab4)** by **[Mikhail Volkov (mgv)](https://sketchfab.com/mgv)**, **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**. First-party tags identify photogrammetry and 3D scanning. The scan contains coherent layered columnar basalt faces and a buttress; 399,999 source faces. Acquired as an additional source candidate for the wall kit, with six original diffuse UV atlases, source metadata, archive licence and hashes preserved. Cropping grass/shore geometry, selecting modules, decimation, normal/AO baking, colour grading, sizing and any eventual placement are authored modifications. The source is terrestrial; its file units have no independently verified survey calibration. See [WALL-SOURCES.md](WALL-SOURCES.md) for acquisition evidence and exact archive hash.

> This work is based on "Мыс Столбчатый, остров Кунашир" (https://sketchfab.com/3d-models/fb29b59bbd4341d295e21cc12831bab4) by Mikhail Volkov (https://sketchfab.com/mgv) licensed under CC-BY-4.0 (https://creativecommons.org/licenses/by/4.0/).

### Additional round-6 backup scan: Palisades Cliffs

- **[Palisades Cliffs, NJ, USA](https://sketchfab.com/3d-models/palisades-cliffs-nj-usa-055e1924c6b14359a660a3f781f3227a)** by **[Sara Carena](https://sketchfab.com/saracarena1)**, **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**, acquired for this non-commercial project. First-party tags identify Agisoft/Metashape; the author's description identifies the **Triassic diabase sill** at State Line Lookout, Alpine, New Jersey, with columnar joints. It is an igneous cliff analogue, **not a basalt lava-flow scan or a Mars wall measurement**. API: 116,692 source faces. Original four photographic UV atlases, source metadata, archive licence and hashes are preserved. Removing trees/apron/peripheral holes, selecting wall crops, grading photographic lighting/colour, normal/AO baking, decimating, scaling and any eventual placement are authored modifications. Neither metric scan calibration nor source precision is established. Acquisition and transform details are in [WALL-SOURCES.md](WALL-SOURCES.md).

> This work is based on "Palisades Cliffs, NJ, USA" (https://sketchfab.com/3d-models/palisades-cliffs-nj-usa-055e1924c6b14359a660a3f781f3227a) by Sara Carena (https://sketchfab.com/saracarena1) licensed under CC-BY-NC-4.0 (https://creativecommons.org/licenses/by-nc/4.0/).

### Additional basaltic lava-flow scan: Devils Postpile

- **[Devils Postpile National Monument, USA](https://sketchfab.com/3d-models/devils-postpile-national-monument-usa-c1e498cc38994911a06e28b1903912f2)** by **[Matthew Strong (technolizardms)](https://sketchfab.com/technolizardms)**, **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**, acquired for this non-commercial project's wall-source library. First-party author tags identify photogrametry, Metashape and PhotoScan; API: 1,809,283 source faces. The one original 8K photographic UV atlas, viewer auxiliary material map, archive licence, metadata and hashes are preserved. Crop selection, removal of vegetation/peripheral reconstruction, grading photographic colour/lighting, normal/AO baking, decimation, sizing and any eventual placement are authored changes. No calibrated metric scale, camera details or survey precision are established. This is a terrestrial **extrusive basaltic lava-flow analogue**, not a measured Cerberus wall.
- Geology verification: **National Park Service**, [Devils Postpile geology](https://www.nps.gov/depo/learn/nature/geology.htm) and [geologic formations](https://www.nps.gov/depo/learn/nature/geologicformations.htm), U.S. federal government text / public domain, textual reference only. NPS describes columnar basalt formed from basaltic lava and formally names the rock **basaltic trachyandesite**. That precision is retained; no claim of chemically pure basalt or measured Mars composition is made. The NPS imagery is not used as texture or geometry.

> This work is based on "Devils Postpile National Monument, USA" (https://sketchfab.com/3d-models/devils-postpile-national-monument-usa-c1e498cc38994911a06e28b1903912f2) by Matthew Strong (https://sketchfab.com/technolizardms) licensed under CC-BY-NC-4.0 (https://creativecommons.org/licenses/by-nc/4.0/).

### Final scan kit processing (rounds 6 and 7)

The current nine-module kit combines six Cape Stolbchaty crops with three
Devils Postpile crops. The Postpile archive's facade winding is repaired to
point outward, without changing scan positions or UVs. Blender applies the
source node hierarchies, cuts the actual surfaces, then authors metre scales;
QEM LODs are re-clipped to those crop planes. High-scan normals/AO and source
photograph luminance are baked into Mars-graded materials. Open crop and scan
boundaries receive dark authored caps; small internal holes are capped locally
0.2m behind their rim rather than extruded into long slivers. Recessed backing continues 200m below
the 100m crop to remain buried beneath debris. Closure counts are recorded per
LOD. Finite exported tangent frames and reduced normal-map gain repair invalid
UV frames without moving or smoothing the scan's cliff vertices. Tall poses
stack overlapping 100–140m pieces instead of extreme vertical scaling.
Separate lip-following join meshes and plateau underside caps are authored
closure geometry, not scanned column morphology, and share the wall budget.
World-metre triplanar detail uses **dark_rock_02 by Amal Kumar / Poly Haven,
CC0 1.0**, already credited above, over the baked scan colour. Sample rotations,
offsets, blending and unresolved-detail fade are authored shader operations.
Gross scan bridges and tiny detached reconstruction flakes are screened,
with reject counts in the library (the final detached-fragment audit finds
none in the selected crops). LOD triangles longer than 2m with altitude
below 0.06m are rejected; the retained scan faces are not smoothed.
Fissure poses, scale, overlap, raised debris chutes and talus reconstruction are authored;
they are not measurements of Mars column size, chemistry or bedding. The
kit contains CC BY and CC BY-NC assets; it is supplied for this non-commercial
project with source-level licence records in the library and this credit file.
Earlier acquired sources and reference photographs remain credited above.

The final ground-only normal texture uses per-pixel RG7, without spatial
averaging: scene angular error P50/P95/max is 0.425°/0.888°/1.888° relative to
the prior RGB normal vectors. This storage tradeoff keeps processed assets
under 150 MB; the independent cliff geometry and scan normal bakes are not
down-quantized by this codec. Ground node error values are inherited from
round 5 after ground-height reprojection and are not claimed as newly
computed excavation error bounds. The round-7 captured result is estimated
at 60%, with flat cut faces, repeated tiers, coarse ribs and corner/contact
defects still visible; it is not a finished 80% wall treatment.

Round 8 retains the same nine Earth scans and all source licences. Independent
YXZ tilts, yaw variation, width/depth scale, stack offsets and interpenetration
are authored assembly changes. LOD0–2 cap interiors transfer local depth
differences from the actual source scan and use its graded albedo; those caps
remain authored closure geometry, not newly scanned rock. LOD3 retains the
actual decimated scan surface, with separate recessed field joins behind it.
No scan wall vertex is softened. Dust coverage is selected from coherent
upward ledges instead of every small scan facet; scan AO contrast is reduced.
The already credited dark_rock_02 photographs supply world-metre triplanar
colour and small bump detail. A continuous coat uses the final ground height
to blend dust at the rock/talus contact. Irregular drifting debris cones are
authored heightfield fill; their low-amplitude fine relief is the separately
credited Kīlauea rubble strip, used at native metre spacing in two orientations.
Additional contact blocks are the existing credited Mars kit scans. No source,
metre calibration or Mars column measurement is invented by these repairs.
Final scan vertical scale is limited to 1.2×; taller assemblies use overlapping
100–120m pieces. Scan normal-map gain is 0.12, with separately credited basalt
photographic normals projected in world metres. Original scan vertices are not
smoothed. Authored cap vertices use flat geometric normals and stay below the
lip. Field joins sit 80m behind every run. One localized overlapping copy of
Matthew Strong's credited Devils Postpile scan (LOD2) closes the verified corner
sightline; its placement, scale and scan-derived caps are authored. The wider
plateau underside closes cutout openings, without changing the DEM
camera frame or claiming those closure surfaces as Mars measurements.
