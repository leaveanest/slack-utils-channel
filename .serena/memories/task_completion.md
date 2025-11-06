# タスク完了時の確認事項

- `deno task fmt/lint/check/test` の実行と結果確認。
- Slack CLI 実行/デプロイが必要な変更の場合は `slack run` / `slack deploy`
  で検証。
- 変更内容・影響範囲を PR テンプレートに沿って整理し、関連 Issue を `Closes #`
  でリンク。
- Secrets (.env や Slack tokens) がコミットに含まれていないか確認。
