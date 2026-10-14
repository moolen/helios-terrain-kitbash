# Scene A credits

Every source used in `rift-a.html`, with licence and what was done to it. Raw downloads live in `[path removed]` and are not committed.

## Hornsund TLS 2023 (wall modules)
- **Dataset:** Terrestrial laser scanning of the Hansbreen calving front, Hornsund, Svalbard, 2023. Institute of Geophysics, Polish Academy of Sciences (IGF PAS).
- **Licence:** CC BY 4.0.
- **URL:** https://dataportal.igf.edu.pl/dataset/tls_hornsund_2023 (files: https://geodata.igf.edu.pl/Dataset_TLS/)
- **File used:** `2023_06_20_17_16_17_31_win_HB1_TLS.las` (73 MB, 2.26 M points, scanner station HB1). `2023_06_20_16_50_17_06_win_HB1_TLS.las` was also downloaded but not used (same station, similar view).
- **Modifications:** cropped to the ~710 m straight part of the calving front above the waterline. Rasterised to a 0.5 m range image in the front plane. Holes filled, median-filtered, and relief soft-bounded to ±11 m. Cut into eight 72 m modules, closed into solid slabs with a flat back, top cap and tapered ends. Isotropic remesh (2 m), then quadric decimation to 2,600 faces each. A per-vertex cavity value from the scan relief drives salt staining. In the scene, the modules are scaled (1.0–2.2× vertically, compressed in depth) and re-coloured as Europa ice. Output: `[path removed]`.

## Qeqertarsuaq grounded iceberg (ice blocks)
- **Dataset:** Carlson, D. F. (2020). *3D model of a grounded iceberg near Qeqertarsuaq Island in Northwest Greenland*. Zenodo. https://doi.org/10.5281/zenodo.4014709 (https://zenodo.org/records/4014709)
- **Licence:** CC BY 4.0.
- **File used:** `20170726_Qeqertarsuaq_model.obj` (UAV photogrammetry, Agisoft PhotoScan, 1.23 M faces).
- **Modifications:** small components removed and the model decimated to 120k faces. Screened Poisson gave a watertight hull; the open waterline base was closed. Twelve chunks were cut by boolean intersection with random convex cells, each seeded on the real upper surface so one side of every block is scan surface. Decimated to 110–300 faces each and normalised to unit size. In the scene they are instanced as talus, bench, rim and plateau blocks, re-coloured as Europa ice. Output: `[path removed]`.

## Dickson Fjord drifting iceberg (tried, not used)
- **Dataset:** Zenodo record 4309930 (*3D mesh model and raw images of a drifting iceberg in Dickson Fjord (NE Greenland) on 20 August 2018 at 16:56 UTC*), CC BY 4.0. https://zenodo.org/records/4309930
- **Status:** downloaded (`20180220T1656_mesh.obj`). Its Poisson hull was not watertight after hole closing, so the boolean cut failed. No geometry from it is in the scene.

## Charon DEM (layout rhythm)
- **Dataset:** New Horizons Charon global DEM, 300 m/px (NASA / Johns Hopkins APL / SwRI; USGS Astrogeology). Public domain. The local crop is `[path removed]`.
- **Modifications:** 37 N-S profiles were taken across a chasma in crop rows 250–750 and columns 1700–3000, aligned on the floor and median-averaged (`[path removed]` → `[path removed]`). The scene uses the measured rhythm and not the DEM heights: bench at 0.36 of the depth on one wall only, steep walls, raised flanks, branching. It is scaled to an 80 m deep, ~280 m wide trough on a 2.2 km map.

## Not used
- Sketchfab models (Recherchebreen, Tervasaari crushed ice): not used, because `[path removed]` does not exist.
- Lauterbrunnen TLS (licence update 2026-10-11): not used. Hornsund ice walls stayed the primary source, and the owner allowed Lauterbrunnen only if it improved wall form. The 1.6 GB download did not look worth it for this round.
