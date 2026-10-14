# Moon native review: domes, rille and polar ridges

Round 13 (orchestrator review of round 12, ~74% overall; round 12 is merged into main). Start with `git merge main` once, `task.sh import`, build.

Scope now covers six regions: tycho, marius_hills, aristarchus_plateau, cabeus_haworth_ridge (as before) plus mare_tranquillitatis and shackleton_ridge (new; you may reshape their build sites — no savegame compatibility needed).

Review of round 12:
1. Marius Hills (~70%): from the gameplay camera the rille reads, but the domes do not. The reference has 2-3 clearly conical/shield domes (200-500 m across, 50-150 m tall, smooth flanks, some with a small summit cone/pit) WITHIN the gameplay frame. Move/place domes so at least two sit 0.8-2.5 km from the hub in view, and make them read in silhouette and shading. Rille: wider, sharper rim lip, boulder-lined banks with scanned rocks sized 3-10 m so they read from 460 m.
2. Aristarchus (~65%): bring the bright rugged ejecta/rim zone into the gameplay frame — either move the build site toward the crater (allowed) or place a bright, blocky, hummocky ejecta ridge 1-3 km away. The bright side must be a boulder-strewn blanket with high albedo contrast against the dark pyroclastic side, not a soft streak.
3. Low-sun rocks (Cabeus): fix pale over-bright scans at grazing sun (clamp scan albedo/roughness response) and add contact darkening under small stones.
4. Mare Tranquillitatis -> [path removed]: dark smooth basalt, a wrinkle ridge crossing the view, craters of all ages (fresh with bright ejecta + boulders, old soft dimples).
5. Shackleton ridge and Cabeus -> [path removed]: outpost on a sunlit ridge crest flanked by pitch-black permanently shadowed crater interiors, very low sun, long shadows.
Budgets ~500k per view. Validation: build, moon-terrain-checks, art-lab-checks, HELIOS_GAME_ONLY=regions task.sh test. Evidence: reference-vs-gameplay sheets for all six regions + REPORT.md. Commit, report honest % per region, stop.
