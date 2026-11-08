# Challenge icon sources

These checked-in SVGs project native mesh LOD 0 triangles onto the X/Z plane.
Source meshes live under `/Game/Aki/Effect/Mesh/Scene/Tiaozhan/`.
The map compiler uses them directly; texture publication leaves them intact.

| Category | Blueprint | Native mesh | Output in `public/map/icons/` |
| --- | --- | --- | --- |
| Combat | `Gameplay205` | `Mod_Logo_18003` | `combat-challenge.svg` |
| Race | `Gameplay200` | `Mod_Logo_18001` | `race-challenge.svg` |
| Ski | `Gameplay207` | `Mod_Logo_18004` | `ski-challenge.svg` |
| Shooting | `Gameplay204` | `Mod_Logo_18002` | `shooting-challenge.svg` |

Combat and shooting devices share the generic native name “Simulation Training
Device”; their map categories describe the mechanic. Ski challenges are separate
from tactical holograms despite their native name.
