# Changelog

## [1.3.0](https://github.com/leaveanest/slack-utils-channel/compare/v1.2.1...v1.3.0) (2025-12-09)


### Features

* add optional description parameter for private channel creation ([1579a43](https://github.com/leaveanest/slack-utils-channel/commit/1579a43511c5b373964d136193ee16081fe89d6d))


### Bug Fixes

* setTopicからsetPurposeへの変更に伴うテストと埋め込みロケールの更新 ([679a193](https://github.com/leaveanest/slack-utils-channel/commit/679a193854b1a950f655e430b9f3e2bfcb4ffc80))
* チャンネル説明がsetTopicではなくsetPurposeで設定されるように修正 ([db6108f](https://github.com/leaveanest/slack-utils-channel/commit/db6108fa6898fd43b142763223a5d20a3d88055e))

## [1.2.1](https://github.com/leaveanest/slack-utils-channel/compare/v1.2.0...v1.2.1) (2025-12-09)


### Bug Fixes

* CIでLOCALE環境変数を設定してテストが日本語ロケールで実行されるように修正 ([dd341d4](https://github.com/leaveanest/slack-utils-channel/commit/dd341d446f1cba698f29f4c34b6a96d405e7ed5e))

## [1.2.0](https://github.com/leaveanest/slack-utils-channel/compare/v1.1.0...v1.2.0) (2025-12-09)


### Features

* add approvers to private channel members on creation ([3236326](https://github.com/leaveanest/slack-utils-channel/commit/32363268ae4407c88ad76864f3665d3614e4192b))

## [1.1.0](https://github.com/leaveanest/slack-utils-channel/compare/v1.0.0...v1.1.0) (2025-12-05)


### Features

* add filtered approver selection for private channel requests ([02ab429](https://github.com/leaveanest/slack-utils-channel/commit/02ab42939e90df65de6ed48294b5411282030ffd))
* add get_authorized_users function to filter admins/owners ([bfba2c2](https://github.com/leaveanest/slack-utils-channel/commit/bfba2c26990ef4bce9083f8c793cff41c456af30))
* enhance private channel request workflow with authorized user type ([9711835](https://github.com/leaveanest/slack-utils-channel/commit/9711835b863d303ef17fb39d593e6d7c66d217da))
* update channel ID validation to include private and DM formats ([2183a3b](https://github.com/leaveanest/slack-utils-channel/commit/2183a3b286b50fab8d136eeeefb18738cd639832))

## 1.0.0 (2025-11-27)


### Features

* add approver validation and enhance member invitation process ([c4999a4](https://github.com/leaveanest/slack-utils-channel/commit/c4999a43f9ddb3d496dbee104990c71610ebe3f5))
* add Slack channel operation functions ([5cdea05](https://github.com/leaveanest/slack-utils-channel/commit/5cdea05be1be07b01a664a58189bde53e2e30874))
* add SLACK_TEAM_ID environment variable support for Enterprise Grid ([c3f8013](https://github.com/leaveanest/slack-utils-channel/commit/c3f801323763097ddffa4e6ec97011d84aad94ed))
* add workflows and triggers for channel operations ([c11acf3](https://github.com/leaveanest/slack-utils-channel/commit/c11acf3684ab71841bcb2415c1573344ccf9cce3))
* 管理者承認によるプライベートチャンネル作成機能を追加 ([3aca65e](https://github.com/leaveanest/slack-utils-channel/commit/3aca65e750e5cb52a7b4f229e7f7e764f416fd7f))


### Bug Fixes

* add Enterprise Grid support with team_id parameter for channel creation ([c2e965f](https://github.com/leaveanest/slack-utils-channel/commit/c2e965ff1fe3097a2233b552f3dcb5427155aff9))
* add Japanese translations for new i18n keys ([aeb862c](https://github.com/leaveanest/slack-utils-channel/commit/aeb862c96b6e0c2f02b1402145d9267ca930c8b6))
* add non-null assertions to test arguments for TypeScript strict mode ([45a7a53](https://github.com/leaveanest/slack-utils-channel/commit/45a7a53e411aaee1261d5e50bcccd3c40f37b8f4))
* add team_id input for Enterprise Grid compatibility ([dba0ba7](https://github.com/leaveanest/slack-utils-channel/commit/dba0ba7ef40b8f59df5a40bc1ba33389f8641ce9))
* add team:read and admin.conversations:write scopes for Enterprise Grid support ([39860c2](https://github.com/leaveanest/slack-utils-channel/commit/39860c2ba2c0d6e34c00bfa6b01bec733e5a1d2f))
* embed i18n messages and remove team_id for Run on Slack compatibility ([d397bba](https://github.com/leaveanest/slack-utils-channel/commit/d397bbac6f676c697a527f65e82f392ea73b5416))
* prefix unused error variable with underscore for lint compliance ([e68d022](https://github.com/leaveanest/slack-utils-channel/commit/e68d0229d32910f8e5f195a864a6ae99665defbe))
* remove team_id parameter for Sandbox workspace compatibility ([c718a64](https://github.com/leaveanest/slack-utils-channel/commit/c718a64afa611d48945c2a2637d159e937895209))
* remove template literal usage in workflow messages for type safety ([5f93782](https://github.com/leaveanest/slack-utils-channel/commit/5f937822b8254280012382eb7053018d895c9266))
* remove unused variables in workflows to pass lint check ([16974c1](https://github.com/leaveanest/slack-utils-channel/commit/16974c1f6cdf6f461357eb9a513a21528b67505f))
* remove value property from customizable trigger inputs ([dd5112b](https://github.com/leaveanest/slack-utils-channel/commit/dd5112b06bf085ff9e66b28119b51c5d3062f314))
* revert to direct private channel creation with team_id ([d4130c8](https://github.com/leaveanest/slack-utils-channel/commit/d4130c840e301188a4b53339ab0826e10365c00d))

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
