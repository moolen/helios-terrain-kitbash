# Scene A log: ice rift canyon

Captures are in `[path removed]` (game, close, hero), made with `[path removed]` on port [removed].

## 0. Sources and processing (before the first capture)
- **Charon DEM:** 37 profiles across the chasma in the upper right of the crop. Median profile: V-to-flat floor, wall slope ~39° at 300 m/px, a bench at 0.29–0.38 of the depth on one wall only, and raised flanks (`[path removed]`). Real scale: ~68 km wide and 4.2 km deep, a 16:1 ratio. That is far too shallow for a game map, so depth is exaggerated about 5×.
- **Hornsund TLS:** `…17_16_17_31_win_HB1`[path removed]`shots/hornsund-front-range-image.png`). There are no scan shadows worth mentioning on the straight part. The bent part next to the scanner (x > −400) was left out. Water returns are absent below the waterline, so the base is clean.
- **Iceberg OBJ:** trimesh slicing with caps failed because networkx is missing in the venv. Switched to pymeshlab boolean intersection against convex cells, which needs a watertight hull: Poisson, then repair, then close holes. That worked for Qeqertarsuaq (12 chunks). Dickson 1656 stayed non-watertight and was dropped.

## 1. it01: first composition
Ground heightfield from the Charon-rhythm profile along three branch polylines. Walls were 365 scan modules, scatter was 8k instances. Problems: the map edge showed as a hard line against the sky. Lineae were thin dark lines that read as roads. The plateau was flat and beige. Blocks rendered black: a winding flip in the chunk export inverted their normals. Close-up walls were smeared sheets of long slivers with flat "curtains" where the relief was clipped.

## 2. it02: far ground, ridges, Jupiter
Ground extended to 6 km with geometric spacing, and branches extended to the horizon. Lineae became an analytic function shared by CPU and GPU, with double-ridge relief. Walls got an isotropic remesh to 1.4 m plus 5,200 faces, a median filter of 3 instead of 5, and a tanh soft bound. Chunk winding fixed. Hero now shows Jupiter. Problems: ridge relief sawtoothed on the 3 m grid, and close-up walls showed dark side caps.

## 3. it03: module end taper, cooler palette, wider trunk
Module ends now taper back over 6 m, so neighbours meet in recessed joints. Ridges widened. Palette shifted toward blue-white. Trunk R raised from 118 to 138. Close-up was still too smooth. Lineae pairs still read as tyre tracks.

## 4. it04: rift centred, triple-band lineae, coarser facets
Trunk moved so it crosses the gameplay target (rim at z ≈ +20, so foreground plateau stays free for building). Lineae became Europa triple bands: diffuse rust band, slightly darker flanks, no paired dark lines. Walls remeshed to 2 m and decimated to 2,600 faces: crisp planar facets that match the studio. Fill light made bluer. The shadowed floor now reads as blue ice instead of black.

## 5. it05: bench on the visible wall, single-swell ridges, crack net
Bench moved to the north wall, which is sun-lit and faces the gameplay camera, so the Charon bench shows. Ridges became one low swell, which removed the track look. Added a Voronoi crack network. Close and hero cameras re-aimed. Hero is good: trunk, bench tiers, NE branch, Jupiter. Problem: the crack net read as paving tiles.

## 6. it06: sparser cracks, brighter blocks, module back check
Cracks became thinner, two-scale and mostly broken up. Block tint went brighter and bluer, with less deep-ice tint. Module placement now checks for a solid back at both ends.

## 7. it07: instancing
1,192 separate meshes were replaced by 16 InstancedMeshes (8 scan modules plus mirrored copies). Modules are limited to 2.3 km from the centre and scatter to 2 km. 633 modules remain, at 1.65 M triangles. Cracks are now subtle.

## 8. it08: scan-derived salt staining, lighter chunks
Each wall vertex gets a cavity value from the scan relief (distance behind the 8-cell-smoothed face), and that drives salt/rust staining in joints and undercuts. Chunks re-cut at 110–300 faces. Scatter dropped from 2.66 M to 1.38 M triangles.

## 9. it09: plateau block clusters, less mottling, Jupiter dark side
Added 14 cluster-first block fields on the plateau and halved the 70 m bump noise. Yaw jitter reduced from ±6° to ±3°. Jupiter's dark side was lifted a little (Europa-shine).

## 10. dbg-nowalls (diagnostic only)
Rendered the close-up without walls to find a dark box in the close-up. The heightfield wall behind is fine, so the box is a module: a real serac column in the scan that stands ~10 m proud of the face, seen in shadow. Kept, because it is scan form.

## 11. it11: lenticulae
Sparse reddish spots for Europa's mottled terrain. They read as polka dots, which is too regular.

## 12. it12: irregular lenticulae (final)
Fewer, larger spots with an fbm-warped outline at 38 % opacity. They are no longer obvious, only a faint mottling. These are the final captures:
- `[path removed]`
- `[path removed]`
- `[path removed]`

Copies are in `[path removed]`. Progression it01 → it05 → it12 is in `[path removed]`.

Licence update (2026-10-11) noted: Lauterbrunnen TLS is now allowed. It was not swapped in, because the Hornsund ice walls give the form this scene needs.
