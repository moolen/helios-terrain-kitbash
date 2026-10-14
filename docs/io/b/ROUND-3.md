# Io scene B ("Tarawera fissure" → `io.tvashtar`): round 3

This was a short round (6 iterations) and shading only: the terrain, deposits and scatter are as in round 2. Page: `[endpoint removed]` (the dev server is still running on [address removed]). The gameplay composition and coverage are kept: 32 % bright sulfur and 42 % any yellow (r2: 33.5 / 43).

## Review points
1. **Crisp walls.**
   - The smoothed steep normals are reverted. The shading normal everywhere, including near-vertical faces, is the 1 m DEM normal map, with a small flat-mesh share only on near-vertical faces. Nothing is smoothed.
   - Triplanar projection and the two-scale `basalt-cliff` detail are kept.
   - New break-lines from real slope discontinuities in the 1 m normal map: pale lips and dark toes.
   - See `[path removed]`. The wall faces are firmer than r2, but the Tarawera chasm walls are real gullied scoria slopes at 40–60°, not columnar basalt, so they will never look as blocky as map A's Kīlauea walls.
2. **Fountain-view glints.** Not specular. They were sub-metre crust patches with their normal detail on a brightly sunlit slope. Crust now blends to its mean colour from 220 m, the crust normal fades out with it, the mantle is a darker, saturated ochre, and all terrain layers are matte (roughness ≥ 0.8; crust, frost and fumarole 0.95–1). The kit normal maps are OpenGL-convention and are read as such.
3. **Chasm-floor crust blow-out.** The cause was the chasm-slot point light (6000 → 2000) plus baked lava irradiance multiplied by bright yellow albedo (irradiance now multiplies min(albedo, 0.25)). Terrain albedo is capped at (.6, .52, .3), with unsaturated whites up to .55.
4. **Patera floors.** Dark crust plates (~0.1 albedo), frost only in the ridge troughs, a blend to the mean colour (0.045) beyond 200–1200 m, and roughness 0.97. They now read as dark crusted floors at gameplay range. Two GLSL `smoothstep` calls with reversed edges (undefined behaviour) are fixed.
5. **Overview ring.** It now uses the map's palette at low resolution (grey basalt, reddish-brown and black scoria, a faint ochre mantle on flat ground). It is less flat than r2 but still lighter and more uniform than the map.

## Triangles and frame rate (1080p, `perf.mjs`; 60 fps in every view on the RTX 4070 SUPER)
| View | Triangles | GPU ms |
| --- | --- | --- |
| close | 448k | 1.5 |
| gameplay | 405k | 0.5 |
| overview | 28k | 0.4 |
| wall | 454k | 2.4 |
| vent | 333k | 0.5 |
| night | 439k | 0.4 |
| fountain | 635k | 0.4 |

Assets excluding the export: 147 MB; the export is 55 MB.

## Captures
- `[path removed]`
- `[path removed]`
- `[path removed]`

## Export
Refreshed in place; nothing renamed. `README.json` has a new `changes.round3` list:
- the data is unchanged apart from the chasm-slot light intensity in `features.json`;
- shading guidance for the port: 1 m normal map as the shading normal, roughness ≥ 0.8, albedo cap ~0.6, patera mean colour and frost rule, irradiance × min(albedo, 0.25);
- the break-lines are derived from the normal map in the shader.

## Known problems
- **Wall hero.** The chasm-floor crust near the plume is still the brightest thing in the frame. It is now the capped Dallol yellow in direct sun rather than a glow, but it still competes with the walls.
- **Fountain view.** The slope behind the curtain is still pale (sun-facing, high irradiance) with a faint yellow cast. It reads less like glitter, but it is not the saturated ochre of the gameplay view.
- **Walls.** They are crisper than r2 but soft compared with map A. This is inherent to the Tarawera scoria walls. Stronger crispness would need wall modules (for example the Whakaari 1 m lidar) kit-bashed onto the faces.
- **Overview.** The apron is still a lighter khaki than the map edge.
- **Night.** Still very dark apart from the lava.

## Assessment
About 75–78 %. Round 3 removed the r2 regressions (soft walls, patera sheen, chasm-floor blow-out) and kept the gameplay frame. The remaining gaps are the fountain-view slope colour, wall crispness compared with map A, and the overview apron.
