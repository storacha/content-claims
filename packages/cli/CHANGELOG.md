# Changelog

## 1.0.0 (2025-10-27)


### ⚠ BREAKING CHANGES

* Client read interface and client claim types now use multihashes. Relation claim has been removed in favour of upcoming dag-index claim.
* allow specify parts in relation part inclusion

### Features

* `--expire` flag support for cli ([#29](https://github.com/storacha/content-claims/issues/29)) ([e01d609](https://github.com/storacha/content-claims/commit/e01d609c8ab29ae3adc1ef8720ae79bf59d5ffc7))
* add `assert/equals` ([#22](https://github.com/storacha/content-claims/issues/22)) ([bddd948](https://github.com/storacha/content-claims/commit/bddd948db5e1628d20b4d31796690b40b654a720))
* add index claim ([#66](https://github.com/storacha/content-claims/issues/66)) ([0bc19c9](https://github.com/storacha/content-claims/commit/0bc19c9108cf43d7c45390d6a1257eced81420ed))
* add simple CLI ([a9e13ac](https://github.com/storacha/content-claims/commit/a9e13ac8f52d3ac674f7bed8b5708933082c772e))
* allow specify parts in relation part inclusion ([dda837f](https://github.com/storacha/content-claims/commit/dda837f7177fc66ec2ab0acd126900f442e4637a))
* **cli:** add descendant command ([f0581ae](https://github.com/storacha/content-claims/commit/f0581ae33e5a5aa7c6c88383be8b952e7155907e))
* client claim reader ([5395620](https://github.com/storacha/content-claims/commit/5395620926a7c6da325a3b617d0fd9d8bba09bac))
* export decode claim function ([#12](https://github.com/storacha/content-claims/issues/12)) ([17018dc](https://github.com/storacha/content-claims/commit/17018dc9de8b14937fff9e5e4cf47bc5c0d55cb7))
* publish content claims by multihash ([#61](https://github.com/storacha/content-claims/issues/61)) ([151f4a1](https://github.com/storacha/content-claims/commit/151f4a1461b8060fe33f6e5c1622bc6b02165c28))
* upgrade to latest ucanto ([#30](https://github.com/storacha/content-claims/issues/30)) ([1323df1](https://github.com/storacha/content-claims/commit/1323df1a3c034805c2d08733be7349991971c68e))


### Bug Fixes

* add linting and fix type errors ([#33](https://github.com/storacha/content-claims/issues/33)) ([5450a8b](https://github.com/storacha/content-claims/commit/5450a8bc207fb75b73a25ceed8d5091d0f95be65))
* add missing repo URL ([7991d7c](https://github.com/storacha/content-claims/commit/7991d7cbb77f84c96285bb776feb22994d67c8e8))
* offset ([31a4578](https://github.com/storacha/content-claims/commit/31a4578c13093fdf958890fe20bf7b8fcc625df4))
* relation claim cration in CLI ([382c61e](https://github.com/storacha/content-claims/commit/382c61e45f504e1fe084d574006d13f008a389f9))
* repo references ([ba845ad](https://github.com/storacha/content-claims/commit/ba845ad1d40c158d9f1a5c0e2640284bfbf6dc97))
* revert descendant claim ([1eada28](https://github.com/storacha/content-claims/commit/1eada2857b088e6aec81f9ecd5d5a9630597cbd6))
* update dependencies ([#87](https://github.com/storacha/content-claims/issues/87)) ([e1d74ab](https://github.com/storacha/content-claims/commit/e1d74abd5de87719fc20dff868d5939dad5af4ef))
* upgrade ucanto libs ([#55](https://github.com/storacha/content-claims/issues/55)) ([a8b4546](https://github.com/storacha/content-claims/commit/a8b4546c69a656e965cf39b1008b75eb6a006bf1))
* walk must be array when passed to client ([#25](https://github.com/storacha/content-claims/issues/25)) ([531e780](https://github.com/storacha/content-claims/commit/531e780eefc2e26bdf8fc1f9bb2897954b6eb903))
