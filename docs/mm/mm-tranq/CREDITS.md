# mm-tranq (Mare Tranquillitatis pit): sources and credits

What is real data and what is authored is stated for every part. Nothing procedural is presented as scan data.

## Terrain (heights)
| Part | Source | Licence | What we did |
| --- | --- | --- | --- |
| Base, 12 km map + ±16 km context ring | SELENE/Kaguya Terrain Camera DTM MAP seamless v2.0 (3600 ppd, 8.4 m), tiles N09E030N06E033 + N09E033N06E036, JAXA/ISAS DARTS (https://data.darts.isas.jaxa.jp/pub/pds3/sln-l-tc-5-dtm-map-seamless-v2.0/) | JAXA data policy: free use with credit ("JAXA/SELENE") | Reprojected to the region's azimuthal-equidistant frame; spikes removed against SLDEM2015 (research step). In the map only wavelengths above ~150 m are kept (Gaussian sigma 40 m): below that Kaguya is dominated by stereo noise. |
| Real 2 m core, at its true position (x = -1.2 .. +3.5 km, full N-S) | LROC NAC DTM TRANQPIT1 (2 m), NASA/GSFC/Arizona State University, https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/SDP/NAC_DTM/TRANQPIT1/ | Public domain (NASA) | Plane-fitted onto Kaguya (median offset -1.3 m, tilt < 4 m over the map), feathered 300 m at its E/W edges and 30 m around its no-data holes. |
| 2 m micro-relief outside the strip | Same TRANQPIT1 DTM (other parts of its 28 km strip) | Public domain | High-pass (< ~150 m) patches of the REAL DTM transplanted onto the Kaguya low band in 2 km patches (rotations / mirrors, 160 m variance-preserving cross-fades); the noisiest 65 % of donor windows (stereo artefacts) and the pit surroundings were excluded. This is real lunar mare relief, but not at its true location. |
| Fresh blocky crater ("West crater stamp") | LROC NAC DTM APOLLO11 (2 m), West crater near Tranquillity Base, NASA/GSFC/ASU | Public domain | Detrended (sigma 300 m), scaled 1.8x in all axes (slopes preserved: 190 m -> 342 m, ~54 m deep), rotated 20 deg, placed at the game's fresh-crater position (-3350, -900). |
| Wrinkle-ridge crest (SW corner) | LROC NAC DTM FECUNDITATIS (3 m), NASA/GSFC/ASU | Public domain | A 2.8 km strip along the crest/scarp, detrended (sigma 700 m), across-trend removed, x0.45 vertical, laid along the real Kaguya ridge where it crosses the map's SW corner. |
| Small crisp fresh craters (Kaguya part) | TRANQPIT1 DTM | Public domain | The 46 freshest 8-56 m craters of the whole strip (depth/diameter detector) cut out and stamped at 320 random positions (0.8-1.3x, random rotation). Real shapes, invented positions. |
| Far skyline (±64 km) | SLDEM2015 512 ppd (59 m), Barker et al. 2016, NASA PGDA / MIT (https://imbrium.mit.edu/DATA/SLDEM2015/) | Public domain (NASA) | Averaged to 250 m; the browser drops the ring by the Moon's curvature. |
| **The pit shaft** | **AUTHORED** from LROC Pits Atlas #3 measurements and the NAC images below | — | Funnel (143 m, 20 m deep), lip ellipse 100 x 88 m, caprock + overhang ceiling (12/13/11 m N/E/W, 2 m S), 36 stacked basalt beds 1.5-7.5 m thick with setbacks and blocky joints, recess band 40 m below the lip, floor 105 m below the lip sloping 7 m down to the E, 14 m talus apron. Procedural geometry built to the measurements; not scan data. |

Reference images for the pit (not used as textures): LROC NAC M144395745L, M175057326R, M152662021R, M155016845R, M126710873R, M155023632R (NASA/GSFC/Arizona State University, public domain).

## Surface textures
| Layer | Source | Licence |
| --- | --- | --- |
| Regolith (moon_01, moon_meteor_01, moon_03, moon_flat_macro_01) | Poly Haven (Greg Zaal, Rico Cilliers, Jenelle van Heerden, Dario Barresi), via helios-texture-library | CC0 1.0 |
| Rubble (gray_rocks, desaturated), rock face (rock_face_03) | Poly Haven (Dimitrios Savva; Dario Barresi, Rico Cilliers) | CC0 1.0 |
| Pit walls: basalt-cliff, basalt-old-weathered (Io kit) | Poly Haven dark_rock_02 / dark_rock by Amal Kumar | CC0 1.0 |
All layers are used as luminance only; the lunar palette is applied in the shader.

## Rocks (scatter)
| Rock | Source | Licence |
| --- | --- | --- |
| Apollo samples 10017,15 / 10022,53 / 70017,8 / 15016,0 / 14321,1404 / 60025,241 | NASA Astromaterials 3D (ARES, NASA JSC), Sketchfab "astromaterials3d" | CC0 1.0 |
| moon_rock_02 ... moon_rock_07 | Poly Haven (Greg Zaal, Rico Cilliers, Jenelle van Heerden) | CC0 1.0 |
Each scan was decimated to ~2k triangles in Blender with its colour and normal baked to 512 px ([path removed]). Placement is rule-based (bake_scatter.py), not mapped from images.

## Sky
| Item | Source | Licence |
| --- | --- | --- |
| Earth day map | Solar System Scope (https://www.solarsystemscope.com/textures/), copied from the game's assets/world/space/earth.jpg | CC BY 4.0, credit "Solar System Scope" |

## Procedural / authored (labelled as such)
- Fresh-crater halos and rays (immaturity mask): procedural around craters DETECTED on the real/stamped DEM (positions and sizes from data, ray azimuths random).
- Ilmenite basalt deposit on the West crater's inner rim: authored mask.
- Pit shaft geometry (see above), boulder placement rules, photometry model (lunar-Lambert after McEwen 1991, softened phase curve, opposition surge).
