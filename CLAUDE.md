# Claude Rules for slack-utils

このドキュメントはClaude/Cursor
AIがslack-utilsプロジェクトで作業する際のルールとガイドラインを定義します。

## 📋 プロジェクト概要

**slack-utils** は Slack Deno SDK v2.x
を使用したSlackアプリケーション開発テンプレートです。

- **言語**: TypeScript (Deno v2互換)
- **主な用途**: Slack Functions、Workflows、Triggersの管理
- **デプロイ**: Slack CLI を使用
- **ライセンス**: MIT

### プロジェクト構成

```
slack-utils/
├── functions/         # Slack Functions（各関数にtest.tsを配置）
├── workflows/         # Slack Workflows
├── triggers/          # Slack Triggers
├── lib/              # 共通ライブラリ（i18nなど）
├── locales/          # 多言語対応（en.json, ja.json）
├── scripts/          # ビルド・デプロイスクリプト
├── docs/             # ドキュメント
├── .github/          # CI/CD設定
├── deno.jsonc        # Deno設定
├── import_map.json   # インポートマップ
└── manifest.ts       # Slackアプリマニフェスト
```

## 🔍 コードベース検索・調査のルール

### 必須ツールの使用

このプロジェクトでは以下のツールを**必ず使用**してください：

#### 1. **Serena** - リポジトリ内コード検索

プロジェクト内のコード検索には`serena`を使用：

```typescript
// ✅ 正しい使用例
mcp_serena_find_symbol({
  name_path: "functionName",
  relative_path: "functions/",
});

mcp_serena_search_for_pattern({
  substring_pattern: "エラーパターン",
  relative_path: "lib/",
});
```

**使用するシーン：**

- 関数やクラスの定義を探す
- 特定のパターンやキーワードを検索
- プロジェクト構造の理解
- シンボルの参照箇所を調べる

#### 2. **Context7** - モジュール・ライブラリ調査

外部モジュールやライブラリの調査には`context7`を使用：

```typescript
// ✅ 正しい使用例
// まずライブラリIDを解決
mcp_Context7_resolve - library - id({
  libraryName: "deno slack sdk",
});

// 次にドキュメントを取得
mcp_Context7_get - library - docs({
  context7CompatibleLibraryID: "/slackapi/deno-slack-sdk",
  topic: "functions",
});
```

**主要ライブラリ：**

- `/slackapi/deno-slack-sdk` - Slack Deno SDK
- `/denoland/deno` - Deno runtime
- `/websites/deno` - Deno公式ドキュメント

## 💻 技術スタック

### Deno (v2.x)

- 公式ドキュメント: `/websites/deno`
- セキュアなランタイム
- TypeScript標準サポート
- 組み込みテストランナー

### Slack Deno SDK (v2.15.1+)

- ライブラリID: `/slackapi/deno-slack-sdk`
- Slack Functions、Workflows、Triggersをサポート
- 最新のSlack Platform featuresに対応

## 📝 コーディング規約

### TypeScript

- **Strictモード必須**: `deno.jsonc`で`strict: true`を設定
- **暗黙的なanyを禁止**: 全ての型を明示的に定義
- **JSDocコメント必須**: 全ての公開関数に追加

```typescript
/**
 * Slackチャンネルの情報を取得します
 *
 * @param client - Slack APIクライアント
 * @param channelId - 取得対象のチャンネルID
 * @returns チャンネルの概要情報
 * @throws {Error} チャンネル情報の取得に失敗した場合
 */
export async function retrieveChannelSummary(
  client: SlackAPIClient,
  channelId: string,
): Promise<ChannelSummary> {
  // 実装
}
```

### インポート

- **`import_map.json`を使用**: 相対パスを避ける
- **標準ライブラリ**: `std/` プレフィックスを使用

```typescript
// ✅ 良い例
import { assertEquals } from "std/testing/asserts.ts";
import { DefineFunction } from "deno-slack-sdk/mod.ts";

// ❌ 悪い例
import { assertEquals } from "https://deno.land/std@0.200.0/testing/asserts.ts";
```

### ファイル構造

```
functions/example_function/
├── mod.ts          # 関数実装（JSDoc付き）
└── test.ts         # テスト（正常系・異常系）
```

## 🧪 テストとJSDocの必須ルール

### 新規関数作成時の必須事項

**重要**: 新しい関数やモジュールを作成する際は、以下を**必ず実施**してください。

#### 1. JSDocコメントの追加

````typescript
/**
 * 関数の説明（日本語で明確に）
 *
 * @param paramName - パラメータの説明
 * @returns 戻り値の説明
 * @throws {Error} エラーが発生する条件
 *
 * @example
 * ```typescript
 * const result = await functionName(client, "value");
 * console.log(result);
 * ```
 */
export async function functionName(...): Promise<ReturnType> {
  // 実装
}
````

#### 2. テストファイルの作成

- **配置**: 関数と同じディレクトリに`test.ts`
- **命名**: 日本語で明確に（例: "正常にデータを取得できる"）
- **カバレッジ**: 正常系と異常系の両方をテスト

```typescript
import { assertEquals, assertRejects } from "std/testing/asserts.ts";

Deno.test("正常にチャンネル情報を取得できる", async () => {
  // Arrange: 準備
  const mockClient = createMockClient();

  // Act: 実行
  const result = await retrieveChannelSummary(mockClient, "C12345");

  // Assert: 検証
  assertEquals(result.id, "C12345");
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

#### 3. モックの使用

- **Slack API**: 必ずモックを使用
- **外部依存**: テスト時は全て mock化

参考: `functions/example_function/test.ts`

## 🌍 I18n（多言語対応）ルール

**重要**:
エラーメッセージやユーザー向けメッセージは**必ず**多言語化してください。

### 必須事項

#### 1. 直接文字列を使わず `t()` 関数を使用

```typescript
// ❌ 悪い例
throw new Error("Failed to load channel info");

// ✅ 良い例
import { t } from "../../lib/i18n/mod.ts";
throw new Error(t("errors.channel_not_found", { error }));
```

#### 2. 英語をベース言語として `locales/en.json` に追加

```json
{
  "errors": {
    "user_not_found": "User not found: {userId}"
  },
  "messages": {
    "success": "Operation completed successfully"
  },
  "logs": {
    "starting": "Starting workflow..."
  }
}
```

#### 3. プレースホルダーの使用

```typescript
// ✅ 良い例
t("messages.channel_summary", {
  name: channel.name,
  count: memberCount,
})

  // ❌ 悪い例
  `Channel: ${channel.name}, Members: ${memberCount}`;
```

### 対象範囲

**i18n化が必要：**

- ✅ エラーメッセージ（`throw new Error()`）
- ✅ ログメッセージ（`console.log()`, `console.error()`）
- ✅ ユーザー向けメッセージ（Slack応答など）
- ✅ 関数の戻り値に含まれるメッセージ

**i18n化不要：**

- ❌ コメント（日本語可）
- ❌ 変数名、関数名
- ❌ デバッグ用の一時的な出力

### 自動翻訳

- `locales/en.json`を更新してpushすると**自動的に日本語翻訳が生成**されます
- GitHub Actionsが`locales/ja.json`を更新してPRを作成
- Anthropic Claude Haiku 4.5を使用

詳細: `docs/i18n-guide.md`

## 🔄 開発ワークフロー

### コミット前の必須チェック

```bash
# 1. フォーマットチェック
deno fmt --check

# 2. リントチェック
deno lint

# 3. 全テスト実行
deno test --allow-all

# 4. I18n整合性チェック
deno task i18n:check
```

### Git Hooks

プロジェクトではGit Hooksが設定されています：

- **pre-commit**: フォーマット・Lint
- **pre-push**: フォーマット・Lint・テスト

セットアップ:

```bash
bash scripts/setup-git-hooks.sh
```

### コミットメッセージ

Conventional Commits形式を使用：

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
test: テスト追加・修正
chore: ビルド・設定変更
refactor: リファクタリング
```

## 📦 便利なタスク

```bash
# フォーマット
deno task fmt

# リント
deno task lint

# テスト
deno task test

# I18n関連
deno task i18n:translate  # 自動翻訳実行
deno task i18n:check      # 整合性チェック
deno task i18n:test       # I18nテスト

# 型チェック
deno task check

# 全チェック（CI相当）
deno task cursor-ci
```

## 🚫 禁止事項

### 絶対にやってはいけないこと

1. **直接文字列のハードコード**（i18n化必須）
2. **テストなしの関数追加**
3. **JSDocコメントなしの公開関数**
4. **バリデーションなしの入力処理**（Zod使用必須）
5. **`package.json`の作成**（Denoプロジェクトです）
6. **暗黙的な`any`の使用**
7. **インラインHTTPS imports**（`import_map.json`を使用）

### CI/CDでの注意

- **OPENAI_API_KEY**: 既に設定済み（自動翻訳用）
- **Denoバージョン**: v2.x を使用
- **ロックファイル**: `deno.lock` v5形式

## 📚 参考ドキュメント

### プロジェクト内

- `README.md` - セットアップとデプロイ手順
- `CONTRIBUTING.md` - 貢献ガイドライン
- `docs/testing-guide.md` - テストガイド
- `docs/i18n-guide.md` - 多言語化ガイド
- `docs/github-actions.md` - CI/CDガイド

### 外部ドキュメント（Context7）

- `/slackapi/deno-slack-sdk` - Slack Deno SDK
- `/websites/deno` - Deno公式ドキュメント
- `/denoland/std` - Deno標準ライブラリ
- `/colinhacks/zod` - Zodバリデーションライブラリ

## 🎯 ベストプラクティス

### コード品質

1. **関数は小さく保つ**: 1関数1責任
2. **エラーハンドリング**: 全てのAPI呼び出しをtry-catch
3. **型安全**: `unknown`より`具体的な型`を使用
4. **テスト駆動**: 機能実装前にテストを書く

### パフォーマンス

1. **非同期処理**: `Promise.all()`で並列化
2. **メモリ管理**: 大きなデータは適切にストリーム処理
3. **キャッシュ**: I18nロケールデータはキャッシュ済み

### セキュリティ

1. **環境変数**: 機密情報は`.env`で管理
2. **入力検証**: 全てのユーザー入力を検証
3. **パーミッション**: 必要最小限の`--allow-*`フラグを使用

## 🔒 バリデーション（Zod）

このプロジェクトでは、型安全なバリデーションのために**Zod**を使用しています。

### Zodの使用ルール

#### 必須事項

1. **全ての入力値をZodで検証**
   - ユーザー入力
   - API入力
   - 環境変数
   - 外部データソース

2. **共通スキーマを優先使用**
   - `lib/validation/schemas.ts` の既存スキーマを使用
   - 新規スキーマは同ファイルに追加

3. **型推論を活用**
   - `z.infer<typeof schema>` で型を自動生成
   - 手動で型定義を重複させない

#### 基本パターン

```typescript
import { channelIdSchema } from "../../lib/validation/schemas.ts";

// パターン1: parse（エラー時は例外をthrow）
const channelId = channelIdSchema.parse(inputs.channel_id);

// パターン2: safeParse（エラー時は結果オブジェクト）
const result = channelIdSchema.safeParse(inputs.channel_id);
if (!result.success) {
  throw new Error(result.error.message);
}
```

### 利用可能なスキーマ

```typescript
// Slackチャンネル ID
channelIdSchema; // 例: "C12345678"

// Slackユーザー ID
userIdSchema; // 例: "U0812GLUZD2" または "W1234567890"

// 空でない文字列
nonEmptyStringSchema; // 最低1文字以上
```

### 新規スキーマの追加

```typescript
// lib/validation/schemas.ts に追加
/**
 * メールアドレス スキーマ
 */
export const emailSchema = z.string()
  .email("Invalid email format")
  .toLowerCase();

export type Email = z.infer<typeof emailSchema>;
```

### テストの追加

新規スキーマには必ずテストを追加：

```typescript
// lib/validation/test.ts に追加
Deno.test("emailSchema: 正常なメールアドレスを検証", () => {
  const result = emailSchema.safeParse("test@example.com");
  assertEquals(result.success, true);
});
```

### エラーメッセージの多言語化（i18n）

Zodのエラーメッセージは**動的に多言語化**されます。`.superRefine()`による実装により、バリデーション実行時に現在のロケールに応じたエラーメッセージが生成されます：

```typescript
import { channelIdSchema } from "../../lib/validation/schemas.ts";
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

- **動的評価**: `.superRefine()`により、`t()`関数が検証時に毎回呼ばれます
- **デフォルトスキーマ対応**: `channelIdSchema`等もロケール変更に自動対応
- **スキーマ再作成不要**: 同じインスタンスで異なるロケールに対応
- **レビューフィードバック対応**:
  エラーメッセージが検証時まで評価されないため、ロケール変更を正しく反映

**ファクトリー関数（オプション）：**

後方互換性のため、ファクトリー関数（`createChannelIdSchema()`等）も提供されていますが、
デフォルトスキーマも動的に対応するため、使用は任意です。

**新規スキーマのi18n化例：**

```typescript
// lib/validation/schemas.ts
import { z } from "zod";
import { t } from "../i18n/mod.ts";

/**
 * メールアドレス スキーマを生成（i18n対応）
 */
export function createEmailSchema() {
  return z.string().superRefine((val, ctx) => {
    // メールアドレス形式チェック
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_string,
        validation: "email",
        message: t("errors.validation.email_format"),
      });
    }
  }).transform((val) => val.toLowerCase());
}

// デフォルトエクスポート（動的i18n対応）
export const emailSchema = createEmailSchema();

// 型推論
export type Email = z.infer<ReturnType<typeof createEmailSchema>>;
```

そして、`locales/en.json`にエラーメッセージを追加：

```json
{
  "errors": {
    "validation": {
      "email_format": "Invalid email format"
    }
  }
}
```

**ポイント：**

- `.superRefine()`で検証ロジックを実装
- `t()`関数は検証時に呼ばれるため、ロケール変更に自動対応
- デフォルトエクスポートも動的に多言語化される

## 🚨 例外処理ルール

**重要**: API通信とバリデーションでは、必ず適切な例外処理を実装してください。

### API通信の例外処理

Slack
API呼び出しでは、必ず`response.ok`をチェックしてからデータにアクセスします。

**✅ 正しい例：**

```typescript
/**
 * Slack API呼び出しの例外処理
 */
async function callSlackAPI(client: SlackAPIClient, channelId: string) {
  const response = await client.conversations.info({ channel: channelId });

  // ✅ 必須: response.okをチェック
  if (!response.ok) {
    // ✅ 必須: エラーメッセージをi18n化
    const errorCode = response.error ?? "unknown_error";
    throw new Error(t("errors.api_call_failed", { error: errorCode }));
  }

  // ✅ 必須: データの存在チェック
  if (!response.channel) {
    throw new Error(t("errors.data_not_found"));
  }

  return response.channel;
}
```

**理由：**

- `response.ok`をチェックしないと、undefinedデータにアクセスしてしまう
- エラーメッセージは必ずi18n化（多言語対応）
- フォールバック値を提供（`??` 演算子使用）

### バリデーションの例外処理

入力値は必ず型チェックとフォーマット検証を行います。

**✅ 正しい例：**

```typescript
/**
 * 入力値のバリデーション
 */
function validateInput(input: unknown): string {
  // ✅ 必須: 型ガードを使用
  if (typeof input !== "string") {
    throw new Error(t("errors.invalid_type", {
      expected: "string",
      actual: typeof input,
    }));
  }

  // ✅ 必須: 空文字チェック
  if (input.trim().length === 0) {
    throw new Error(t("errors.empty_value"));
  }

  // ✅ 推奨: フォーマットチェック（必要に応じて）
  if (!/^[A-Z0-9]+$/.test(input)) {
    throw new Error(t("errors.invalid_format", {
      field: "channel_id",
      pattern: "uppercase alphanumeric",
    }));
  }

  return input;
}
```

### Slack関数のエラーハンドリング

Slack関数全体をtry-catchでラップし、エラーを適切に処理します。

**✅ 正しい例：**

```typescript
export default SlackFunction(
  MyFunctionDefinition,
  async ({ inputs, client }) => {
    try {
      // ✅ 必須: 入力値のバリデーション
      const validatedInput = validateInput(inputs.channel_id);

      // ✅ 必須: API呼び出し
      const result = await callSlackAPI(client, validatedInput);

      // ✅ 必須: 成功時はoutputsを返す
      return { outputs: { result } };
    } catch (error) {
      // ✅ 必須: エラーメッセージの型安全な取得
      const message = error instanceof Error ? error.message : String(error);

      // ✅ 必須: エラーをログ出力（デバッグ用）
      console.error("Function error:", message);

      // ✅ 必須: errorプロパティで返す
      return { error: message };
    }
  },
);
```

### 禁止事項

**❌ やってはいけないこと：**

```typescript
// ❌ 文字列を直接throw
throw "Something went wrong";

// ❌ response.okをチェックせずにデータアクセス
const channel = response.channel.name; // response.okがfalseの場合、undefinedエラー

// ❌ エラーメッセージをハードコード
throw new Error("Channel not found");

// ❌ エラーを無視
try {
  await client.api.call();
} catch (error) {
  // 何もしない - これは危険！
}

// ❌ 汎用的すぎるエラー
throw new Error("Error");
```

### エラーメッセージのi18n化

全てのエラーメッセージは`locales/en.json`に定義し、`t()`関数で取得します：

```json
{
  "errors": {
    "api_call_failed": "API call failed: {error}",
    "data_not_found": "Required data not found",
    "invalid_type": "Invalid type: expected {expected}, got {actual}",
    "empty_value": "Value cannot be empty",
    "invalid_format": "Invalid format for {field}: expected {pattern}"
  }
}
```

使用例：

```typescript
throw new Error(t("errors.api_call_failed", { error: errorCode }));
```

## 🤖 AI開発時の推奨フロー

### 1. 調査フェーズ

```typescript
// Serenaでコードベース内検索
mcp_serena_find_symbol({ name_path: "関数名" });
mcp_serena_search_for_pattern({ substring_pattern: "パターン" });

// Context7で外部ライブラリ調査
mcp_Context7_resolve - library - id({ libraryName: "deno" });
mcp_Context7_get - library - docs({
  context7CompatibleLibraryID: "/denoland/deno",
  topic: "testing",
});
```

### 2. 実装フェーズ

1. JSDocコメントを書く
2. 関数のインターフェースを定義
3. Zodスキーマを定義（バリデーション）
4. テストケースを書く
5. 実装する
6. I18n化する

### 3. 検証フェーズ

```bash
deno task cursor-ci  # 全チェック実行
```

## 🎊 完了時の音声フィードバック

タスク完了時は、ずんだもんによる音声フィードバックを実行：

```typescript
mcp_voicevox_speak({
  text: "完了内容を1-2文で説明する文章のだ！",
  speaker: 3, // ずんだもん:ノーマル
  immediate: true,
  waitForStart: true,
});
```

## 📝 最後に

- **常にドキュメントを参照**: 不明点は`docs/`を確認
- **Serenaで検索**: コードベース内の情報はSerenaで
- **Context7で調査**: 外部ライブラリはContext7で
- **テストは必須**: 全ての新機能にテストを追加
- **I18nを忘れずに**: ユーザー向けメッセージは必ず多言語化
- **Zodでバリデーション**: 全ての入力値を型安全に検証

**Happy Coding! 🚀**
