# Third-party texture notices

The active photorealistic tree model and earlier candidate models use the assets below. No Blender add-on source code was installed or copied into the project.

- `blender/source/island_tree_02_1k.blend` and `blender/source/textures/*` — Island Tree 02, model and textures by Rico Cilliers, from [Poly Haven](https://polyhaven.com/a/island_tree_02), licensed CC0 1.0 Universal. The build uses its included static LOD1 mesh (316,491 faces), then packs the 1K maps into the editable Blender result and exported GLB. Source license: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- The Poly Haven source is also available as a glTF asset through the [Poly Haven API](https://api.polyhaven.com/files/island_tree_02); the build uses the Blender file so its authored LOD1 is available.

- `Bark001_1K/*` — Bark 001 PBR maps from [ambientCG](https://ambientcg.com/view?id=Bark001), licensed CC0 1.0 Universal. Used by the earlier `allam_tree_master_v2` candidate only.
- `LeafSet024_1K-JPG_*` — Leaf Set 024 PBR maps from [ambientCG](https://ambientcg.com/view?id=LeafSet024), licensed CC0 1.0 Universal. Retrieved from the [Easy-Tree assets directory](https://github.com/jacobcjohnston/Easy-Tree/tree/ff95ef5ab04358978b8d0863c1c2256951359fc0/assets/textures) at commit `ff95ef5ab04358978b8d0863c1c2256951359fc0`; used by the earlier `allam_tree_master_v2` candidate only.

The Blender file packs the maps needed to rebuild and edit the tree. The GLB embeds its exported materials.
