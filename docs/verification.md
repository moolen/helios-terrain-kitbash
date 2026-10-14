# Local verification — 2026-10-14

- `npm run check`: all 24 HTML pages have valid local links/assets, all six post captures match their original SHA-256 hashes, excluded Mirror Fault donor is absent from the live Europa manifest and asset folder, no file exceeds GitHub’s 100 MiB limit.
- `npm run build`: all seven selected browser entries build successfully. The expected Three.js bundle-size notice remains.
- Built HTML navigation, stylesheet and image references were checked for existence and relative paths, so the build can serve from a GitHub Pages repository subpath. No public deployment was attempted.
- All 162 transport-packed binary files round-trip to their original decoded length and SHA-256. This changes transfer encoding only; measured geometry, normals and transforms are retained.
- T3 collaborative browser: Io A, Io B, Io C, lunar pit and Cerberus round-8 wall demo each reached their ready state without a scene error. The adapted Europa B prototype also loaded. Readiness checks confirm scene creation, not a sustained FPS benchmark.
- Landing page inspection found no broken loaded images or horizontal overflow at 1280 px.
- Saving new T3 browser snapshots repeatedly failed at the preview client. The six Reddit attachments therefore use original unchanged captures recovered from the session archives, clearly labelled in the capture manifest. All selected attachments were visually inspected.
- The two prominent Europa galleries use the accepted textured Godot game-port archives from `[path removed]`. Earlier faceted browser studies are separately labelled as history; the final Godot maps are not a WebGL port.

The original game repository was not edited. This is local review material: repository name, new-code/documentation license and publication remain pending. The included manual GitHub Pages workflow has not been run.

## Publication privacy cleanup

Machine addresses, server allocations, private filesystem paths, account access instructions, personal email references, private session links, and original checkout metadata are removed from prompts, review notes, source metadata and ZIP members. Public source citations, required attribution and working repository-relative asset links remain. The source and built prompt archives are synchronized. The repository-wide privacy audit also inspects image metadata and decoded glTF JSON rather than compressed pixels or numeric geometry. Numerical terrain values and original image bytes remain unchanged.

## Moon showcase additions

Added Shackleton ridge and Marius Hills textured native render galleries, three recovered Moon review/texture briefs, preserved regional LOLA payloads and two interactive measured-base viewers. Original payload and capture hashes are checked by the release check. Source elevation/hillshade figures are generated from the preserved data. The viewers are explicitly separated from the authored native map geometry.

Release checks pass: 29 HTML pages resolve local links/assets; both source payloads and six Moon images match recorded original hashes; tracked text, binary metadata and ZIP members pass the privacy audit. The Vite production build passes. Browser checks load both elevation viewers and exercise extent selection, vertical exaggeration and camera reset; the Marius gallery loads its capture/source images. The built public assets total about 859 MiB.

The privacy check now also rejects port numbers left after redacted endpoints or bare server assignments. Those remnants are removed from the older briefs and review notes before squashing the published history again. The Reddit draft remains excluded.
