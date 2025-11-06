# プロジェクト概要

- Slack Deno SDK を用いて Slack
  ワークフロー/トリガー/関数を管理するテンプレート。
- TypeScript (Deno v2 互換) を使用し、Slack CLI での開発・デプロイを前提とした
  OSS。
- 構成: `functions/` に Slack Functions、`workflows/`
  にワークフロー、`triggers/` にトリガー、`assets/` に静的アセット、`.github/`
  に CI/CD・テンプレート類。
- 主な設定ファイル: `deno.jsonc` (tasks・compilerOptions), `import_map.json`,
  `manifest.ts`, `slack.json`。
- README にセットアップ手順と Slack CLI を利用した deploy/run
  の流れが記載されている。
