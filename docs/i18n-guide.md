# I18n（多言語対応）ガイド

このドキュメントでは、slack-utilsプロジェクトにおける多言語対応（I18n:
Internationalization）の使い方を説明します。

## 目次

- [概要](#概要)
- [サポート言語](#サポート言語)
- [基本的な使い方](#基本的な使い方)
- [新しいメッセージの追加](#新しいメッセージの追加)
- [自動翻訳ワークフロー](#自動翻訳ワークフロー)
- [整合性チェック](#整合性チェック)
- [テスト](#テスト)
- [トラブルシューティング](#トラブルシューティング)

## 概要

このプロジェクトでは、以下の機能を提供しています：

- **JSON形式の翻訳ファイル**: `locales/`
  ディレクトリに言語ごとのJSONファイルを配置
- **自動翻訳**: GitHub ActionsとOpenAI APIを使った日本語への自動翻訳
- **整合性チェック**: CI/CDで翻訳漏れやプレースホルダーの不一致を自動検出
- **型安全な翻訳関数**: TypeScriptで型安全にメッセージを取得

## サポート言語

現在サポートされている言語：

- **English (en)** - ベース言語
- **日本語 (ja)** - 自動翻訳

## 基本的な使い方

### コード内での翻訳関数の使用

```typescript
import { t } from "../../lib/i18n/mod.ts";

// シンプルなメッセージ
const message = t("errors.unknown_error");
// => "An unexpected error occurred" (英語)
// => "予期しないエラーが発生しました" (日本語)

// プレースホルダー付きメッセージ
const errorMsg = t("errors.channel_not_found", { error: "not_found" });
// => "Failed to load channel info: not_found" (英語)
// => "チャンネル情報の読み込みに失敗しました: not_found" (日本語)

// 複数のプレースホルダー
const summary = t("messages.channel_summary", { name: "general", count: "42" });
// => "Channel: general, Members: 42" (英語)
// => "チャンネル: general, メンバー数: 42" (日本語)
```

### 言語の切り替え

環境変数で言語を指定できます：

```bash
# 英語で実行
export LOCALE=en
deno run your_script.ts

# 日本語で実行
export LOCALE=ja
deno run your_script.ts
```

環境変数が設定されていない場合、デフォルトは英語 (en) です。

### 言語の自動検出

`LOCALE` または `LANG` 環境変数から自動的に言語を検出します：

```bash
# ja_JP.UTF-8 から "ja" を検出
export LANG=ja_JP.UTF-8

# en_US.UTF-8 から "en" を検出
export LANG=en_US.UTF-8
```

## 新しいメッセージの追加

### 1. 英語メッセージを追加

`locales/en.json` に新しいメッセージを追加します：

```json
{
  "errors": {
    "channel_not_found": "Failed to load channel info: {error}",
    "user_not_found": "User not found: {userId}" // 新規追加
  }
}
```

### 2. コードで使用

```typescript
import { t } from "../../lib/i18n/mod.ts";

throw new Error(t("errors.user_not_found", { userId: "U12345" }));
```

### 3. 自動翻訳を実行

`locales/en.json` をコミットしてプッシュすると、GitHub
Actionsが自動的に日本語翻訳を生成してPRを作成します。

または、手動で実行：

```bash
deno run --allow-env --allow-read --allow-write --allow-net scripts/translate.ts
```

### プレースホルダーの使用

プレースホルダーは `{変数名}` の形式で記述します：

```json
{
  "messages": {
    "greeting": "Hello, {name}!",
    "user_info": "User {userId} has {count} messages"
  }
}
```

**注意事項：**

- プレースホルダー名は英数字のみ（アンダースコアも使用可）
- 翻訳時にプレースホルダーは保持されます
- コードで渡すパラメータ名と一致させる必要があります

## 自動翻訳ワークフロー

### トリガー条件

GitHub Actionsの自動翻訳は以下の場合に実行されます：

1. **`locales/en.json` が更新されたとき**（mainブランチへのpush）
2. **手動実行**（workflow_dispatch）

### ワークフローの動作

1. `locales/en.json` を読み込み
2. Anthropic Claude API (Claude Haiku 4.5) で日本語に翻訳
3. `locales/ja.json` を更新
4. 変更があればPRを自動作成

### 手動実行

GitHub Actionsのページから手動実行できます：

1. GitHubリポジトリの「Actions」タブを開く
2. 「I18n Auto Translation」ワークフローを選択
3. 「Run workflow」をクリック

### PRのレビュー

自動作成されたPRには以下が含まれます：

- 翻訳された `locales/ja.json` の変更
- 自動生成された説明文
- レビューチェックリスト

**レビュー時の確認事項：**

- [ ] 翻訳の正確性
- [ ] 自然な日本語表現
- [ ] 技術用語の適切な翻訳
- [ ] プレースホルダーが正しく保持されているか

## 整合性チェック

### 自動チェック

PR作成時に自動的に以下がチェックされます：

- 全言語ファイルのキー一致
- 翻訳漏れの検出
- プレースホルダーの一致確認

### 手動チェック

ローカルで整合性チェックを実行：

```bash
deno run --allow-read lib/i18n/check.ts
```

**チェック内容：**

✅ **必須チェック（エラー）:**

- キーの不一致（英語にあるキーが他言語にない）
- プレースホルダーの不一致
- 型の不一致

⚠️ **警告:**

- 余分なキー（他言語にあるが英語にない）
- 余分なプレースホルダー

### チェック結果の例

```
🔍 Checking i18n integrity...

📊 Statistics:
   Total keys: 10
   en: 10 keys
   ja: 10 keys

✅ All checks passed!
```

エラーがある場合：

```
❌ Errors:
   - Missing translation in ja.json: "errors.user_not_found"
   - Missing placeholder {userId} in ja.json for key "errors.user_not_found"

❌ I18n integrity check failed!
   Found 2 error(s) and 0 warning(s)
```

## テスト

### i18nのテスト実行

```bash
# i18nテストのみ実行
deno test --allow-env --allow-read --allow-net lib/i18n/test.ts

# 全テスト実行
deno test --allow-all
```

### テストの内容

- ロケールの検出
- 翻訳ファイルの読み込み
- 翻訳関数の動作
- プレースホルダーの置換
- 整合性チェック

### 新しいメッセージのテスト

新しいメッセージを追加した場合、以下をテストしてください：

```typescript
Deno.test("新しいエラーメッセージが翻訳される", async () => {
  await initI18n();

  setLocale("en");
  const enMessage = t("errors.user_not_found", { userId: "U12345" });
  assertEquals(enMessage, "User not found: U12345");

  setLocale("ja");
  const jaMessage = t("errors.user_not_found", { userId: "U12345" });
  assertExists(jaMessage);
  // 日本語メッセージの内容確認
});
```

## トラブルシューティング

### 翻訳が見つからない

**症状:** `Translation key not found: xxx.yyy`

**原因と対処:**

1. キーが `locales/en.json` に存在しない
   - → 英語ファイルにキーを追加
2. ロケールファイルが読み込まれていない
   - → `initI18n()` が実行されているか確認

### プレースホルダーが置換されない

**症状:** メッセージに `{name}` がそのまま表示される

**原因と対処:**

1. パラメータを渡していない

   ```typescript
   // ❌ 悪い例
   t("messages.greeting");

   // ✅ 良い例
   t("messages.greeting", { name: "Alice" });
   ```

2. パラメータ名が一致しない

   ```typescript
   // en.json: "Hello, {name}!"

   // ❌ 悪い例
   t("messages.greeting", { username: "Alice" });

   // ✅ 良い例
   t("messages.greeting", { name: "Alice" });
   ```

### 自動翻訳が動作しない

**原因と対処:**

1. **OPENAI_API_KEYが設定されていない**
   - GitHubリポジトリの Settings → Secrets → Actions で確認
   - シークレット名: `OPENAI_API_KEY`

2. **トリガー条件を満たしていない**
   - `locales/en.json` を変更してmainブランチにpush
   - または手動実行

3. **API制限**
   - OpenAI APIのレート制限に達した可能性
   - 少し待ってから再実行

### 整合性チェックに失敗する

**原因と対処:**

1. **翻訳漏れ**

   ```bash
   # エラー: Missing translation in ja.json: "errors.new_error"
   ```

   - 自動翻訳を実行するか、手動で `ja.json` に追加

2. **プレースホルダー不一致**

   ```bash
   # エラー: Missing placeholder {userId} in ja.json
   ```

   - `ja.json` の該当メッセージにプレースホルダーを追加

3. **余分なキー**

   ```bash
   # 警告: Extra key in ja.json: "errors.old_error"
   ```

   - 不要なキーを削除するか、英語ファイルにも追加

### テストが失敗する

```bash
# デバッグモードでテスト実行
deno test --allow-all --trace-ops lib/i18n/test.ts

# 特定のテストのみ実行
deno test --allow-all --filter="翻訳を取得" lib/i18n/test.ts
```

## ベストプラクティス

### 1. メッセージキーの命名規則

```json
{
  "errors": {
    "api_error": "...", // エラーメッセージ
    "validation_failed": "..."
  },
  "messages": {
    "success": "...", // ユーザー向けメッセージ
    "processing": "..."
  },
  "logs": {
    "starting": "...", // ログメッセージ
    "completed": "..."
  }
}
```

### 2. プレースホルダーの使用

```typescript
// ✅ 良い例: 動的な値はプレースホルダーで
t("messages.user_count", { count: users.length })

  // ❌ 悪い例: 文字列結合
  `Users: ${users.length}`;
```

### 3. 文脈を考慮した翻訳

英語でシンプルすぎるメッセージは避け、文脈を含めます：

```json
// ❌ 悪い例
{
  "error": "Error"
}

// ✅ 良い例
{
  "api_connection_error": "Failed to connect to API server"
}
```

### 4. コミット前のチェック

```bash
# 1. 整合性チェック
deno run --allow-read lib/i18n/check.ts

# 2. テスト実行
deno test --allow-all lib/i18n/test.ts

# 3. フォーマット
deno fmt locales/
```

## 参考リソース

- [Denoドキュメント](https://deno.land/manual)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [GitHub Actions](https://docs.github.com/actions)
- [プロジェクトのテストガイド](./testing-guide.md)

## 質問・改善提案

I18nに関する質問や改善提案は、GitHubのIssueで受け付けています。
