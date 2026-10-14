# Scene B credits

Every source below is re-materialled as Europa ice in the page (geometry only, no source textures or colours).

| Source | Citation / URL | Licence | Used for | Modifications |
|---|---|---|---|---|
| Conamara Chaos stereo DTM (`Conamara_HighRes.tiff`, 30 m) | Steinbrügge, G., et al. (2020). Galileo stereo DTMs of Europa, DLR. Local copy `[path removed]` | CC BY 4.0 | Layout: plate outlines, plate heights, trough relief | 68×68 px crop (col 98, row 122). The 2.2 % nodata pixels are filled with the nearest valid value. Gaussian blur σ = 0.6 px, then the crop is rotated 180°, bicubic-upsampled to 4 m and thresholded into plates. A matrix floor is interpolated under the edges, and procedural detail is added on top. |
| San Gabriel & San Jacinto bedrock cliffs, SG1605_3 and SG1608_5 (SfM LAZ) | Neely, A.B., Loucks, E., Carr, J., Del Vecchio, J., Greenberg, E., and DiBiase, R.A. (2020). Bedrock cliffs in the San Gabriel and San Jacinto Mountains, California. OpenTopography. https://doi.org/10.5069/G96H4FKG | CC0 | Six scarp wall modules (the jointed faces) | 3 M point subsample. Vegetation removed by excess-green. PCA face frame, Poisson mesh, density trim. Windows cut and quadric-decimated to 6–9 k tris. Margins curled back. |
| Mirror Fault, Dixie Valley (SfM LAS) | Hodge, B. (2019). Mirror Fault, Dixie Valley, Nevada. OpenTopography. https://doi.org/10.5069/G9GQ6VVB | Licence not stated (OpenTopography "Not Provided"); used in this internal non-commercial prototype with citation | One wall module (smooth fault-plane faces) | Converted from WGS84 degrees to local metres. 3 M point subsample, Poisson mesh, quadric to 9 k tris, margins curled. |
| Mt Bove fault scarp, 2016 Norcia earthquake, post-event TLS | Gregory, L. (2019). 2016 Norcia Earthquake (Italy), Mt Bove Fault - Post-earthquake. OpenTopography. https://doi.org/10.5069/G9CV4FV2 | Licence not stated | **Evaluated, not used.** The free face is 1–2 m tall and lies in the scanner shadow (see LOG.md). | None shipped |
| Poly Haven rock_face_01, rock_face_02 | https://polyhaven.com/a/rock_face_01, https://polyhaven.com/a/rock_face_02 | CC0 | Two wall modules | LOD0 geometry, PCA face frame, quadric to 7 k tris, margins curled |
| Poly Haven namaqualand_cliff_01, namaqualand_cliff_02, boulder_01 | https://polyhaven.com/a/namaqualand_cliff_01 (and _02), https://polyhaven.com/a/boulder_01 | CC0 | Toppled blocks and leaning slabs | LOD0 geometry, quadric to 2.5–7 k tris |
| Poly Haven moon_rock_01…07, namaqualand_boulders_01, stone_01 | https://polyhaven.com/a/moon_rock_01 (… _07), https://polyhaven.com/a/namaqualand_boulders_01, https://polyhaven.com/a/stone_01 | CC0 | Talus, lip and matrix debris (instanced) | LOD0 geometry, quadric to 180–320 tris |

Jupiter is procedural (a banded canvas texture). It is not NASA imagery.

## Showcase adaptation

The Mirror Fault module is excluded from this showcase because the source lists no license. Its manifest entry and GLB are removed; the existing CC0 San Gabriel and Poly Haven wall modules fill the wall placements. Historical review images describe the original prototype; the live demo and new Reddit capture show the adapted version.
