# Preserved Moon elevation bases

Source: LRO LOLA 118 m global DEM, NASA/GSFC LOLA team, distributed by USGS Astrogeology. These public-domain regional derivatives are preserved unchanged.

Gzip contains little-endian HRGN v1:

| Field | Type |
| --- | --- |
| Magic | 4 bytes: HRGN |
| Version | uint16 = 1 |
| Anchor latitude, longitude (degrees) | two float64 |
| Anchor datum (LOLA DN) | int32 |
| Level count | uint16 |
| Each level: size, grid spacing (metres) | uint16, float64 |
| Each level: size × size elevations | int16, row-major |

Elevations are 0.5 m per DN above the 1,737.4 km reference sphere. Subtract datum DN before converting to local heights. Row zero is north, column zero west; pixel centres span ±size × spacing / 2. Region coordinates use x east and z south.

The levels are resampled grids, not new measurement detail. The viewer preserves physical scale at 1×; optional exaggeration is labelled. Authored rille geometry, pit walls, local craters, terrain grading, materials and rocks from the game are absent. The original game mesh is not distributed here.

`source-relief.png` visualizes the finest grid. To regenerate the figures, install numpy and Pillow, then run `python3 scripts/render_moon_sources.py` from the repository root.
