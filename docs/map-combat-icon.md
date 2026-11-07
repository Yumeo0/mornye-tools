# Combat Challenge icon

`public/map/icons/combat-challenge.svg` is a flat front silhouette of the game's
`Mod_Logo_18003` mesh, extracted from the installed 3.7.0 client. It preserves
the hovering sword emblem's geometry, without the animated glow or particles.
The mesh lies in the X/Z plane; the SVG projects its LOD 0 triangles to that
plane with consistent winding and a neutral map-icon fill.

The native asset chain is:

- `Gameplay205` → model `541043`
- `/Game/Aki/Scene/InteractionLevel/Prefab/Challange/TPrefab_SM_Pro_CombatChallenge`
- `/Game/Aki/Effect/EffectGroup/BigWorld/Tiaozhan/DA_Fx_Group_Sl2_Tiaozhan_07Logo`
- `/Game/Aki/Effect/DataAsset/Niagara/BigWorld/Tiaozhan/DA_Fx_Sl2_Tiaozhan_07Logo`
- `/Game/Aki/Effect/Niagara/NI_BigWorld/Tiaozhan/NS_Fx_Sl2_Tiaozhan_07Logo`
- `/Game/Aki/Effect/Mesh/Scene/Tiaozhan/Mod_Logo_18003`

The map compiler uses this checked-in SVG directly; the usual UI texture
copying step leaves it intact. `Combat Challenge` is a descriptive category
for this blueprint; its English entity name is `Simulation Training Device`.


## Race and ski challenge icons

The same flat X/Z projection is used for these native meshes:

- `Gameplay200` → model `541020` →
  `Challange/TPrefab_SM_Pro_ParkourChallenge` →
  `DA_Fx_Group_Sl2_Tiaozhan_05Logo` → `DA_Fx_Sl2_Tiaozhan_05Logo` →
  `NS_Fx_Sl2_Tiaozhan_05Logo` → `Mod_Logo_18001` (running figure).
  Published as `public/map/icons/race-challenge.svg`.
- `Gameplay207` → `CXS/TPrefab_SM_CXS_Pro_SkiChallenge` →
  `DA_Fx_Sl2_Tiaozhan_08Logo` → `NS_Fx_Sl2_Tiaozhan_08Logo` →
  `Mod_Logo_18004` (skier). Published as `public/map/icons/ski-challenge.svg`.

These meshes share the combat logo's `/Game/Aki/Effect/Mesh/Scene/Tiaozhan/`
asset directory. The ski blueprint's English name says `Tactical Hologram: Ski`,
but it is classified as `Ski Challenge` separately from tactical holograms.


## Shooting challenge icon

`Gameplay204` → model `541044` →
`Challange/TPrefab_SM_Pro_ArcherChallenge` →
`DA_Fx_Group_Sl2_Tiaozhan_06Logo` → `DA_Fx_Sl2_Tiaozhan_06Logo` →
`NS_Fx_Sl2_Tiaozhan_06Logo` → `Mod_Logo_18002`.
The same front-silhouette projection is published as
`public/map/icons/shooting-challenge.svg`. The English device name is the generic
`Simulation Training Device`; `Shooting Challenge` is a descriptive map category.
