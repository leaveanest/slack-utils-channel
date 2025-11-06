# よく使うコマンド

- `deno task fmt` / `deno fmt --check` : フォーマット
- `deno task lint` / `deno lint` : リンター
- `deno task check` : 型チェック
- `deno task test` : テスト (必要権限: --allow-env --allow-read)
- `deno task dev` : Slack ワークフローのローカル実行
- `slack run workflows/<workflow>` : ワークフロー実行
- `slack deploy --env production` : Slack CLI デプロイ
- `slack triggers create --trigger-file triggers/<trigger>.ts` : トリガー登録
