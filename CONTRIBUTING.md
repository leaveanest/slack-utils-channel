# Contributing to slack-utils-template

## 開発フロー

1. Issue を作成またはアサインされていることを確認します。
2. 作業用ブランチを切り、ローカルで開発します。
3. 作業中は小まめにテストや静的解析を実行します。
4. Pull Request を作成し、レビュアーへ共有します。

## コーディング規約

- Deno 標準スタイルガイドに従います。
- TypeScript は常に `strict` モードを前提とし、暗黙的な `any` を避けます。
- import は `import_map.json` を利用し、相対パスの氾濫を避けます。

### 重要なガイドライン

新しい機能を開発する際は、以下のガイドラインに従ってください：

- **テスト**: [`docs/testing-guide.md`](docs/testing-guide.md) -
  JSDocコメント必須、正常系・異常系テスト
- **多言語化**: [`docs/i18n-guide.md`](docs/i18n-guide.md) -
  エラーメッセージの`t()`関数化
- **例外処理**:
  [`docs/exception-handling-guide.md`](docs/exception-handling-guide.md)
  - API通信時の`response.ok`チェック
  - バリデーション必須
  - 型安全なエラーハンドリング

## Issue の書き方

- テンプレートに従い、背景・目的・受け入れ条件を明文化します。
- ラベル `ready-for-development` を使用して、実装可能な状態を明確にします。
- 再現手順や期待値、影響範囲をわかりやすく記述してください。

## Pull Request の作り方

- タイトルは簡潔に、Conventional Commits を意識した表現にします。
- テンプレートのチェックリストをすべて実行し、完了項目にチェックしてください。
- 関連する Issue があれば `Closes #<issue-number>` の形式でリンクします。

## 開発環境セットアップ

```bash
# Deno のインストール
curl -fsSL https://deno.land/install.sh | sh

# Slack CLI のインストール
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack login

# Git hooks のセットアップ（推奨）
bash scripts/setup-git-hooks.sh
```

- `.env` に Slack CLI 用のトークンなど機密情報を保存します。
- 必要に応じて `deno task dev` でローカル実行してください。
- Git
  hooksをセットアップすると、commit/push時に自動的に品質チェックが実行されます。

### slack.json について

`slack.json`はローカル開発用の最小構成になっています：

- **`environments.local`**: `.env`ファイルを自動読み込み（ローカル開発に便利）
- **`deployments`**: 削除済み（本番デプロイ時に各チームが追加）

本番デプロイが必要な場合は、`deployments`セクションを追加してください。
詳細は[README.md](README.md)の「slack.json 設定」セクションを参照してください。

**`.slack/`フォルダーについて:**

- Slack CLIが自動生成・管理（`.gitignore`で除外済み）
- 手動編集不要
- `slack run`や`slack auth`で自動更新

## 新規関数作成時のルール

**重要: 新しい関数やモジュールを作成する際は、必ず以下を実施してください。**

### 必須事項

#### 1. JSDocコメントの追加

全ての公開関数には、必ずJSDocコメントを追加してください：

````typescript
/**
 * Slackチャンネルの情報を取得します
 *
 * @param client - Slack APIクライアント
 * @param channelId - 取得対象のチャンネルID
 * @returns チャンネルの概要情報
 * @throws {Error} チャンネル情報の取得に失敗した場合
 *
 * @example
 * ```typescript
 * const summary = await retrieveChannelSummary(client, "C12345678");
 * console.log(`チャンネル名: ${summary.name}, メンバー数: ${summary.member_count}`);
 * ```
 */
export async function retrieveChannelSummary(
  client: SlackAPIClient,
  channelId: string,
): Promise<ChannelSummary> {
  // 実装
}
````

**含めるべき情報：**

- 関数の目的と動作の説明
- `@param` - 各パラメータの説明
- `@returns` - 戻り値の説明
- `@throws` - エラーが発生する条件
- `@example` - 使用例（任意、推奨）

#### 2. テストファイルの作成

関数と同じディレクトリに `test.ts`
を配置し、正常系と異常系の両方をテストします：

```typescript
import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import { retrieveChannelSummary } from "./mod.ts";

Deno.test("正常にチャンネル情報を取得できる", async () => {
  // Arrange: 準備
  const mockClient = createMockClient();

  // Act: 実行
  const result = await retrieveChannelSummary(mockClient, "C12345");

  // Assert: 検証
  assertEquals(result.id, "C12345");
  assertEquals(result.name, "general");
});

Deno.test("チャンネルIDが無効な場合はエラーを返す", async () => {
  const mockClient = createErrorClient();

  await assertRejects(
    () => retrieveChannelSummary(mockClient, "invalid"),
    Error,
    "Expected error message",
  );
});
```

**テストの要件：**

- テスト名は日本語で明確に（例: "正常にチャンネル情報を取得できる"）
- モックを使用して外部依存を排除
- Arrange-Act-Assert パターンを使用
- 正常系と異常系の両方をカバー

#### 3. テストカバレッジ

以下を必ずカバーしてください：

- ✅ 主要な処理パス
- ✅ エラーハンドリング
- ✅ エッジケース（空文字、null、undefined など）
- ✅ 最低限、正常系1つ・異常系1つを含める

### ファイル構成

```
functions/example_function/
├── mod.ts          # 関数実装（JSDoc付き）
└── test.ts         # テスト（正常系・異常系）
```

### 参考例

`functions/example_function/`
に実装例があります。新規関数を作成する際は、このディレクトリを参考にしてください。

### 詳細ドキュメント

- テスト詳細: [`docs/testing-guide.md`](docs/testing-guide.md)
- 多言語化: [`docs/i18n-guide.md`](docs/i18n-guide.md)
- 例外処理:
  [`docs/exception-handling-guide.md`](docs/exception-handling-guide.md)

## バリデーション（Zod）

このプロジェクトでは、型安全なバリデーションのために**Zod**を使用しています。

### Zodとは

- TypeScript-firstのスキーマ宣言・バリデーションライブラリ
- 静的型推論により、実行時エラーを削減
- シンプルで読みやすいAPI

### 基本的な使い方

#### 1. 共通スキーマの使用

`lib/validation/schemas.ts` に定義された共通スキーマを使用：

```typescript
import { channelIdSchema } from "../../lib/validation/schemas.ts";

// バリデーション
const channelId = channelIdSchema.parse(inputs.channel_id);
// または safeParse でエラーハンドリング
const result = channelIdSchema.safeParse(inputs.channel_id);
if (!result.success) {
  throw new Error(result.error.message);
}
```

#### 2. 利用可能なスキーマ

- **`channelIdSchema`**: Slackチャンネル ID（`C + 英数字大文字`）
- **`userIdSchema`**: Slackユーザー ID（`U/W + 英数字大文字`）
- **`nonEmptyStringSchema`**: 空でない文字列

#### 3. カスタムスキーマの作成

新しいバリデーションが必要な場合は、`lib/validation/schemas.ts` に追加：

```typescript
export const emailSchema = z.string()
  .email("Invalid email format")
  .toLowerCase();
```

### 型推論の活用

Zodスキーマから自動的に型を推論できます：

```typescript
import {
  type ChannelId,
  channelIdSchema,
} from "../../lib/validation/schemas.ts";

const channelId: ChannelId = channelIdSchema.parse("C12345678");
```

### エラーメッセージの多言語化（i18n）

Zodのエラーメッセージは**動的に多言語化**されます。`.superRefine()`による実装により、バリデーション実行時に現在のロケールに応じたエラーメッセージが表示されます：

```typescript
import { channelIdSchema, userIdSchema } from "../../lib/validation/schemas.ts";
import { setLocale } from "../../lib/i18n/mod.ts";

// 英語でバリデーション実行
setLocale("en");
const result1 = channelIdSchema.safeParse("invalid");
// エラー: "Channel ID must start with 'C' followed by uppercase alphanumeric characters"

// 同じスキーマインスタンスで日本語に切り替え
setLocale("ja");
const result2 = channelIdSchema.safeParse("invalid");
// エラー: "チャンネルIDは'C'で始まり、その後に大文字の英数字が続く必要があります"

// 英語に戻す
setLocale("en");
const result3 = channelIdSchema.safeParse("invalid");
// エラー: "Channel ID must start with 'C' followed by uppercase alphanumeric characters"
```

**実装の特徴：**

- **動的評価**:
  `.superRefine()`により、エラーメッセージは検証時に毎回評価されます
- **デフォルトスキーマ対応**: `channelIdSchema`等もロケール変更に自動対応
- **スキーマ再作成不要**: 同じインスタンスでロケールを切り替えられます
- **環境変数対応**: `LOCALE`または`LANG`でデフォルトロケールを設定可能

**ファクトリー関数（オプション）：**

後方互換性のため、ファクトリー関数（`createChannelIdSchema()`等）も提供されていますが、
デフォルトスキーマも動的に対応するため、使用は任意です。

### ベストプラクティス

1. **入力値は必ずバリデーション**: 特にユーザー入力やAPI入力
2. **共通スキーマを再利用**: 重複を避ける
3. **ファクトリー関数を使用**: 実行時にロケールを切り替える場合
4. **safeParse()を使用**: try-catchが不要でエラーハンドリングが簡潔
5. **エラーメッセージはi18n化**: ユーザー向けメッセージは必ず多言語対応

### 参考実装

`functions/example_function/mod.ts`
でZodを使用したバリデーション例を確認できます。

## テストと品質チェック

### 自動チェック（推奨）

Git hooksをセットアップすると、commit/push時に自動的にチェックが実行されます：

```bash
# 初回のみ実行
bash scripts/setup-git-hooks.sh
```

**実行されるチェック：**

- **pre-commit**: フォーマット + リント（コミット時）
- **pre-push**: フォーマット + リント + テスト（プッシュ時）

### 手動チェック

Git hooksを使わない場合は、**push する前に必ず以下を実行してください：**

```bash
# 1. フォーマットチェック
deno fmt --check

# 2. リントチェック
deno lint

# 3. 全テスト実行
deno test --allow-all
```

### 注意事項

- 全てのチェックがパスしてから `git commit` と `git push` を実行してください。
- CIでのフォーマットエラーやテスト失敗を防ぐため、ローカルで事前確認が必須です。
- 失敗した場合はログを確認し修正してから再実行してください。
- Slack API 依存部分はモックを活用し、安定したテストを維持します。
- 緊急時のみ `git push --no-verify` でフックをスキップ可能（非推奨）

## コミットメッセージ規約

- Conventional Commits を推奨しています。
  - 例: `feat: add {category} workflow`
- PR マージ前に `git rebase -i` などでコミット履歴を整理してください。
