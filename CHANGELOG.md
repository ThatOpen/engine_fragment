# Changelog

## [3.5.0](https://github.com/ThatOpen/engine_fragment/compare/v3.4.0...v3.5.0) (2026-05-03)


### Features

* add contributing guide ([908eea0](https://github.com/ThatOpen/engine_fragment/commit/908eea0a59a2eabe0cd00df86d44aa98e594eb00))
* add edit API to SingleThreadedFragmentsModel ([864dc23](https://github.com/ThatOpen/engine_fragment/commit/864dc237a140ebb5fd1f9d12d17f408275049e60))
* add frag load progress callback ([ac639f9](https://github.com/ThatOpen/engine_fragment/commit/ac639f9715e85d87dc5c17e42d5352d38b661bed))
* add VirtualMultithreadingConfig ([#194](https://github.com/ThatOpen/engine_fragment/issues/194)) ([ebd7750](https://github.com/ThatOpen/engine_fragment/commit/ebd7750032cad5fde842087292f3828e8b17612a))
* allow to get items chunks ([d65be31](https://github.com/ThatOpen/engine_fragment/commit/d65be31ab52d5c7963726b398c039bf4c5fc09fa))
* **edit:** add CREATE/UPDATE/DELETE_INDEX edit requests ([f8aa07f](https://github.com/ThatOpen/engine_fragment/commit/f8aa07f61805b93b19f6912eb36f3b079d777198)), closes [#164](https://github.com/ThatOpen/engine_fragment/issues/164)
* **editor:** add createIndex/updateIndex/deleteIndex convenience methods ([a17707e](https://github.com/ThatOpen/engine_fragment/commit/a17707e323789219bedf78b2649b268a70a15eda)), closes [#164](https://github.com/ThatOpen/engine_fragment/issues/164)
* expose getLocalIdsFromItemIds on the public model API ([18742ff](https://github.com/ThatOpen/engine_fragment/commit/18742ff96dafc307d25bea3abe0cca13ef2c7e5f))
* full uint32 localId range in tile id attribute ([fe11440](https://github.com/ThatOpen/engine_fragment/commit/fe11440b702850769bf94f18e983ec51345a9bef))
* **grids:** stamp userData kinds and expose grid material ([e383064](https://github.com/ThatOpen/engine_fragment/commit/e38306467edafa18000142676d4ceb692ffca42f)), closes [#192](https://github.com/ThatOpen/engine_fragment/issues/192)
* implement model load abort ([bddbcfc](https://github.com/ThatOpen/engine_fragment/commit/bddbcfc7cfc5266cc5c311c19ae51caa0d22522a))
* implement worker control ([c5fac67](https://github.com/ThatOpen/engine_fragment/commit/c5fac678c41a586b02b0c527227887bd7f65e208))
* improve worker fetch logic ([d03b6a0](https://github.com/ThatOpen/engine_fragment/commit/d03b6a063a7e7536c687c6b12e8c08aadbce1ba4))
* itemId-keyed snap fetch + picker encoding ([0f48bb6](https://github.com/ThatOpen/engine_fragment/commit/0f48bb62da6463f2988aeb3c1bedb2e99a479e15))
* **model:** add VirtualIndexesController ([049a057](https://github.com/ThatOpen/engine_fragment/commit/049a057d52921bc8d1cd859d3097c94cedcd602b)), closes [#164](https://github.com/ThatOpen/engine_fragment/issues/164)
* **model:** expose user-defined index reads on FragmentsModel ([4a33282](https://github.com/ThatOpen/engine_fragment/commit/4a33282195f19bbc3dc81994175a2ed7a60edfe6)), closes [#164](https://github.com/ThatOpen/engine_fragment/issues/164)
* **model:** make index reads see pending edits ([5a08811](https://github.com/ThatOpen/engine_fragment/commit/5a08811c5534940bc48e01ff6a31e1b0b91a9029)), closes [#164](https://github.com/ThatOpen/engine_fragment/issues/164)
* **schema:** add ModelIndex table for user-defined lookups ([fd52cbc](https://github.com/ThatOpen/engine_fragment/commit/fd52cbce2e6e6bddbd740f788f1d39f1fb44d39b)), closes [#164](https://github.com/ThatOpen/engine_fragment/issues/164)
* **split:** return map of file paths to localIds ([#195](https://github.com/ThatOpen/engine_fragment/issues/195)) ([cf6345b](https://github.com/ThatOpen/engine_fragment/commit/cf6345ba9ce67c6fef9b56e29ab653042a6b84f2))
* store localId in tile geometry id attribute ([7c69110](https://github.com/ThatOpen/engine_fragment/commit/7c69110bef484f648c679be73399ac34b197396e))


### Bug Fixes

* correct docs that break docusaurus ([7ff557c](https://github.com/ThatOpen/engine_fragment/commit/7ff557c620e7df59db807fcbc8908b8f5cd57e91))
* correct worker url ([162f083](https://github.com/ThatOpen/engine_fragment/commit/162f083a225195c06ea1201162a5115172f8df10))
* deliver both minified and non-minified code ([2ebcbe5](https://github.com/ThatOpen/engine_fragment/commit/2ebcbe5fa1f673add5b5ab2f1f39ff4bddb68bd5))
* get rid of debug logs ([03cd103](https://github.com/ThatOpen/engine_fragment/commit/03cd10361670d0285040f16b83210967f94b5cba))
* **highlight:** clear all items on no-args resetHighlight ([00e7fe0](https://github.com/ThatOpen/engine_fragment/commit/00e7fe0335f0b13e6349363dbfe7dc36221c8761))
* **ifc-splitter:** add  `IFCMECHANICALFASTENER` to elements types ([#179](https://github.com/ThatOpen/engine_fragment/issues/179)) ([e33a9b0](https://github.com/ThatOpen/engine_fragment/commit/e33a9b0f918e38e2d3947d76218b95fabe70bdf6))
* improve the getItemsByVisibility ([e68c376](https://github.com/ThatOpen/engine_fragment/commit/e68c376d7f679e51d7bfa09aedde118ba616ea00))
* include type entities and solve DefinesOccurrence typo ([79b134a](https://github.com/ThatOpen/engine_fragment/commit/79b134adbc0d2e6a9704fedb28d9da9feb7b129e))
* read alignments when vertical data is missing ([5f67ad4](https://github.com/ThatOpen/engine_fragment/commit/5f67ad4ce6b1d530a0b0abc2065f5be8d5c29c9a))
* solve bug due to rebar circle curve edge case ([fab19d6](https://github.com/ThatOpen/engine_fragment/commit/fab19d6700f0b6ee14a0072d45b8b455674ab14a))
* solve grid bug in some bim models ([161b5b6](https://github.com/ThatOpen/engine_fragment/commit/161b5b6c6a92bb3fcb23b317bef61a564e24c880))
* solve ifc splitter missing lines ([bbf890c](https://github.com/ThatOpen/engine_fragment/commit/bbf890ca2213007a1f91de6fbb0c3a4f1f5f9c6c))
* **TS:** `ProcessData#readCallback` type/jsdocs ([#178](https://github.com/ThatOpen/engine_fragment/issues/178)) ([0f89ec0](https://github.com/ThatOpen/engine_fragment/commit/0f89ec0a1a00b437b37cdd3f801fe14b588f36da))
* upgrade examples to latest three.js version ([a73bf32](https://github.com/ThatOpen/engine_fragment/commit/a73bf32d9cc628daf75f6d270bef65d160426f92))
* write 0 sentinel instead of raw itemIndex when localId lookup misses ([7c560a5](https://github.com/ThatOpen/engine_fragment/commit/7c560a59b10f490e78e8d30017d0a243fa55e3ec))


### Performance Improvements

* lower default worker timing knobs ([6c5b7db](https://github.com/ThatOpen/engine_fragment/commit/6c5b7db61282f00f1b5a2b7df068c41134542c72))
* sequence-fenced update(true), drain on every FINISH ([aaf44ba](https://github.com/ThatOpen/engine_fragment/commit/aaf44ba0014e81cdfa213c0d212b3ce1e49a011d))

## [3.4.0](https://github.com/ThatOpen/engine_fragment/compare/v3.3.2...v3.4.0) (2026-04-09)


### Features

* add crs support ([304d56b](https://github.com/ThatOpen/engine_fragment/commit/304d56b61e9d8d1d2a74ff0176d779345399c61d))
* add ifc file splitter and extractor ([f5ee358](https://github.com/ThatOpen/engine_fragment/commit/f5ee35807f566eff83ae732568ba6ede9727ad5b))
* implement highlights for lod ([063293d](https://github.com/ThatOpen/engine_fragment/commit/063293d59b5123964145fb3df91e9cdbbb3d4118))
* implement more ifc properties cases ([b6ed3c1](https://github.com/ThatOpen/engine_fragment/commit/b6ed3c1b007e9f851f661d2d63bd583e4ecea0c0))
* implement optional traditional workers ([f976443](https://github.com/ThatOpen/engine_fragment/commit/f97644314ba0b8b19ff671760d5c1dbfc638f015))
* inject ifc splitter dependencies ([1cc799b](https://github.com/ThatOpen/engine_fragment/commit/1cc799b15fb0110e8a33c0eb3617ab3980911661))
* make worker url optional ([a99d069](https://github.com/ThatOpen/engine_fragment/commit/a99d06981be223b0cb2b0b13b1f300592024a22f))
* track visible items ([6804110](https://github.com/ThatOpen/engine_fragment/commit/680411030ddb39d5ca64354538a31a688655a53e))


### Bug Fixes

* correct boolean operation bug ([8bc50a7](https://github.com/ThatOpen/engine_fragment/commit/8bc50a7c4493a11d13983d6e2e47a154b26a2d33))
* correct bug when editing newly created items ([381eb46](https://github.com/ThatOpen/engine_fragment/commit/381eb463925b06662fec7399aab966b8ca5676f7))
* correct deduplication algo bug ([081a1a9](https://github.com/ThatOpen/engine_fragment/commit/081a1a9287f7dfb95094e648016ce4f9742e3338))
* correct edge case when editing fragments ([282eb0b](https://github.com/ThatOpen/engine_fragment/commit/282eb0b5dc3b2e994ddd24ea8237c7af194333d7))
* correct edit id conter behavior ([fb9b907](https://github.com/ThatOpen/engine_fragment/commit/fb9b907ac36ae3cb977526efb76d90d020730283))
* correct edit visibility logic ([e1a94ef](https://github.com/ThatOpen/engine_fragment/commit/e1a94efc5985f21f9b59d6f97f6bb2c86c766d8c))
* correct editing newly created elements ([663351d](https://github.com/ThatOpen/engine_fragment/commit/663351d755c8df4f5edbf3ca7e3074dcc2ebac2e))
* correct raycasting frustum for ortho camera ([fda0eca](https://github.com/ThatOpen/engine_fragment/commit/fda0eca55130e7f1ae780ffaf8e6b855fa61572b))
* correct various edit bugs ([363318e](https://github.com/ThatOpen/engine_fragment/commit/363318e095dd3730a843dadc87620704d589759f))
* correct visibility control when using all_visible ([b1b32d4](https://github.com/ThatOpen/engine_fragment/commit/b1b32d4241b2ef435ff5078d89a1afb7aaf79344))
* eliminate visual blink during delta model edits ([0163621](https://github.com/ThatOpen/engine_fragment/commit/01636210b07d6a6ec03e1273fca4324627a0500b))
* **materials:** Fix setColor and setOpacity ([#148](https://github.com/ThatOpen/engine_fragment/issues/148)) ([08289d3](https://github.com/ThatOpen/engine_fragment/commit/08289d3a3f1e5da52cef90ebf09aca9d8f7d81ea))
* **rebar:** use shell geometry if rebars are not exported as SweptDiskSolids ([#156](https://github.com/ThatOpen/engine_fragment/issues/156)) ([20c1916](https://github.com/ThatOpen/engine_fragment/commit/20c1916f30f35f0664728d7e3a7e9c2909cb372b))
* reset attributesToExclude to ensure all attributes are processed ([#159](https://github.com/ThatOpen/engine_fragment/issues/159)) ([1327272](https://github.com/ThatOpen/engine_fragment/commit/132727204b597fbaa521adb5d70f9d10e9d8859a))
* solve error when loading civil files with empty alignments ([069f944](https://github.com/ThatOpen/engine_fragment/commit/069f944b55b918ac0955aefc97995a313a314c79))

## [3.3.2](https://github.com/ThatOpen/engine_fragment/compare/v3.3.0...v3.3.2) (2026-01-27)


### Miscellaneous Chores

* release 3.3.2 ([a902c96](https://github.com/ThatOpen/engine_fragment/commit/a902c96e22d1f37becf78341426ce0bb554a61f9))

## [3.3.0](https://github.com/ThatOpen/engine_fragment/compare/v3.2.1...v3.3.0) (2026-01-22)


### Features

* add all ifc metadata info to fragments ([6fb2e6c](https://github.com/ThatOpen/engine_fragment/commit/6fb2e6ccf841f526265b4e9b30090d0303860964))
* add ifc bridge part to default ifc elements ([1468c6d](https://github.com/ThatOpen/engine_fragment/commit/1468c6d4ed5aed77ccfd2bf88c218d1f911c434f))
* add more methods to single threaded fragments model ([fe43e1a](https://github.com/ThatOpen/engine_fragment/commit/fe43e1ad2776c8e92cc8885b640b40dcd17b73fa))
* allow to load all categories and relations ([0ee5da1](https://github.com/ThatOpen/engine_fragment/commit/0ee5da15aa6918ec2b88493117686ae27c487f47))
* allow to return all raycast results ([7012998](https://github.com/ThatOpen/engine_fragment/commit/701299806cb3462ba0163dd1802f3730b2c7dfc3))
* force ifc spaces to be transparent by default ([2bdd447](https://github.com/ThatOpen/engine_fragment/commit/2bdd44792f49b96d38ef807ee58ba9f96c8a332d))
* implement grids ([3b19a28](https://github.com/ThatOpen/engine_fragment/commit/3b19a28d448ce882ae9de768f2523082fc3dd249))
* implement lod mode ([95bb163](https://github.com/ThatOpen/engine_fragment/commit/95bb163e5b1b38cba04f04a65dc0b05c59b50239))
* **materials:** add depthWrite property to MaterialDefinition ([#145](https://github.com/ThatOpen/engine_fragment/issues/145)) ([391f9dc](https://github.com/ThatOpen/engine_fragment/commit/391f9dc1e1ccf2e9b12987ffb430ae0b144cd551))
* **materials:** add setColor/setOpacity with resetColor/resetOpacity methods ([#137](https://github.com/ThatOpen/engine_fragment/issues/137)) ([db73877](https://github.com/ThatOpen/engine_fragment/commit/db73877a88210104814b1b1c4e92fd568569ee30))
* misc release updates ([42e963a](https://github.com/ThatOpen/engine_fragment/commit/42e963a57b3cf3ba61d83224ee3334b67f28dcdf))


### Bug Fixes

* correct await force update behavior ([92b7f8d](https://github.com/ThatOpen/engine_fragment/commit/92b7f8d99d50caa302f68265a9ad1f01280d539b))
* correct error when importing certain relations ([14aea10](https://github.com/ThatOpen/engine_fragment/commit/14aea10c5e118fc800919e74b730a5f4a05e236c))
* correct grid edge case ([a1fe6f8](https://github.com/ThatOpen/engine_fragment/commit/a1fe6f83edc422cb16e621d17acbfa43e2a440fa))
* correct metadata failing with empty values ([081f296](https://github.com/ThatOpen/engine_fragment/commit/081f296fb7cdbe11d2431d2f7a8df1005ec434a5))
* correct raycasting frustum calculation for orthographic cameras ([#136](https://github.com/ThatOpen/engine_fragment/issues/136)) ([cf0b8fc](https://github.com/ThatOpen/engine_fragment/commit/cf0b8fc6ea749549598f8e7e4ccaf4e7fcd47e0c))
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
