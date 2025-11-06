# テストガイド

このドキュメントでは、slack-utilsプロジェクトにおけるテストの作成方法とベストプラクティスを説明します。

## 目次

- [テストの基本方針](#テストの基本方針)
- [テストの実行方法](#テストの実行方法)
- [テストの書き方](#テストの書き方)
- [モックの使用](#モックの使用)
- [カバレッジ](#カバレッジ)
- [CI/CDでのテスト](#cicdでのテスト)

## テストの基本方針

### 必須要件

新しい関数やモジュールを作成する際は、以下を必ず実施してください：

1. **関数にJSDocコメントを追加**
2. **テストファイルを作成**
3. **正常系と異常系の両方をテスト**

### テストの配置

```
functions/
  ├── example_function/
  │   ├── mod.ts          # 関数の実装
  │   └── test.ts         # テストファイル
  └── your_function/
      ├── mod.ts
      └── test.ts
```

## テストの実行方法

### 全テストの実行

```bash
# 全テストを実行
deno test --allow-all

# タスクを使用（推奨）
deno task test
```

### 特定のファイルのテスト

```bash
# 特定のファイルのみテスト
deno test --allow-all functions/example_function/test.ts
```

### カバレッジ付きで実行

```bash
# カバレッジを測定
deno test --allow-all --coverage=cov

# HTML形式で出力
deno coverage cov --html

# LCOV形式で出力
deno coverage cov --lcov --output=cov.lcov
```

### ウォッチモード

```bash
# ファイル変更を監視して自動再実行
deno test --allow-all --watch
```

## テストの書き方

### 基本構造

```typescript
import { assertEquals, assertRejects } from "std/testing/asserts.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { yourFunction } from "./mod.ts";

Deno.test("正常系のテスト説明", async () => {
  // Arrange: テスト準備
  const mockClient = createMockClient();

  // Act: 実行
  const result = await yourFunction(mockClient, "input");

  // Assert: 検証
  assertEquals(result, expectedValue);
});

Deno.test("異常系のテスト説明", async () => {
  const mockClient = createErrorClient();

  await assertRejects(
    () => yourFunction(mockClient, "input"),
    Error,
    "Expected error message",
  );
});
```

### テスト名の命名規則

- **日本語で明確に記述** することを推奨
- 何をテストしているのかが一目でわかるように

✅ 良い例：

```typescript
Deno.test("正常にチャンネル情報を取得できる", async () => { ... });
Deno.test("チャンネルIDが無効な場合はエラーを返す", async () => { ... });
Deno.test("アーカイブされたチャンネルも取得できる", async () => { ... });
```

❌ 悪い例：

```typescript
Deno.test("test1", async () => { ... });
Deno.test("it works", async () => { ... });
```

### JSDocコメントの書き方

関数には必ずJSDocコメントを追加してください：

````typescript
/**
 * Slackチャンネルの情報を取得します
 *
 * この関数は、指定されたチャンネルIDからチャンネルの詳細情報を取得し、
 * 簡潔なサマリー形式で返します。
 *
 * @param client - Slack APIクライアント
 * @param channelId - 取得対象のチャンネルID（例: "C12345678"）
 * @returns チャンネルの概要情報（ID、名前、アーカイブ状態、メンバー数）
 * @throws {Error} チャンネル情報の取得に失敗した場合、またはチャンネルが存在しない場合
 *
 * @example
 * ```typescript
 * const summary = await retrieveChannelSummary(client, "C12345678");
 * console.log(summary.name); // "general"
 * ```
 */
export async function retrieveChannelSummary(
  client: SlackAPIClient,
  channelId: string,
): Promise<ChannelSummary> {
  // 実装
}
````

## モックの使用

### Slack APIクライアントのモック

Slack APIとの通信をテストする際は、必ずモックを使用してください：

```typescript
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";

// 型定義を取得
type ConversationsInfo = SlackAPIClient["conversations"]["info"];
type ConversationsInfoArgs = Parameters<ConversationsInfo>[0];
type ConversationsInfoResult = Awaited<ReturnType<ConversationsInfo>>;

// 正常系のモック
const mockClient = {
  conversations: {
    info(_args: ConversationsInfoArgs): Promise<ConversationsInfoResult> {
      return Promise.resolve({
        ok: true,
        channel: {
          id: "C12345",
          name: "general",
          is_archived: false,
          num_members: 42,
        },
      } as unknown as ConversationsInfoResult);
    },
  },
} as unknown as SlackAPIClient;

// 異常系のモック
const errorClient = {
  conversations: {
    info(_args: ConversationsInfoArgs): Promise<ConversationsInfoResult> {
      return Promise.resolve({
        ok: false,
        error: "channel_not_found",
      } as unknown as ConversationsInfoResult);
    },
  },
} as unknown as SlackAPIClient;
```

### モック作成のポイント

1. **型安全性を保つ**: `as unknown as` で型アサーションを使用
2. **最小限の実装**: テストに必要なメソッドのみ実装
3. **エラーケースも用意**: 正常系と異常系のモックを両方作成

## カバレッジ

### カバレッジの目標

- **最低限**: 主要な処理パスをカバー
- **推奨**: 80%以上のコードカバレッジ
- **理想**: エッジケースを含めた90%以上

### カバレッジすべき項目

✅ 必須：

- 正常系のメインパス
- エラーハンドリング
- バリデーション

✅ 推奨：

- エッジケース（空文字、null、undefined）
- 境界値テスト
- 条件分岐の全パターン

❌ カバレッジ不要：

- 型定義のみのコード
- 単純な再エクスポート

### カバレッジの確認

```bash
# カバレッジを測定
deno test --allow-all --coverage=cov

# テキスト形式で確認
deno coverage cov

# HTML形式で詳細確認
deno coverage cov --html
# cov/html/index.html をブラウザで開く

# CI用にLCOV形式で出力
deno coverage cov --lcov --output=cov.lcov
```

## テストのベストプラクティス

### 1. 独立性を保つ

各テストは他のテストに依存せず、独立して実行できるようにします。

```typescript
// ❌ 悪い例: グローバル変数に依存
let sharedState: string;

Deno.test("test1", () => {
  sharedState = "value";
});

Deno.test("test2", () => {
  assertEquals(sharedState, "value"); // test1に依存
});

// ✅ 良い例: 各テストが独立
Deno.test("test1", () => {
  const state = "value";
  assertEquals(state, "value");
});

Deno.test("test2", () => {
  const state = "value";
  assertEquals(state, "value");
});
```

### 2. Arrange-Act-Assert パターン

テストは3つのフェーズに分けて記述します：

```typescript
Deno.test("チャンネル情報を取得する", async () => {
  // Arrange: 準備
  const mockClient = createMockClient();
  const channelId = "C12345";

  // Act: 実行
  const result = await retrieveChannelSummary(mockClient, channelId);

  // Assert: 検証
  assertEquals(result.id, channelId);
  assertEquals(result.name, "general");
});
```

### 3. 明確なエラーメッセージ

アサーションには意味のあるメッセージを追加します：

```typescript
// ✅ 良い例
assertEquals(
  result.member_count,
  42,
  "メンバー数が期待値と一致しません",
);

// ❌ 悪い例
assertEquals(result.member_count, 42);
```

### 4. テストの粒度

- 1つのテストで1つの事柄をテスト
- 複雑なテストは分割する

```typescript
// ❌ 悪い例: 複数の事柄を1つのテストで
Deno.test("チャンネル機能", async () => {
  // チャンネル取得
  const channel = await getChannel(client, "C123");
  assertEquals(channel.name, "general");

  // チャンネル更新
  await updateChannel(client, "C123", { name: "new-name" });

  // チャンネル削除
  await deleteChannel(client, "C123");
});

// ✅ 良い例: 1つのテストで1つの事柄
Deno.test("チャンネル情報を取得できる", async () => {
  const channel = await getChannel(client, "C123");
  assertEquals(channel.name, "general");
});

Deno.test("チャンネル名を更新できる", async () => {
  await updateChannel(client, "C123", { name: "new-name" });
  // 検証
});

Deno.test("チャンネルを削除できる", async () => {
  await deleteChannel(client, "C123");
  // 検証
});
```

## CI/CDでのテスト

### GitHub Actions

プロジェクトでは、以下のタイミングで自動的にテストが実行されます：

- Pull Request作成時
- mainブランチへのpush時
- 定期実行（スケジュール）

### Git Hooks

ローカルでのコミット・プッシュ前にもテストが実行されます：

```bash
# Git hooksのセットアップ
bash scripts/setup-git-hooks.sh
```

**pre-commit**: フォーマット・Lint **pre-push**: フォーマット・Lint・テスト

### 緊急時のスキップ（非推奨）

```bash
# pre-commitをスキップ
git commit --no-verify

# pre-pushをスキップ
git push --no-verify
```

⚠️ **注意**: スキップは緊急時のみ使用し、後で必ず修正してください。

## トラブルシューティング

### テストが失敗する

1. **エラーメッセージを確認**
   ```bash
   deno test --allow-all
   ```

2. **該当ファイルのみテスト**
   ```bash
   deno test --allow-all functions/your_function/test.ts
   ```

3. **型チェックを実行**
   ```bash
   deno task check
   ```

### パーミッションエラー

Denoは明示的にパーミッションを付与する必要があります：

```bash
# 全権限で実行（開発時）
deno test --allow-all

# 特定の権限のみ
deno test --allow-net --allow-env --allow-read
```

### モックが正しく動作しない

型定義を確認し、`as unknown as` で適切にキャストしているか確認してください：

```typescript
// 型定義を取得
type ConversationsInfo = SlackAPIClient["conversations"]["info"];
type ConversationsInfoResult = Awaited<ReturnType<ConversationsInfo>>;

// 正しくキャスト
const mockClient = {
  conversations: {
    info(_args): Promise<ConversationsInfoResult> {
      return Promise.resolve({
        ok: true,
        channel: {/* ... */},
      } as unknown as ConversationsInfoResult);
    },
  },
} as unknown as SlackAPIClient;
```

## 参考リソース

- [Deno Testing](https://deno.land/manual/testing)
- [Deno Standard Library - Testing](https://deno.land/std/testing)
- [プロジェクトの例](../functions/example_function/)

## 質問・改善提案

テストに関する質問や改善提案は、GitHubのIssueで受け付けています。
