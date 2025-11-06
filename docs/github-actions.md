# GitHub Actions ワークフロー一覧

プロジェクト内の GitHub Actions
ワークフローを以下に整理しました。トリガーと主目的をまず表形式でまとめ、続いて詳細を記載しています。

| ファイル                                 | ワークフロー名           | 主なトリガー                                        | 主な役割                                                            |
| ---------------------------------------- | ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------- |
| `.github/workflows/ci.yml`               | CI                       | `push`(main), `pull_request`(main)                  | Deno プロジェクトのフォーマット、Lint、型チェック、テストを実行     |
| `.github/workflows/deno-ci.yml`          | Deno CI                  | `push`(main), `pull_request`                        | 複数 OS での Deno テスト、カバレッジ収集と Codecov 連携             |
| `.github/workflows/release.yml`          | Release                  | `push`(main)                                        | release-please によるリリース生成、npm/JSR 公開、リリースノート更新 |
| `.github/workflows/security.yml`         | Security Scan            | `push`(main), `pull_request`, `schedule`(毎週月曜)  | TruffleHog と Trivy による秘密情報・脆弱性スキャン                  |
| `.github/workflows/slack-notify.yml`     | Slack Notifications      | `issues`, `pull_request`, `release`, `workflow_run` | Issue/PR/Release/CI 完了時に Slack へ通知                           |
| `.github/workflows/pr-size.yml`          | PR Size Check            | `pull_request`                                      | 変更行数に応じた PR ラベル付与                                      |
| `.github/workflows/issue-automation.yml` | Issue Automation         | `issues`(labeled)                                   | ラベル付与時にコメント・ラベル整備（※将来実装予定）                 |
| `.github/workflows/welcome.yml`          | Welcome New Contributors | `issues`(opened), `pull_request_target`(opened)     | 初回投稿者への歓迎メッセージ送信                                    |
| `.github/workflows/issue-to-pr.yml`      | Issue to PR with Codex   | `issues`(labeled)                                   | `codex-ready` ラベル付与で自動修正 PR を生成（※将来的に実装予定）   |

## 各ワークフローの詳細

### CI (`.github/workflows/ci.yml`)

- Deno v2
  系をセットアップし、`deno fmt --check`、`deno task lint`、`deno task check`、`deno task test`
  を順に実行します。
- シンプルな単一ジョブ構成で、メインブランチ向けの基本的な品質ゲートとして機能します。

### Deno CI (`.github/workflows/deno-ci.yml`)

- マトリクス戦略で `ubuntu-latest`、`macos-latest`、`windows-latest`
  をカバーし、クロスプラットフォームでの動作確認を行います。
- 依存キャッシュ、カバレッジ生成、Codecov へのアップロードまで含む包括的な CI
  パイプラインです。

### Release (`.github/workflows/release.yml`)

- `google-github-actions/release-please-action`
  を用いてタグ生成とリリースノート作成を自動化します。
- 条件付きで Node.js / Deno をセットアップし、npm・JSR 公開、Semantic Release
  ベースの多言語リリースノート生成、リリースアセットの ZIP
  化とアップロードまでを行います。

### Security Scan (`.github/workflows/security.yml`)

- TruffleHog による秘密情報検出と Trivy
  によるファイルシステムスキャンを実施し、検出結果を SARIF
  としてアップロードします。
- 定期実行 (毎週月曜) と PR トリガーにより継続的なセキュリティ監視を実現します。

### Slack Notifications (`.github/workflows/slack-notify.yml`)

- Issue/PR/Release/ワークフロー完了イベントを検知し、Slack Webhook
  が設定されている場合のみ通知を送信します。
- イベント種別や状態に応じた日本語メッセージを組み立て、`8398a7/action-slack`
  を使って送信します。

### PR Size Check (`.github/workflows/pr-size.yml`)

- `codelytv/pr-size-labeler` により PR の差分行数に応じたサイズラベル (XS〜XL)
  を自動付与します。
- 1000 行超の PR に対しては対応の分割などを促すメッセージを投稿します。

### Issue Automation (`.github/workflows/issue-automation.yml`)

**※ 注意:
この機能は将来的な実装予定です。現時点ではワークフローの準備のみ完了しています。**

- Issue に `ready-for-development` ラベルが付いたタイミングで `backlog`
  ラベルを付与し、開始準備完了を通知するコメントを残す計画です。
- `actions/github-script` を用いて GitHub API を直接操作する予定です。
- 実際の運用フローが確立した段階で有効化します。

### Welcome New Contributors (`.github/workflows/welcome.yml`)

- 初めて Issue や PR
  を投稿したコントリビューターに向け、日英併記の歓迎メッセージを送信します。
- `actions/first-interaction` を利用し、`CONTRIBUTING.md` への導線も提供します。

### Issue to PR with Codex (`.github/workflows/issue-to-pr.yml`)

**※ 注意: この機能は将来的な実装予定です。GitHub
Actionsからの操作が可能になり次第、有効化します。**

- Issue に `codex-ready` ラベルが付くと専用ブランチを作成し、OpenAI Codex
  を使って修正案を生成する計画です。
- Codex 自体は実用的ですが、GitHub Actions
  から直接操作できるようになった段階で有効化予定です。
- 現在はワークフローファイルのみ準備されており、GitHub
  Actions連携の実現を待っている状態です。
