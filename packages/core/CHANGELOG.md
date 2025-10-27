# Changelog

## [5.2.4](https://github.com/storacha/content-claims/compare/content-claims-v5.2.3...content-claims-v5.2.4) (2025-10-27)


### Bug Fixes

* tweak README to get another release ([#93](https://github.com/storacha/content-claims/issues/93)) ([5a3214b](https://github.com/storacha/content-claims/commit/5a3214b601f962020b600f2949c6476ba0bddb81))

## [5.2.3](https://github.com/storacha/content-claims/compare/content-claims-v5.2.2...content-claims-v5.2.3) (2025-10-27)


### Bug Fixes

* tweaks for oidc trusted publishing ([#90](https://github.com/storacha/content-claims/issues/90)) ([eefc864](https://github.com/storacha/content-claims/commit/eefc864db75e33658f0ffafcfceb10607c84b763))

## [5.2.2](https://github.com/storacha/content-claims/compare/content-claims-v5.2.1...content-claims-v5.2.2) (2025-10-24)


### Bug Fixes

* update dependencies ([#87](https://github.com/storacha/content-claims/issues/87)) ([e1d74ab](https://github.com/storacha/content-claims/commit/e1d74abd5de87719fc20dff868d5939dad5af4ef))

## [5.2.1](https://github.com/storacha/content-claims/compare/content-claims-v5.2.0...content-claims-v5.2.1) (2025-05-13)


### Bug Fixes

* use Schema.principal() to allow byte encoded space DID in location claim ([34a835c](https://github.com/storacha/content-claims/commit/34a835ce163fe17263a8ed88124ce95c4aa68e65))

## [5.2.0](https://github.com/storacha/content-claims/compare/content-claims-v5.1.3...content-claims-v5.2.0) (2025-01-30)


### Features

* **capability:** add space to location assertion ([#84](https://github.com/storacha/content-claims/issues/84)) ([5212b1a](https://github.com/storacha/content-claims/commit/5212b1af03880fc7eb055ca0339003119b0cec60))

## [5.1.3](https://github.com/storacha/content-claims/compare/content-claims-v5.1.2...content-claims-v5.1.3) (2024-11-04)


### Bug Fixes

* repo references ([ba845ad](https://github.com/storacha/content-claims/commit/ba845ad1d40c158d9f1a5c0e2640284bfbf6dc97))

## [5.1.2](https://github.com/storacha/content-claims/compare/content-claims-v5.1.1...content-claims-v5.1.2) (2024-11-04)


### Bug Fixes

* eample ([9ce4b16](https://github.com/storacha/content-claims/commit/9ce4b166c607b045dbebc6608cde21a91286688e))

## [5.1.1](https://github.com/storacha/content-claims/compare/content-claims-v5.1.0...content-claims-v5.1.1) (2024-11-04)


### Bug Fixes

* content claims derives ([#74](https://github.com/storacha/content-claims/issues/74)) ([6791016](https://github.com/storacha/content-claims/commit/6791016b3c320e68ee764e788528dfd4323cd90a))

## [5.1.0](https://github.com/storacha/content-claims/compare/content-claims-v5.0.0...content-claims-v5.1.0) (2024-06-03)


### Features

* add index claim ([#66](https://github.com/storacha/content-claims/issues/66)) ([0bc19c9](https://github.com/storacha/content-claims/commit/0bc19c9108cf43d7c45390d6a1257eced81420ed))

## [5.0.0](https://github.com/storacha/content-claims/compare/content-claims-v4.0.5...content-claims-v5.0.0) (2024-05-29)


### ⚠ BREAKING CHANGES

* Client read interface and client claim types now use multihashes. Relation claim has been removed in favour of upcoming dag-index claim.

### Features

* publish content claims by multihash ([#61](https://github.com/storacha/content-claims/issues/61)) ([151f4a1](https://github.com/storacha/content-claims/commit/151f4a1461b8060fe33f6e5c1622bc6b02165c28))

## [4.0.5](https://github.com/storacha/content-claims/compare/content-claims-v4.0.4...content-claims-v4.0.5) (2024-04-23)


### Bug Fixes

* migrate repo ([#58](https://github.com/storacha/content-claims/issues/58)) ([d18a371](https://github.com/storacha/content-claims/commit/d18a371d27579ff41784c9a901bfff63f73a20a8))

## [4.0.4](https://github.com/web3-storage/content-claims/compare/content-claims-v4.0.3...content-claims-v4.0.4) (2024-04-04)


### Bug Fixes

* upgrade ucanto libs ([#55](https://github.com/web3-storage/content-claims/issues/55)) ([a8b4546](https://github.com/web3-storage/content-claims/commit/a8b4546c69a656e965cf39b1008b75eb6a006bf1))

## [4.0.3](https://github.com/web3-storage/content-claims/compare/content-claims-v4.0.2...content-claims-v4.0.3) (2024-03-26)


### Bug Fixes

* re-export AnyAssertCap ([51d1f69](https://github.com/web3-storage/content-claims/commit/51d1f69aa2c9a97d9b90a581650f2adf6d29a526))

## [4.0.2](https://github.com/web3-storage/content-claims/compare/content-claims-v4.0.1...content-claims-v4.0.2) (2024-02-08)


### Bug Fixes

* export capability api in types ([#48](https://github.com/web3-storage/content-claims/issues/48)) ([6c8e5c9](https://github.com/web3-storage/content-claims/commit/6c8e5c915b0075b2bd19bb0839fb20e11850644b))
* trigger release to fix type exports ([#49](https://github.com/web3-storage/content-claims/issues/49)) ([f410f48](https://github.com/web3-storage/content-claims/commit/f410f486c29b2b4d51fa3b4675cc10c2956f6a2a))

## [4.0.1](https://github.com/web3-storage/content-claims/compare/content-claims-v4.0.0...content-claims-v4.0.1) (2023-12-13)


### Bug Fixes

* fix content-claims package not being importable by ts project by having package.json point to src alongside types ([#41](https://github.com/web3-storage/content-claims/issues/41)) ([9931249](https://github.com/web3-storage/content-claims/commit/9931249030e5c1a2b1616c2ba35a567a64667dee))

## [4.0.0](https://github.com/web3-storage/content-claims/compare/content-claims-v3.2.1...content-claims-v4.0.0) (2023-12-13)


### ⚠ BREAKING CHANGES

* `@web3-storage/content-claims` tsconfig.json uses NodeNext ([#38](https://github.com/web3-storage/content-claims/issues/38))

### Features

* `@web3-storage/content-claims` tsconfig.json uses NodeNext ([#38](https://github.com/web3-storage/content-claims/issues/38)) ([2875e8d](https://github.com/web3-storage/content-claims/commit/2875e8d99d762188019c3e99ce6163e7302b3201))

## [3.2.1](https://github.com/web3-storage/content-claims/compare/content-claims-v3.2.0...content-claims-v3.2.1) (2023-11-27)


### Bug Fixes

* add linting and fix type errors ([#33](https://github.com/web3-storage/content-claims/issues/33)) ([5450a8b](https://github.com/web3-storage/content-claims/commit/5450a8bc207fb75b73a25ceed8d5091d0f95be65))
* exports types ([1d413a8](https://github.com/web3-storage/content-claims/commit/1d413a87429c6b6bc589d52996430a94b61c9e76))

## [3.2.0](https://github.com/web3-storage/content-claims/compare/content-claims-v3.1.0...content-claims-v3.2.0) (2023-10-12)


### Features

* upgrade to latest ucanto ([#30](https://github.com/web3-storage/content-claims/issues/30)) ([1323df1](https://github.com/web3-storage/content-claims/commit/1323df1a3c034805c2d08733be7349991971c68e))

## [3.1.0](https://github.com/web3-storage/content-claims/compare/content-claims-v3.0.1...content-claims-v3.1.0) (2023-09-19)


### Features

* add `assert/equals` ([#22](https://github.com/web3-storage/content-claims/issues/22)) ([bddd948](https://github.com/web3-storage/content-claims/commit/bddd948db5e1628d20b4d31796690b40b654a720))
* ensure claim API is CID version agnostic ([#18](https://github.com/web3-storage/content-claims/issues/18)) ([1690c1f](https://github.com/web3-storage/content-claims/commit/1690c1f2bbd6d85a289fcb0ae6a8b524c9022160))
* store equals for both content and equals multihash ([#23](https://github.com/web3-storage/content-claims/issues/23)) ([715fcd5](https://github.com/web3-storage/content-claims/commit/715fcd5ddb219e77f8573df889f46183c55ce400))


### Bug Fixes

* key content on multihash not CID ([#21](https://github.com/web3-storage/content-claims/issues/21)) ([7e737a7](https://github.com/web3-storage/content-claims/commit/7e737a7325bd295db186cc0eaacd7026fbb65986))

## [3.0.1](https://github.com/web3-storage/content-claims/compare/content-claims-v3.0.0...content-claims-v3.0.1) (2023-07-26)


### Bug Fixes

* types ([fe89dca](https://github.com/web3-storage/content-claims/commit/fe89dcaa59680fdcaaa3523c93a47c483c0065a5))

## [3.0.0](https://github.com/web3-storage/content-claims/compare/content-claims-v2.3.1...content-claims-v3.0.0) (2023-07-26)


### ⚠ BREAKING CHANGES

* allow specify parts in relation part inclusion

### Features

* allow specify parts in relation part inclusion ([dda837f](https://github.com/web3-storage/content-claims/commit/dda837f7177fc66ec2ab0acd126900f442e4637a))

## [2.3.1](https://github.com/web3-storage/content-claims/compare/content-claims-v2.3.0...content-claims-v2.3.1) (2023-07-25)


### Bug Fixes

* revert descendant claim ([1eada28](https://github.com/web3-storage/content-claims/commit/1eada2857b088e6aec81f9ecd5d5a9630597cbd6))

## [2.3.0](https://github.com/web3-storage/content-claims/compare/content-claims-v2.2.0...content-claims-v2.3.0) (2023-07-25)


### Features

* add descendant claim ([9afb9c0](https://github.com/web3-storage/content-claims/commit/9afb9c097d490c0e6ce4e9364a7b6f85343d89d7))
* **cli:** add descendant command ([f0581ae](https://github.com/web3-storage/content-claims/commit/f0581ae33e5a5aa7c6c88383be8b952e7155907e))

## [2.2.0](https://github.com/web3-storage/content-claims/compare/content-claims-v2.1.1...content-claims-v2.2.0) (2023-07-21)


### Features

* export decode claim function ([#12](https://github.com/web3-storage/content-claims/issues/12)) ([17018dc](https://github.com/web3-storage/content-claims/commit/17018dc9de8b14937fff9e5e4cf47bc5c0d55cb7))

## [2.1.1](https://github.com/web3-storage/content-claims/compare/content-claims-v2.1.0...content-claims-v2.1.1) (2023-07-14)


### Bug Fixes

* **client:** types for relation claim ([1267ad9](https://github.com/web3-storage/content-claims/commit/1267ad920c410745b540a05f765556b509b4194a))

## [2.1.0](https://github.com/web3-storage/content-claims/compare/content-claims-v2.0.0...content-claims-v2.1.0) (2023-07-14)


### Features

* materialize claims from block index table ([33c46ff](https://github.com/web3-storage/content-claims/commit/33c46ff241f57b3259b1b0aac62a26c788d3faac))

## [2.0.0](https://github.com/web3-storage/content-claims/compare/content-claims-v1.1.0...content-claims-v2.0.0) (2023-07-12)


### ⚠ BREAKING CHANGES

* allow index CID to be sent with location claim
* simplify read method return type

### Features

* allow index CID to be sent with location claim ([8e7efa9](https://github.com/web3-storage/content-claims/commit/8e7efa9fbd5e0842680f08b55faf9d3c7d7cab6f))
* clean up ([d1015d9](https://github.com/web3-storage/content-claims/commit/d1015d9b2960f750f0eb2b3a8a2d94b6870d4f3f))


### Code Refactoring

* simplify read method return type ([2af24e8](https://github.com/web3-storage/content-claims/commit/2af24e8efa72647c49702da020b6f7e3cd896b6d))

## [1.1.0](https://github.com/web3-storage/content-claims/compare/content-claims-v1.0.3...content-claims-v1.1.0) (2023-07-11)


### Features

* client claim reader ([5395620](https://github.com/web3-storage/content-claims/commit/5395620926a7c6da325a3b617d0fd9d8bba09bac))

## [1.0.3](https://github.com/web3-storage/content-claims/compare/content-claims-v1.0.2...content-claims-v1.0.3) (2023-07-10)


### Bug Fixes

* switch up example capability ([53b43e2](https://github.com/web3-storage/content-claims/commit/53b43e25374c75669a12facfd3ec312262e4d600))

## [1.0.2](https://github.com/web3-storage/content-claims/compare/content-claims-v1.0.1...content-claims-v1.0.2) (2023-07-10)


### Bug Fixes

* examples on README ([805f666](https://github.com/web3-storage/content-claims/commit/805f66694e539dd750f0429da4069cd789903939))

## [1.0.1](https://github.com/web3-storage/content-claims/compare/content-claims-v1.0.0...content-claims-v1.0.1) (2023-07-10)


### Bug Fixes

* trigger release ([1c76b16](https://github.com/web3-storage/content-claims/commit/1c76b16aeb4d48e43f7543eff2dabbe166442229))

## 1.0.0 (2023-07-10)


### Features

* add list method to claim store ([83e837e](https://github.com/web3-storage/content-claims/commit/83e837e5628e644a7e638d90940947f5b3cd76af))
* add parts to relation claim ([95abc3c](https://github.com/web3-storage/content-claims/commit/95abc3c243d37a653b98bf1915b32361466c4889))
* initial commit ([e60ebe1](https://github.com/web3-storage/content-claims/commit/e60ebe1b00b11529bf726521a850cc43b7e0c478))
* store invocation CID ([2f3c9ba](https://github.com/web3-storage/content-claims/commit/2f3c9ba9b0f7fb1f969620353f23c09c43c23348))
* wip claims endpoint ([e8e8f05](https://github.com/web3-storage/content-claims/commit/e8e8f05a0d659c8d541de5f464eded91d18a4245))


### Bug Fixes

* dynamo stores ([9ecf969](https://github.com/web3-storage/content-claims/commit/9ecf969fafc9b8384c49fcf377710062dbb547b0))
