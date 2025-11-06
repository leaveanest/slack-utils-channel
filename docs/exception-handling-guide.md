# 例外処理ガイド

このドキュメントは、slack-utilsプロジェクトにおける例外処理のベストプラクティスとルールを定義します。

## 📋 目次

- [概要](#概要)
- [基本方針](#基本方針)
- [API通信の例外処理](#api通信の例外処理)
- [バリデーションの例外処理](#バリデーションの例外処理)
- [Slack関数のエラーハンドリング](#slack関数のエラーハンドリング)
- [禁止事項](#禁止事項)
- [エラーメッセージのi18n化](#エラーメッセージのi18n化)
- [テストでの例外処理](#テストでの例外処理)
- [トラブルシューティング](#トラブルシューティング)

## 概要

適切な例外処理は、以下を実現します：

- **信頼性**: エラーが発生してもシステムが安定動作
- **デバッグ容易性**: 詳細なエラー情報で問題特定が簡単
- **ユーザー体験**: わかりやすいエラーメッセージ
- **保守性**: 一貫したエラーハンドリングパターン

## 基本方針

### 1. 全てのエラーは`Error`オブジェクトで投げる

**✅ 正しい例：**

```typescript
throw new Error(t("errors.invalid_input"));
```

**❌ 悪い例：**

```typescript
throw "Invalid input"; // 文字列を直接throw（禁止）
```

### 2. エラーメッセージは必ずi18n化

**✅ 正しい例：**

```typescript
import { t } from "../../lib/i18n/mod.ts";

throw new Error(t("errors.channel_not_found", { error: "not_found" }));
```

**❌ 悪い例：**

```typescript
throw new Error("Channel not found"); // ハードコード（禁止）
```

### 3. エラーを無視しない

**✅ 正しい例：**

```typescript
try {
  await client.conversations.info({ channel: channelId });
} catch (error) {
  console.error("Failed to fetch channel:", error);
  throw new Error(t("errors.api_call_failed", { error: String(error) }));
}
```

**❌ 悪い例：**

```typescript
try {
  await client.conversations.info({ channel: channelId });
} catch (error) {
  // 何もしない - エラーが隠蔽される（危険！）
}
```

## API通信の例外処理

Slack
API呼び出しでは、必ず`response.ok`をチェックしてからデータにアクセスします。

### 基本パターン

```typescript
import { t } from "../../lib/i18n/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";

/**
 * Slackチャンネルの情報を取得します
 *
 * @param client - Slack APIクライアント
 * @param channelId - チャンネルID
 * @returns チャンネル情報
 * @throws {Error} API呼び出しが失敗した場合
 */
async function fetchChannelInfo(
  client: SlackAPIClient,
  channelId: string,
) {
  // API呼び出し
  const response = await client.conversations.info({
    channel: channelId,
  });

  // ✅ 必須: response.okをチェック
  if (!response.ok) {
    // エラーコードを取得（undefinedの場合はフォールバック）
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

### なぜ`response.ok`のチェックが必要？

Slack
APIは、エラー時に`response.ok = false`を返しますが、TypeScriptの型定義では`response.channel`が常に存在するように見えます。しかし、実際にはエラー時は`undefined`になるため、チェックなしでアクセスすると実行時エラーが発生します。

```typescript
// ❌ 悪い例：response.okをチェックしない
const response = await client.conversations.info({ channel: channelId });
// response.okがfalseの場合、response.channelはundefined
const name = response.channel.name; // TypeError: Cannot read property 'name' of undefined
```

### 複数のAPI呼び出しの場合

```typescript
async function fetchMultipleChannels(
  client: SlackAPIClient,
  channelIds: string[],
) {
  const results = [];

  for (const channelId of channelIds) {
    try {
      const channel = await fetchChannelInfo(client, channelId);
      results.push(channel);
    } catch (error) {
      // 個別のエラーをログに記録
      console.error(`Failed to fetch channel ${channelId}:`, error);
      // エラーを再スローするか、スキップするかは要件次第
      // この例ではスキップして続行
    }
  }

  return results;
}
```

## バリデーションの例外処理

入力値は必ず型チェックとフォーマット検証を行います。

### 型チェック（型ガード）

```typescript
/**
 * 入力値が文字列であることを検証します
 *
 * @param input - 検証対象の値
 * @returns 検証済みの文字列
 * @throws {Error} 型が不正な場合
 */
function validateString(input: unknown): string {
  // ✅ 必須: 型ガードを使用
  if (typeof input !== "string") {
    throw new Error(
      t("errors.invalid_type", {
        expected: "string",
        actual: typeof input,
      }),
    );
  }

  return input;
}
```

### 空文字チェック

```typescript
/**
 * 入力値が空でないことを検証します
 *
 * @param input - 検証対象の文字列
 * @returns 検証済みの文字列
 * @throws {Error} 空文字の場合
 */
function validateNotEmpty(input: string): string {
  // ✅ 必須: 空文字チェック（trim()で前後の空白を除去）
  if (input.trim().length === 0) {
    throw new Error(t("errors.empty_value"));
  }

  return input;
}
```

### フォーマット検証

```typescript
/**
 * チャンネルIDの形式を検証します
 *
 * @param channelId - 検証対象のチャンネルID
 * @returns 検証済みのチャンネルID
 * @throws {Error} 形式が不正な場合
 */
function validateChannelId(channelId: string): string {
  // Slackのチャンネル ID は通常 "C" で始まる英数字
  if (!/^C[A-Z0-9]+$/.test(channelId)) {
    throw new Error(
      t("errors.invalid_format", {
        field: "channel_id",
        pattern: "C followed by uppercase alphanumeric",
      }),
    );
  }

  return channelId;
}
```

### 組み合わせたバリデーション

```typescript
/**
 * チャンネルIDを包括的に検証します
 *
 * @param input - 検証対象の値
 * @returns 検証済みのチャンネルID
 * @throws {Error} バリデーションエラー
 */
function validateChannelIdInput(input: unknown): string {
  // 1. 型チェック
  const str = validateString(input);

  // 2. 空文字チェック
  const nonEmpty = validateNotEmpty(str);

  // 3. フォーマット検証
  const validChannelId = validateChannelId(nonEmpty);

  return validChannelId;
}
```

## Slack関数のエラーハンドリング

Slack関数全体をtry-catchでラップし、エラーを適切に処理します。

### 基本パターン

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { t } from "../../lib/i18n/mod.ts";

// 関数定義
export const MyFunctionDefinition = DefineFunction({
  callback_id: "my_function",
  title: "My Function",
  source_file: "functions/my_function/mod.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Target channel",
      },
    },
    required: ["channel_id"],
  },
  output_parameters: {
    properties: {
      result: {
        type: Schema.types.string,
        description: "Result message",
      },
    },
    required: ["result"],
  },
});

// 関数実装
export default SlackFunction(
  MyFunctionDefinition,
  async ({ inputs, client }) => {
    try {
      // ✅ 必須: 入力値のバリデーション
      const channelId = validateChannelIdInput(inputs.channel_id);

      // ✅ 必須: API呼び出し
      const channel = await fetchChannelInfo(client, channelId);

      // ✅ 必須: 成功時はoutputsを返す
      return {
        outputs: {
          result: `Channel: ${channel.name}`,
        },
      };
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

### エラー処理のポイント

1. **try-catchで全体をラップ**: 予期しないエラーも捕捉
2. **型安全なエラー取得**: `error instanceof Error`でチェック
3. **ログ出力**: デバッグ用に詳細を記録
4. **エラーオブジェクトで返す**: `{ error: message }`形式

## 禁止事項

以下のパターンは**絶対に避けてください**：

### ❌ 1. 文字列を直接throw

```typescript
// ❌ 悪い例
throw "Something went wrong";

// ✅ 正しい例
throw new Error(t("errors.unknown_error"));
```

### ❌ 2. response.okをチェックせずにデータアクセス

```typescript
// ❌ 悪い例
const response = await client.conversations.info({ channel: channelId });
const name = response.channel.name; // undefinedエラーの可能性

// ✅ 正しい例
const response = await client.conversations.info({ channel: channelId });
if (!response.ok || !response.channel) {
  throw new Error(t("errors.api_call_failed", { error: response.error }));
}
const name = response.channel.name;
```

### ❌ 3. エラーメッセージをハードコード

```typescript
// ❌ 悪い例
throw new Error("Channel not found");

// ✅ 正しい例
throw new Error(t("errors.channel_not_found", { error: "not_found" }));
```

### ❌ 4. エラーを無視

```typescript
// ❌ 悪い例
try {
  await client.api.call();
} catch (error) {
  // 何もしない - これは危険！
}

// ✅ 正しい例
try {
  await client.api.call();
} catch (error) {
  console.error("API call failed:", error);
  throw new Error(t("errors.api_call_failed", { error: String(error) }));
}
```

### ❌ 5. 汎用的すぎるエラー

```typescript
// ❌ 悪い例
throw new Error("Error");

// ✅ 正しい例
throw new Error(
  t("errors.api_call_failed", { error: "specific_error_code" }),
);
```

## エラーメッセージのi18n化

全てのエラーメッセージは`locales/en.json`に定義し、`t()`関数で取得します。

### 共通エラーメッセージ

以下のエラーメッセージは既に定義されています：

```json
{
  "errors": {
    "api_call_failed": "API call failed: {error}",
    "data_not_found": "Required data not found",
    "invalid_type": "Invalid type: expected {expected}, got {actual}",
    "empty_value": "Value cannot be empty",
    "invalid_format": "Invalid format for {field}: expected {pattern}",
    "channel_not_found": "Failed to load channel info: {error}",
    "unknown_error": "An unexpected error occurred"
  }
}
```

### 新しいエラーメッセージの追加

1. `locales/en.json`にキーと英語メッセージを追加：

```json
{
  "errors": {
    "user_not_found": "User not found: {userId}"
  }
}
```

2. コードで使用：

```typescript
throw new Error(t("errors.user_not_found", { userId: "U12345" }));
```

3. 自動翻訳：GitHub Actionsが自動的に`locales/ja.json`を更新

詳細は [`i18n-guide.md`](i18n-guide.md) を参照してください。

## テストでの例外処理

例外処理のテストは必須です。

### 異常系のテスト

```typescript
import { assertRejects } from "std/testing/asserts.ts";

Deno.test("API エラー時には例外を投げる", async () => {
  // エラーを返すモックclientを作成
  const mockClient = {
    conversations: {
      info: async () => ({
        ok: false,
        error: "channel_not_found",
      }),
    },
  } as unknown as SlackAPIClient;

  // エラーが投げられることを確認
  await assertRejects(
    () => fetchChannelInfo(mockClient, "C12345"),
    Error,
    "channel_not_found", // エラーメッセージに含まれるべき文字列
  );
});
```

### バリデーションのテスト

```typescript
Deno.test("空文字はエラーを投げる", () => {
  assertThrows(
    () => validateNotEmpty("   "),
    Error,
    "empty_value",
  );
});

Deno.test("無効な形式はエラーを投げる", () => {
  assertThrows(
    () => validateChannelId("invalid"),
    Error,
    "invalid_format",
  );
});
```

詳細は [`testing-guide.md`](testing-guide.md) を参照してください。

## トラブルシューティング

### Q: `response.channel`が`undefined`になる

**A**: `response.ok`をチェックしていない可能性があります。

```typescript
// ✅ 修正
if (!response.ok) {
  throw new Error(t("errors.api_call_failed", { error: response.error }));
}
```

### Q: エラーメッセージが翻訳されない

**A**: `t()`関数を使用しているか確認してください。

```typescript
// ❌ 悪い例
throw new Error("Channel not found");

// ✅ 正しい例
throw new Error(t("errors.channel_not_found", { error }));
```

### Q: テストでエラーが捕捉できない

**A**: `assertRejects`を使用してください。

```typescript
// ✅ 正しい例
await assertRejects(
  () => myFunction(),
  Error,
  "expected error message",
);
```

### Q: プレースホルダーが置き換わらない

**A**: オブジェクトで渡していることを確認してください。

```typescript
// ❌ 悪い例
t("errors.user_not_found", userId);

// ✅ 正しい例
t("errors.user_not_found", { userId });
```

## まとめ

- **全てのエラーは`Error`オブジェクトで投げる**
- **エラーメッセージは必ずi18n化する**
- **API呼び出しは必ず`response.ok`をチェック**
- **入力値は必ずバリデーション**
- **Slack関数は必ずtry-catchでラップ**
- **エラーを無視しない**
- **異常系のテストを書く**

これらのルールに従うことで、信頼性が高く保守しやすいコードを書くことができます。

## 参考資料

- [テストガイド](testing-guide.md)
- [多言語化ガイド](i18n-guide.md)
- [CLAUDE.md](../CLAUDE.md) - AI開発者向けルール
- [Slack API Documentation](https://api.slack.com/)
- [Deno Error Handling](https://docs.deno.com/)
