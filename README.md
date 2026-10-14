# Helios terrain kitbash

A showcase of scan/DEM kitbashing: three Io maps, the lunar Tranquillitatis pit, Shackleton ridge and Marius Hills, Mars Cerberus Fossae, and the later textured Europa chaos and ice-plain game renders. Earlier faceted Europa browser prototypes are explicitly labelled as history. The old procedural low-poly preset collection is excluded.

[Source repository](https://github.com/moolen/helios-terrain-kitbash) · [Live showcase](https://moolen.github.io/helios-terrain-kitbash/)

```sh
npm ci
npm run dev

npm run check
npm run build
npm run preview
```

Open the preview address printed by the development command. Node 22.12+ is recommended. Built files use relative asset URLs and work under a GitHub Pages repository subpath. Browser demos require WebGL2; full-detail scan scenes can have large first downloads and need a capable GPU.

| Map or archive | What is available |
| --- | --- |
| [Kīlauea patera](io-a.html) | USGS lidar + authored lava and deposits |
| [Tarawera fissure](io-b.html) | New Zealand lidar + Io dressing |
| [Krafla plume field](io-c.html) | Iceland ArcticDEM + transplanted volcanic relief |
| [Tranquillitatis pit](mm-tranq.html) | Kaguya/LROC mare relief + authored pit geometry |
| [Shackleton ridge](public/reviews/moon-shackleton.html) | Textured native renders + preserved LOLA base in 3D |
| [Marius Hills](public/reviews/moon-marius.html) | Sinuous rille/dome native renders + preserved LOLA base in 3D |
| [Cerberus Fossae](mm-cerberus.html?walls=r8) | HiRISE/CTX fissure terrain + round-8 scan wall assembly |
| [Europa chaos gallery](public/reviews/europa-chaos.html) | Later textured Godot Conamara captures and comparisons |
| [Europa plain gallery](public/reviews/europa-plain.html) | Later textured Godot ice-plain captures and comparisons |
| [Volcanic source review](public/reviews/io-sources.html) | Selected original research cards and rendered heightmaps |
| [Moon/Mars source review](public/reviews/moon-mars-sources.html) | Selected original LROC/HiRISE/Kaguya/CTX research cards |
| [Recovered prompts](public/prompts.html) | Terrain briefs with private operational details removed |

The full Godot game, raw multi-GB downloads and engine export packs are omitted. Europa's final game maps and the Shackleton/Marius native terrain are represented by render galleries; the latter also have measured-base viewers. The earlier browser studies use their original prototype presentation. This is a runnable showcase, not a complete offline regeneration pipeline. Large binary assets are losslessly packed without altering decoded geometry. The static asset payload is about 860 MiB because the original scan detail is retained.

The [scene manifest](docs/source-manifest.json) identifies the public demo assets. The [provenance report](docs/provenance.md) records data lineage and verified source terms. Recovered prompts, review notes, downloadable metadata and attachments omit machine addresses, server assignments, private paths, account information and private session references.

[Six original gallery images and captions](post/reddit-images.zip) are included. They are original render captures, not concept images. The Reddit post draft is excluded from the repository.

## Attribution and license status

The existing terrain code retains its [upstream MIT notice](licenses/UPSTREAM-CODE-MIT.txt). The final license for new showcase code/documentation remains undecided. Data, meshes, textures and derivatives retain their source terms; see [credits](public/credits.html) and the per-scene credit files in the review archive.

Current primary-source metadata corrects Dallol to CC BY 4.0; historical briefs incorrectly/stalely say CC BY-NC. The adapted Europa B browser demo excludes the Mirror Fault mesh because its source lists no license. Historical native Europa renders document the original map; they do not grant permission to redistribute donor geometry. Retain the individual source notices when reusing assets.

## GitHub Pages

The [deployment workflow](.github/workflows/pages.yml) is manual. Select **Settings → Pages → GitHub Actions**, then run **Deploy reviewed showcase**. Pushing changes does not automatically deploy them. See [GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Moon additions include six original native captures, downloadable source elevation, source figures and three recovered review/texture briefs. The new viewers show only the measured base; authored rille/pit geometry and native game shading appear in the captures. See [Moon source review](public/reviews/moon-sources.html). Figure regeneration optionally requires numpy and Pillow.
