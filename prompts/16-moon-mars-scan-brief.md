# Moon/Mars scan brief


# Moon and Mars scan-built maps: prototype brief (2026-10-13)

The owner approved ("go") the roster from the research in `[path removed]` (review page `[path removed]`; each topic has `FINDINGS.txt`, `findings.json` and `[path removed]`). This repeats the Io process, which the owner liked: real DEMs used almost directly, kit-bashed pieces, a finished-looking HTML/three.js prototype in this workbench, then a port into the game.

**Read first:** `[path removed]`, `[path removed]` and the Io round docs (`[path removed]`, `LOG.md`). The Io scenes are merged on workbench main (`io-a.html`, `io-b.html`, `io-c.html`, `[path removed]`, `[path removed]`). **Start from their pipeline.** Copy, don't import-modify: `[path removed]` (bake: DEM crop and inpaint, maps, horizon/AO, kit-bash stamping, scatter, export) and `[path removed]` (terrain LOD, triplanar material, CSM shadows, scatter, sky).

## Owner rules learned so far (all apply)
- **Crisp, sharp cliff faces.** Never soften or smooth walls; fix artefacts some other way (use the 1 m DEM normals, triplanar projection and real slope breaks).
- Use the real heightmaps almost directly. Keep relief exaggeration modest and stated.
- **No pattern-y procedural textures:** no Voronoi cells, camouflage blobs, leopard print or soft radial discs. Colour and deposits must follow the terrain.
- Boulders and jagged rocks were missing everywhere before. Make scatter dense enough to read at the gameplay camera (about 6,000 rocks at gameplay, as on Shackleton).
- Exposure: lit faces and shadows must separate clearly. No murky underexposure, no washed-out pale.
- Budget: ≤ 500k triangles per view at gameplay, 60 fps. Processed assets ≤ about 150 MB per scene, excluding the export.
- Game export: same format as Io (`[path removed]`, the height raster, aligned masks, `features.json`, `scatter.json`). The game-side importer (`[path removed]`, docs at `[path removed]`) will be generalised to Moon and Mars.
- Honesty: never present procedural geometry as scan data. Every source goes in `CREDITS.md`.

## Scenes (wave 1 now; wave 2 follows)
| Scene | Region | Research to use | Server assignment |
|---|---|---|---|
| `mm-tranq` | `moon.mare_tranquillitatis` | `[path removed]` | [removed] |
| `mm-cerberus` | `mars.cerberus_fossae` (NEW region) | `[path removed]` (Cerberus part), anchor A 10.30N 156.95E | [removed] |
| wave 2: `mm-olympus`, `mm-jezero`, `mm-acidalia`, `mm-arcadia` | | | [removed] |

## Kit
- The Mars kit is being built in `[path removed]` (`manifest.json`). Use it as items appear; until then, use the raw candidates in `[path removed]` and `[path removed]`.
- Moon rocks: the Apollo sample scans in `[path removed]` and the existing Shackleton rocks.

## Looks
- **Moon:** grey regolith, very hard sun, black sky, no atmosphere and no haze. Earth hangs in the sky at Tranquillitatis, near the zenith-east. Use opposition-surge and regolith-photometry shading (Lommel-Seeliger/Hapke-ish), bright fresh-crater halos and ejecta rays, darker high-Ti mare.
- **Mars:** use the measured natural-colour palette in `[path removed]`:

  | Material | Colour |
  | --- | --- |
  | soil | #7e5e44 |
  | dust | #714628 |
  | dusty slope | #a57a59 |
  | bedrock | #755139 |
  | basaltic sand | #5c4027 |
  | light-toned bedrock | #b58561 |

  Use a butterscotch sky and a dust haze with distance; sun about 43% of Earth's.

## Workflow
- **Worktree:** `[path removed]<scene>`, on branch `[path removed]`. Inside it:
  - page `<scene>.html` (add only your own vite input);
  - code in `[path removed]`;
  - assets in `[path removed]`;
  - scripts in `[path removed]`;
  - docs in `[path removed]` (LOG.md, CREDITS.md, ROUND-N.md, shots/).
- **Work data:** `[path removed]`. Downloads are untrusted: Python runs with `-I` from `[path removed]`.
- **Dev server:** `npx vite   `, left running. The owner reviews from another host at `[local preview URL]`.
- **Captures:** use the Playwright GPU path that the Io scenes used, writing to `[path removed]`. Cameras:
  - close at about 350 m;
  - gameplay at about 2,350 m and 40°;
  - overview;
  - a wall or hero shot;
  - a landmark hero (the pit, the fissure);
  - one more of your choice.
- **Budget:** up to about 18 iterations, then write `ROUND-1.md`, refresh the export, commit on the branch, and stop. Don't ask for review mid-round.

