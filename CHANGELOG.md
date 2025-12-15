# Changelog

## [3.3.0](https://github.com/ThatOpen/engine_fragment/compare/v3.2.1...v3.3.0) (2025-12-15)


### Features

* add all ifc metadata info to fragments ([6fb2e6c](https://github.com/ThatOpen/engine_fragment/commit/6fb2e6ccf841f526265b4e9b30090d0303860964))
* add ifc bridge part to default ifc elements ([1468c6d](https://github.com/ThatOpen/engine_fragment/commit/1468c6d4ed5aed77ccfd2bf88c218d1f911c434f))
* add more methods to single threaded fragments model ([fe43e1a](https://github.com/ThatOpen/engine_fragment/commit/fe43e1ad2776c8e92cc8885b640b40dcd17b73fa))
* allow to load all categories and relations ([0ee5da1](https://github.com/ThatOpen/engine_fragment/commit/0ee5da15aa6918ec2b88493117686ae27c487f47))
* allow to return all raycast results ([7012998](https://github.com/ThatOpen/engine_fragment/commit/701299806cb3462ba0163dd1802f3730b2c7dfc3))
* force ifc spaces to be transparent by default ([2bdd447](https://github.com/ThatOpen/engine_fragment/commit/2bdd44792f49b96d38ef807ee58ba9f96c8a332d))
* implement grids ([3b19a28](https://github.com/ThatOpen/engine_fragment/commit/3b19a28d448ce882ae9de768f2523082fc3dd249))
* implement lod mode ([95bb163](https://github.com/ThatOpen/engine_fragment/commit/95bb163e5b1b38cba04f04a65dc0b05c59b50239))


### Bug Fixes

* correct await force update behavior ([92b7f8d](https://github.com/ThatOpen/engine_fragment/commit/92b7f8d99d50caa302f68265a9ad1f01280d539b))
* correct error when importing certain relations ([14aea10](https://github.com/ThatOpen/engine_fragment/commit/14aea10c5e118fc800919e74b730a5f4a05e236c))
* correct grid edge case ([a1fe6f8](https://github.com/ThatOpen/engine_fragment/commit/a1fe6f83edc422cb16e621d17acbfa43e2a440fa))
* correct metadata failing with empty values ([081f296](https://github.com/ThatOpen/engine_fragment/commit/081f296fb7cdbe11d2431d2f7a8df1005ec434a5))
* correct small harmless error in ifc importer ([2e9a276](https://github.com/ThatOpen/engine_fragment/commit/2e9a27615751f259093eff510b988f4dfbea64aa))
* correct various bugs when getting edited items data ([e39a652](https://github.com/ThatOpen/engine_fragment/commit/e39a652d529e931d1ff61ec506427e067180385d))
* **ifc-importer:** exclude boolean from attribute serialization process ([#96](https://github.com/ThatOpen/engine_fragment/issues/96)) ([db3b785](https://github.com/ThatOpen/engine_fragment/commit/db3b785e781c8dddfadbd984ddac88f941e0406a))
* improve storey elevation replacement logic ([67eef05](https://github.com/ThatOpen/engine_fragment/commit/67eef05d71e8fa0239f4be12bfd6a02b9c003dde))
* remove civil points inversion (not necessary anymore) ([23602aa](https://github.com/ThatOpen/engine_fragment/commit/23602aa594fc653af36468b659819f6ee62e47ac))
* set up data in single threaded frag model ([0ab0ded](https://github.com/ThatOpen/engine_fragment/commit/0ab0ded836609b0734d6370cfceba7c330498273))
* skip geometries with zero bounding box ([b5e7e21](https://github.com/ThatOpen/engine_fragment/commit/b5e7e2141bdac3d0c761c8b142521ac1ecdf0a4b))


### Miscellaneous Chores

* release 3.3.0 ([95846b7](https://github.com/ThatOpen/engine_fragment/commit/95846b7de60d600eb520db3a06a545e68f2d1c38))

## [3.2.1](https://github.com/ThatOpen/engine_fragment/compare/v3.1.0...v3.2.1) (2025-10-23)


### Features

* add ifc road to ifc element list ([5b6fec9](https://github.com/ThatOpen/engine_fragment/commit/5b6fec9b104ee9a61bb5247d01df40385cd0d77a))
* allow to disable guard to ignore objects far away from the origin ([50c837c](https://github.com/ThatOpen/engine_fragment/commit/50c837c126d437f1aa6fee801db02b622c13c6c1))
* expose web-ifc config ([98cb3f3](https://github.com/ThatOpen/engine_fragment/commit/98cb3f35fe53a2b89105e4ffab77f76e0fe0fad8))
* fix tutorials paths ([7496f56](https://github.com/ThatOpen/engine_fragment/commit/7496f562ab7f5a24e2e23348ce64f0355ca4b701))
* release edit api ([f8b23b1](https://github.com/ThatOpen/engine_fragment/commit/f8b23b15e7e796722ef18d7bd3634fe727c19daa))


### Bug Fixes

* await set up model ([d86d799](https://github.com/ThatOpen/engine_fragment/commit/d86d79952f4b0bfde590bea938a56b5c52ab0a0c))
* handle optional chaining for UnitType in IfcPropertyProcessor ([3f00edb](https://github.com/ThatOpen/engine_fragment/commit/3f00edbf3d7fa7097c954d8f20a1ded4ff43ff5f))
* return raw geometry when profiles could not be generated ([5bc880b](https://github.com/ThatOpen/engine_fragment/commit/5bc880b9bf493914a06ae7ecb93d3e2b127486eb))


### Miscellaneous Chores

* release 3.2.0 ([f4faa23](https://github.com/ThatOpen/engine_fragment/commit/f4faa236c38a9281c3e19c561c831aee77d6dc60))
* release 3.2.1 ([885826d](https://github.com/ThatOpen/engine_fragment/commit/885826d5eaa170a9bdb04ea92980b18e38f12683))

## [3.1.0](https://github.com/ThatOpen/engine_fragment/compare/v3.0.0...v3.1.0) (2025-07-10)


### Features

* add getCoordinationMatrix method to FragmentsModel ([bd09ace](https://github.com/ThatOpen/engine_fragment/commit/bd09ace0aa48a4bd1edfb02d270cc0fd320bc64f))
* add units classes ([#69](https://github.com/ThatOpen/engine_fragment/issues/69)) ([325e0fa](https://github.com/ThatOpen/engine_fragment/commit/325e0fac1cd529750b14fde17331455aa5adb4d0))
* enhance geometry retrieval methods in FragmentsModel ([f843334](https://github.com/ThatOpen/engine_fragment/commit/f843334baa89d3c6729058112e7be4cc2ec23aa1))
* enhance IfcImporter with configuration to define classes and relations to process ([6c44b59](https://github.com/ThatOpen/engine_fragment/commit/6c44b597f35ee11525df4d081e429e8ac7e186ef))
* multiple fixes, data tools, alignment tools ([4224a3c](https://github.com/ThatOpen/engine_fragment/commit/4224a3c0cfc2cdc4fa5a86d74afaf6b74c88ca0d))
* skip big meshes for shell generation ([4fae6d3](https://github.com/ThatOpen/engine_fragment/commit/4fae6d335c63a4dedb80c428a25334607a34307e))


### Bug Fixes

* add guard for circular extrusions ([c08d5ac](https://github.com/ThatOpen/engine_fragment/commit/c08d5acd48cefa590083eb11fda418da8d84c9b5))
* add old frags files to prevent conflict with components ([4544747](https://github.com/ThatOpen/engine_fragment/commit/4544747e12a019efbf29667127b196d72899762a))
* ensure guard function is defined before validation in DataSet.add method ([e127a0d](https://github.com/ThatOpen/engine_fragment/commit/e127a0d949dfadec109dc76b5e6723174503e8b0))
* **fragments:** Project not compiling (in Angular) due to missing `Sample` type ([#68](https://github.com/ThatOpen/engine_fragment/issues/68)) ([79b1990](https://github.com/ThatOpen/engine_fragment/commit/79b19900a01bb6da3e5caa6470f62ac53650e2c1))
* solve problem when object class is not defined in tile ([a3f91db](https://github.com/ThatOpen/engine_fragment/commit/a3f91db6422f752fd5dc26532d6cf29eb989b677))

## [3.0.0](https://github.com/ThatOpen/engine_fragment/compare/v2.4.0...v3.0.0) (2025-04-10)


### Features

* **main:** set up new fragments ([67da61d](https://github.com/ThatOpen/engine_fragment/commit/67da61dfa96d9b0292a0651d95113fb87507e77e))


### Bug Fixes

* **main:** fix example generation ([4cdb9df](https://github.com/ThatOpen/engine_fragment/commit/4cdb9dfba71a5086b378d08ac0f07776f60adb1b))


### Miscellaneous Chores

* release 3.0.0 ([d0e69d0](https://github.com/ThatOpen/engine_fragment/commit/d0e69d035cf336bdb5d9209b2416e915da23991d))
