# Io research and scan-built workflow

Below is the summary of an approach that i have used to build terrain for the icy moons.

My goal is to build maps for IO following the same approach. those terrain maps are really hard in particular, because they have/need very distinct terrain: basalt flow fields, patera rims and caldera scarps, and sulfur frost and plume deposits. A starting point could be a real lava field scans / DEMs, such as Hawaiian or Icelandic flows and caldera walls. It doesn't have to be active volcanoes, it can be old ones as well. as long as they have very distinct landform.

First, lets start with the research: have a look what data DTM / lidar or other scans you can find and present me the results. I guess i want pictures, height maps etc. to get a feel. 
What is important to me: lava flow fields, patera rim etc. 

Then once we got that, i want to build a prototype with HTML/threejs and generate a terrain inspired by what we've found. procedurally generate the terrain, add / kit-bash the height maps, scans etc. into the terrain to see what works and what doesnt. generate several options. 
Then we got to do the dressing to get a feel of how it looks like when its finished. Very important to me is that i want to get some sort of active lava flow vibe. not a huge pool of fresh lava, but some light emitting lava, some glow, and many more subtle things to make it look right. Also, the sulfur frost / deposits are important to get in. they make up most of the dressing. Maybe we need to simulat the plume exhaust and deposit procedurally. We'll need to experiment with that. 

Once we're happy with the prototype and have 3-4 candidates e can bring them into the game.

---
Here’s a summary of the approach we used for the eight ice maps, written so a new session can start Io from it.

Scan-built terrain: the approach

Core idea. Each map has two layers. The large shapes come from real elevation data (DEMs) or procedural fields shaped to a real layout. The steep faces (cliffs, scarps, chasma walls) are not drawn by the heightfield. Instead, mesh modules cut from real lidar, photogrammetry and laser scans are placed along every steep edge. Then come scanned rocks and ice blocks, and per-body shading that hides the low-poly facets.

1. Research and pick references
I searched for open scans and DEMs of real places that look like the target landforms. The ice maps used Conamara on Europa (DLR Galileo DEM), Charon’s chasma, the Canyonlands Needles graben (lidar), San Gabriel and Mirror Fault scarps (photogrammetry), the Zion Cable Mountain wall, the Hornsund glacier front (laser scan), Volcanic Tablelands fissures, and Poly Haven rock faces and rocks.
Every source is credited. The project is non-commercial, so non-commercial licences are fine.
2. Prototype in the three.js workbench first
The workbench is [path removed] Each family got a browser scene: real layout data, plus wall modules cut from the scans, plus scatter.
You approved those scenes before anything went into the game.
From them came three reusable families:
A, ice rift canyon: a chasma profile with calving-front walls.
B, fault scarp plus chaos edge: a DEM layout with jointed fault-column walls.
C, graben plus fissure field: a lidar graben layout with a sheer cliff wall kit.
Each family is used for several bodies.
3. Assign families to regions
Each in-game region got the family that fits its real geology, for example Europa chaos with family B and Ganymede’s grooves with family C.
The port went one map at a time, and each later map reused the earlier tooling.
4. Build the in-game field
Size and layout: each map is a 384×384 grid of 31.25 m cells, so 12 km across. The layout is scaled from the prototype’s real data, with procedural detail added where the data stops.
Gameplay contract: every map keeps the same rules: two recommended hubs on buildable ground, three or more resource deposits, and one deposit that’s only reachable up steep ground. The tests check all of this.
Versions: each map gets a new generator version with its content hash pinned in the tests. In the end the old versions were deleted.
5. Wall modules
The scans are baked into wall kits with LODs (project/assets/world/cliffs/bake_cliffs.py, giving files like europa_scarp.hcliff).
Placement: ScarpEdges finds the steep edges in the field. CliffWallField places modules along them deterministically.
Per-body look: CliffLook settings control each body’s wall look; new options are opt-in per map.
Fixes for problems we kept hitting:
Tuck module tops just under the edge of the drop and sink their feet into the rubble slope.
Trim modules at sharp corners.
Shade the faces between modules from the cliff’s true outward direction. That fixes the vertical “straw” streaks on stretched terrain cliffs and the coarse cliffs far away.
6. Shading at Shackleton’s level
Texture layers are projected from several directions so they don’t stretch on steep faces. Detail normals, ambient occlusion and staining make facets read as rock or ice, not triangles.
Each body gets its own palette, sun, sky and haze, so each one feels distinct.
Your preference: crisp, sharp cliffs. Fix broken modules, never soften the walls.
7. Scatter
Scanned rocks and blocks go through the shared LibraryRockField, with rubble slopes at wall feet.
Density is matched to Shackleton: about 6,000 rocks at the gameplay camera.
8. Budgets
The ceiling is 500,000 triangles per view. Walls get about 100,000–110,000 of those.
9. Plates and the sign-off loop
Plates come from the ice-rift-plates capture mode and [path removed]
Cameras: the same ones as Shackleton: close at 350 m, gameplay at 2,350 m, approach at 14 km, plus wall and hero shots.
Each plate set shows: side-by-sides against Shackleton, the workbench prototype, and the other map in the same family.
The plates are published as an artifact page for your sign-off. Feedback rounds show before and after. A map is done only when you sign it off.
After each round, the earlier maps are re-captured and must stay within 1/255 average brightness of their accepted plates.
10. How the work was organised
Work happens in a separate git worktree on a branch, never in the main checkout. One agent works on one map round, with a brief that sets the goal and a capture limit.
Before merging, all tests run (regions plus each body’s playable test) and every pin is checked. Then a fast-forward to main.
Detailed logs are in [path removed], and the overall status is in ice-rift-port.md.
