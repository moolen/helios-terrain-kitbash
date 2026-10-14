# Io scene B ("Tarawera fissure" → `io.tvashtar`): round 2

Page: `[endpoint removed]` (the dev server on [address removed] is still running). The details of each step are in `LOG.md` under "Round 2".

## Review points and what changed
1. **Palette: it now reads as Io, not regolith.**
   - **Base:** dark grey basalt with broad reddish-brown and black scoria on the dome and plateau. Fresh flows are glassy black and matte.
   - **Sulfur coverage in the gameplay frame:** 33.5 % bright sulfur and 43 % any yellow, measured by `[path removed]` in the work dir. r1 was 2 %; map A r3 measures 25 % on the same meter.
   - **Sources:**
     - (a) A stronger plume, 68 m/s, whose fallout spans the plateau.
     - (b) A new **age-based old-surface mantle**: an aged pale-yellow/ochre veneer on everything that is not a young flow, terrain-controlled (lows and gentle slopes; crests and walls stay dark) with only km-scale variation. Fresh flows stay dark.
     - (c) Continuous fumarole bands on the real chasm rims, plus the fissure-B crust line.
     - (d) Cold-trap frost in lows.
   - **Up close:** a matte ochre veneer under the Dallol-textured crusts, so there are no white flakes on grey rock.
2. **Chasm walls.**
   - The interpolated vertex normal on steep faces removes the sliver-triangle "teeth" and streaks.
   - Two-scale, distance-faded `basalt-cliff` detail removes the weave.
   - Bedding is natural and elevation-keyed (map A r3), mostly grey-on-grey, with rare scoria lenses and joints that fade before they alias.
   - Faces stay crisp: the lidar geometry is unchanged, at the 1 m leaf level near the camera.
3. **Fissure glow.** Map A's round-2 fissure segments (jagged centreline, varying width per piece, crust bridges, intensity along the slot, spatter clots on the lips). Fountain clots seen from steeply above fade out, so the close view no longer shows lozenges.
4. **Pit rim.** A continuous crust band on the rim crest, traced from the terrain (highest point per azimuth), thinning outward. There are 1,440 talus blocks inside the pit.
5. **Patera floors.**
   - Stronger real pressure ridges (Big Obsidian ×0.4) and a 6 m marginal rim (geometry).
   - Polygonal crust plates with dark seams, frost/sulfur in the troughs, an older scoria-brown rim zone, and the deposit layer suppressed on the floors.
6. **Budgets and size.**
   - Gameplay at 1080p: **405k triangles** (r1: 535k) at 0.46 ms GPU.
   - Assets excluding the export: **147 MB** (r1: 155 MB). The export is 55 MB.

## Triangles and frame rate
**1080p (`perf.mjs`):**

| View | Total | Terrain | Scatter | GPU ms |
| --- | --- | --- | --- | --- |
| close | 448k | 348k | 100k | 1.4 |
| gameplay | 405k | 287k | 118k | 0.5 |
| overview | 28k | 28k | 0 | 0.5 |
| wall | 454k | 329k | 126k | 1.7 |
| vent | 333k | 246k | 87k | 0.6 |
| night | 439k | 289k | 150k | 0.5 |
| curtain of fire (extra) | 635k | 419k | 216k | 0.5 |

**Review-capture resolution (1672×941):** gameplay 366k, close 457k, wall 427k, vent 309k, night 407k, fountain 593k. Every view runs at 60 fps on the RTX 4070 SUPER (ANGLE/Vulkan).

## Captures
- `[path removed]`
- `[path removed]`
- All iterations: `[path removed]`

## Export (game port)
`[path removed]`, refreshed. No file was renamed or removed. `README.json` has a new `changes.round2` list:
- `fissures[].widthM`;
- the `mantle` parameters;
- the traced pit crest;
- the `masks_b` contents (mantle, frost, ochre);
- patera ridges and rim in `height_1m.png`;
- the `pittalus` scatter group;
- the plume speed.

## Known problems (honest)
- **Fountain view.** The mantled slope behind the curtain still reads pale grey-beige with sun glints at 100–300 m, rather than clearly yellow. The veneer and crust changes barely moved it, so something there (grazing light on the Dallol detail normal?) still needs a look.
- **Sulfur pattern.** In the gameplay frame the sulfur follows the real gully network, which gives a "veined" look on the SW slopes. It is terrain-true, but more uniform than Io's plains.
- **Chasm floor.** The crust near the plume vent is very bright and saturated in the wall hero.
- **Walls.** Real vertical gully geometry still shows as vertical shading on the walls. That part is correct, but the walls lack overhang and block detail at close range.
- **Patera floors.** They read better at gameplay range but are still noisy white-grey at range (frost plus crust in the ridge troughs).
- **Overview.** The apron is a flat khaki and the map square stands out.
- **Night.** It remains very dark apart from the lava.
- **Changed layout.** The fissure-B slot pieces differ from r1 because the random stream changed. The export reflects the new ones.

## Assessment
About 75 % of the bar (r1: 65–70 %). The gameplay frame now clearly reads as Io: dark glassy flows and the curtain against a sulfur-mantled plateau with a yellow pit-rim ring and rim bands. The close and wall views are cleaner. The fountain-view slope and the patera floors are the weakest parts.
