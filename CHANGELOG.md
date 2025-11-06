# Changelog

## [1.7.0](https://github.com/leaveanest/slack-utils/compare/v1.6.0...v1.7.0) (2025-10-30)


### Features

* CI通知を大幅強化して詳細情報を追加 ([1f74365](https://github.com/leaveanest/slack-utils/commit/1f74365ab341ec180807b92c85fab0382a9d1018))
* Slack通知を詳細情報を含むリッチフォーマットに強化 ([2aa73d2](https://github.com/leaveanest/slack-utils/commit/2aa73d22849175012f752f977ad82e9d298850a5))

## [1.6.0](https://github.com/leaveanest/slack-utils/compare/v1.5.0...v1.6.0) (2025-10-30)


### Features

* i18n翻訳をOpenAI gpt-4oからClaude Haiku 4.5に移行 ([82800b4](https://github.com/leaveanest/slack-utils/commit/82800b4c229ef5d53e8cbe8a5d71dd7803ad603e))


### Bug Fixes

* Claudeの複数contentブロックを結合して翻訳を取得 ([994ad3e](https://github.com/leaveanest/slack-utils/commit/994ad3e3e295edf5bbb781b4f0c3e7961cf6dcf4))

## [1.5.0](https://github.com/leaveanest/slack-utils/compare/v1.4.0...v1.5.0) (2025-10-29)


### Features

* i18n翻訳モデルをGPT-4からgpt-4oに変更 ([8ecb6ea](https://github.com/leaveanest/slack-utils/commit/8ecb6eac7eff7f8bf7041b554b95ae12dde73453))
* Zodバリデーションエラーメッセージをi18n化 ([6c199d7](https://github.com/leaveanest/slack-utils/commit/6c199d7751ec945fb2b716cccd4c7cce3b5cc561))
* Zodバリデーションライブラリを導入 ([9d96829](https://github.com/leaveanest/slack-utils/commit/9d96829852e1a50231529b19ad03a82e1854016b))


### Bug Fixes

* lib/validation/schemas.tsでトップレベルawaitによるi18n初期化を追加 ([a65b0cc](https://github.com/leaveanest/slack-utils/commit/a65b0cc39bbd9df6650ba96d53e2ea932b207d83))
* lib/validation/test.tsで全ロケールを事前に読み込むように修正 ([0c12dcf](https://github.com/leaveanest/slack-utils/commit/0c12dcff8cc9fcb34f5420a94608bdf3374d87ab))
* OpenAIモデル名をgpt-4oに統一 ([4f0b01c](https://github.com/leaveanest/slack-utils/commit/4f0b01c39ead4fd3778f9a2a35d732c0ccdeda5c))

## [1.4.0](https://github.com/leaveanest/slack-utils/compare/v1.3.0...v1.4.0) (2025-10-24)


### Features

* add exception handling rules for API and validation ([602898c](https://github.com/leaveanest/slack-utils/commit/602898c4d59d847b0ffc0f2a7ac4f66ee3c510cb))

## [1.3.0](https://github.com/leaveanest/slack-utils/compare/v1.2.0...v1.3.0) (2025-10-24)


### Features

* enhance VSCode settings with comprehensive development environment ([14487e9](https://github.com/leaveanest/slack-utils/commit/14487e9e20a0dc6498d7913cfe8c26ac68760da1))


### Bug Fixes

* add settings.json to version control for team consistency ([bc9d563](https://github.com/leaveanest/slack-utils/commit/bc9d563c539412a3c4bc61c8c201301d1c682512))
* downgrade first-interaction action from v3 to v1 ([9e331ed](https://github.com/leaveanest/slack-utils/commit/9e331edbf0a943f631ebb4c46757332ee2cbb73a))

## [1.2.0](https://github.com/leaveanest/slack-utils/compare/v1.1.0...v1.2.0) (2025-10-24)


### Features

* **i18n:** implement multi-language support and automatic translation ([16f1c8c](https://github.com/leaveanest/slack-utils/commit/16f1c8c7f0d74951c3afac7069709530c375065d))


### Bug Fixes

* **ci:** update i18n workflows to use Deno v2.x ([4463e30](https://github.com/leaveanest/slack-utils/commit/4463e302aa27e80c5577c4e800e2d8d0d16c4853))
* **i18n:** disable sanitizers for i18n tests ([fcc300a](https://github.com/leaveanest/slack-utils/commit/fcc300a6dd5e81403401d686305c564dfcc34cd8))
* **i18n:** use import_map for test imports ([f51ba73](https://github.com/leaveanest/slack-utils/commit/f51ba733f5f15c32b2667f8a44370e833c40da20))
* **test:** disable sanitizers for all i18n-related tests ([cd621e0](https://github.com/leaveanest/slack-utils/commit/cd621e0bc540c6ffef998ed8b9dfab4924176042))

## [1.1.0](https://github.com/leaveanest/slack-utils/compare/v1.0.2...v1.1.0) (2025-10-20)


### Features

* upgrade Slack Deno SDK to latest versions and fix Deno 2.0 compatibility ([6954b29](https://github.com/leaveanest/slack-utils/commit/6954b2920fb647967a8b0bdcac3618010fbdfe3f))

## [1.0.2](https://github.com/leaveanest/slack-utils/compare/v1.0.1...v1.0.2) (2025-10-17)


### Bug Fixes

* exclude CHANGELOG.md from format checking ([9b212bb](https://github.com/leaveanest/slack-utils/commit/9b212bb9a531e6ea7644e43b2caed342f84543d6))
* remove \n from Slack notification messages ([cdb9d39](https://github.com/leaveanest/slack-utils/commit/cdb9d396feeea69ae47aa2f1448ed5e77f901f2e))

## [1.0.1](https://github.com/leaveanest/slack-utils/compare/v1.0.0...v1.0.1) (2025-10-17)


### Bug Fixes

* handle semantic-release default export correctly ([0a1352b](https://github.com/leaveanest/slack-utils/commit/0a1352b620757725da71c87124211c6d465f1b14))

## 1.0.0 (2025-10-17)

### Bug Fixes

- add actions:read permission to security workflow
  ([d7b8c90](https://github.com/leaveanest/slack-utils/commit/d7b8c90a3c29ae72b145bcc6f9013ea48443cea6))
- remove SARIF upload for private repository
  ([1e55225](https://github.com/leaveanest/slack-utils/commit/1e552255ff2f510298ad8a523e68c06819c98212))
- update Slack channel name to
  [#05](https://github.com/leaveanest/slack-utils/issues/05)-miyazawa
  ([50f7036](https://github.com/leaveanest/slack-utils/commit/50f7036e3133df71a40876e1511ffbf699cc4dc1))
