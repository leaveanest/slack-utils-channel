# slack-utils-template

{description}

## 概要

- slack-utils シリーズの共通テンプレートです。
- {Category} をはじめとした {category} ワークフローを素早く構築できます。
- Slack Deno SDK v2.0.0
  を利用し、関数・ワークフロー・トリガーを一貫して管理します。

## 前提条件

- **Deno 1.37+** がインストールされていること
- **Slack CLI** が利用可能で、ワークスペースにログイン済みであること
- **Slack App** を作成できる権限を持っていること
- **Git** がインストールされていること（Git Hooks使用時）

詳細は [開発環境のセットアップ](#開発環境のセットアップ) を参照してください。

## セットアップ

```bash
# リポジトリを取得
git clone https://github.com/your-org/slack-utils-template.git
cd slack-utils-template

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集して、アプリ名やカテゴリをカスタマイズ

# 依存設定と初期化
slack login
slack env add local

# Git hooks をセットアップ（推奨）
# macOS/Linux: bash scripts/setup-git-hooks.sh
# Windows: Git Bash または WSL で実行
```

### 環境変数の設定

`.env` ファイルで以下の変数をカスタマイズできます：

```bash
# Slack App Configuration
SLACK_APP_NAME=Slack Utils Template        # アプリ名
SLACK_APP_DESCRIPTION=A template...         # アプリの説明
SLACK_CATEGORY=Channel                      # カテゴリ名（例: Team, Project など）
```

これらの変数は、ワークフロー、ファンクション、トリガーの名前や説明に自動的に反映されます。

### slack.json 設定

`slack.json` には以下の設定が含まれています：

#### 環境変数の管理

```json
"environments": {
  "local": {
    "env_file": ".env"
  }
}
```

- **`environments.local`**: `slack run`実行時に`.env`ファイルを自動読み込み
- 環境変数（API キーなど）を`.env`で管理できます

#### 本番デプロイ設定（オプション）

本番環境へデプロイする場合は、`deployments`セクションを追加してください：

```json
"deployments": {
  "production": {
    "workspace": "your-workspace-name",
    "token_alias": "production"
  }
}
```

その後、`slack deploy --env production`でデプロイできます。

#### 補足

- **`.slack/`フォルダー**: Slack CLI が自動生成・管理（手動編集不要）
- **`import_map.json`**: 依存関係の解決に使用
- **Git hooks**: セットアップすると commit/push 前に自動チェック実行

## 使い方

```bash
# フォーマット・Lint・テスト
deno task fmt
deno task lint
deno task check
deno task test

# カバレッジ付きテスト
deno test --allow-all --coverage=cov
deno coverage cov --html

# ローカル実行
slack run workflows/example_workflow
```

- `functions/example_function/mod.ts` が {category}
  チャンネル情報を取得するサンプルです。
- `workflows/example_workflow.ts` は上記関数を利用して {Category} を分析します。
- `triggers/example_trigger.ts` を Slack CLI
  で登録し、ショートカットからワークフローを呼び出せます。

## テスト

### テストの実行

```bash
# 全テストを実行
deno task test

# カバレッジを測定
deno test --allow-all --coverage=cov
deno coverage cov --html  # HTML形式で確認
```

### 新規関数作成時の要件

新しい関数を作成する際は、以下を必ず実施してください：

1. **JSDocコメント**: 関数の説明、パラメータ、戻り値、エラーを記載
2. **テストファイル**: 正常系と異常系のテストを作成
3. **テストカバレッジ**: 主要な処理パスをカバー

詳細は [`docs/testing-guide.md`](docs/testing-guide.md) を参照してください。

### テストの例

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

参考実装: [`functions/example_function/`](functions/example_function/)

## 多言語対応（I18n）

このプロジェクトは、英語と日本語の多言語対応をサポートしています。

### サポート言語

- **English (en)** - ベース言語
- **日本語 (ja)** - 自動翻訳

### 言語の切り替え

環境変数で言語を指定できます：

```bash
# 英語で実行（デフォルト）
export LOCALE=en
deno run your_script.ts

# 日本語で実行
export LOCALE=ja
deno run your_script.ts
```

### コード内での使用

```typescript
import { t } from "../../lib/i18n/mod.ts";

// シンプルなメッセージ
const message = t("errors.unknown_error");

// プレースホルダー付きメッセージ
const error = t("errors.channel_not_found", { error: "not_found" });
```

### 自動翻訳

`locales/en.json` が更新されると、GitHub
Actionsが自動的に日本語への翻訳を実行し、PRを作成します。

詳細は [`docs/i18n-guide.md`](docs/i18n-guide.md) を参照してください。

## 例外処理

このプロジェクトでは、統一的な例外処理パターンを採用しています。

### 基本ルール

1. **API通信**: 必ず`response.ok`をチェック
2. **バリデーション**: 入力値の型チェック・空文字チェック必須
3. **エラーメッセージ**: 必ず`t()`関数で多言語化
4. **Slack関数**: try-catchで全体をラップ

### コード例

```typescript
import { t } from "../../lib/i18n/mod.ts";

// API通信の例外処理
const response = await client.conversations.info({ channel: channelId });
if (!response.ok) {
  throw new Error(t("errors.api_call_failed", { error: response.error }));
}

// バリデーション
if (typeof input !== "string") {
  throw new Error(t("errors.invalid_type", {
    expected: "string",
    actual: typeof input,
  }));
}

// Slack関数
export default SlackFunction(MyFunction, async ({ inputs, client }) => {
  try {
    // 処理
    return { outputs: { result } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Function error:", message);
    return { error: message };
  }
});
```

詳細は [`docs/exception-handling-guide.md`](docs/exception-handling-guide.md)
を参照してください。

## バリデーション（Zod）

このプロジェクトでは、型安全なバリデーションのために**Zod**を使用しています。

### 利用可能なスキーマ

`lib/validation/schemas.ts` に以下の共通スキーマが定義されています：

- **`channelIdSchema`**: Slackチャンネル ID（`C12345678` 形式）
- **`userIdSchema`**: Slackユーザー ID（`U0812GLUZD2` または `W1234567890`
  形式）
- **`nonEmptyStringSchema`**: 空でない文字列

### 使用例

```typescript
import { channelIdSchema } from "../../lib/validation/schemas.ts";

// パース（エラー時は例外をthrow）
const channelId = channelIdSchema.parse(inputs.channel_id);

// 安全なパース（エラー時は結果オブジェクトを返す）
const result = channelIdSchema.safeParse(inputs.channel_id);
if (!result.success) {
  console.error(result.error);
}
```

### エラーメッセージの多言語化

Zodのバリデーションエラーメッセージは**動的に多言語化**されます。
`.superRefine()`を使用しているため、バリデーション実行時に現在のロケールに応じたエラーメッセージが表示されます：

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

**ポイント：**

- デフォルトスキーマ（`channelIdSchema`等）もロケール変更に**動的に対応**します
- スキーマを再作成する必要はありません
- 環境変数 `LOCALE` または `LANG` でデフォルトロケールを設定できます

詳細は [`CONTRIBUTING.md`](CONTRIBUTING.md)
の「バリデーション（Zod）」セクションを参照してください。

## 開発環境のセットアップ

### Deno のインストール

#### macOS / Linux

```bash
# インストールスクリプトを使用
curl -fsSL https://deno.land/install.sh | sh

# Homebrewを使用（macOS）
brew install deno
```

#### Windows

```powershell
# PowerShellでインストール
irm https://deno.land/install.ps1 | iex

# Chocolateyを使用
choco install deno

# Scoopを使用
scoop install deno
```

#### 動作確認

```bash
deno --version
```

### Slack CLI のインストール

#### macOS / Linux

```bash
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack login
```

#### Windows

**方法1: インストーラーを使用（推奨）**

1. [Slack CLI リリースページ](https://api.slack.com/automation/cli/install)
   から最新のインストーラーをダウンロード
2. ダウンロードした `.msi` ファイルを実行
3. PowerShellまたはコマンドプロンプトで `slack login` を実行

**方法2: WSL (Windows Subsystem for Linux) を使用**

```bash
# WSL内で実行
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack login
```

#### 動作確認

```bash
slack version
slack login
```

### Git のインストール

#### macOS

```bash
# Xcodeコマンドラインツールと一緒にインストール
xcode-select --install

# Homebrewを使用
brew install git
```

#### Linux

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git

# CentOS/RHEL
sudo yum install git

# Fedora
sudo dnf install git
```

#### Windows

1. [Git for Windows](https://git-scm.com/download/win)
   から公式インストーラーをダウンロード
2. インストール時に「Git Bash」を含めることを推奨（スクリプト実行に必要）
3. インストール完了後、Git Bashまたは PowerShellで動作確認

```bash
git --version
```

### 推奨エディタ

- **[Visual Studio Code](https://code.visualstudio.com/)** -
  公式Deno拡張機能が利用可能
- **[Cursor](https://cursor.sh/)** - AI統合エディタ（このプロジェクトでは
  `.cursor/rules/` でルールを設定済み）

#### Deno拡張機能の設定（VSCode/Cursor）

このプロジェクトには `.vscode/`
ディレクトリが用意されており、以下の設定が自動的に適用されます：

**含まれる設定ファイル：**

- `settings.json` - Deno LSP、エディタ、フォーマッター設定
- `extensions.json` - 推奨拡張機能のリスト
- `tasks.json` - Denoタスクのショートカット
- `launch.json` - デバッグ設定（Slack Function、テスト、翻訳スクリプト等）

**推奨拡張機能（自動でインストール推奨されます）：**

- `denoland.vscode-deno` - Deno公式拡張（必須）
- `github.copilot` - AI支援コーディング
- `eamodio.gitlens` - Git履歴可視化
- `usernamehw.errorlens` - エラー行内表示

初回起動時に「推奨拡張機能をインストールしますか？」と表示されたら、「すべてインストール」を選択してください。

**デバッグ機能：**

`F5` キーまたは「実行とデバッグ」パネルから、以下のデバッグ設定を使用できます：

- **Debug Slack Function** - Slack関数のデバッグ
- **Debug Deno Tests** - 全テストのデバッグ
- **Debug Current File** - 現在開いているファイルのデバッグ
- **Debug i18n Tests** - i18nテストのデバッグ
- **Debug Translation Script** - 翻訳スクリプトのデバッグ

## GitHub Secrets の設定

GitHub Actionsを使用するため、以下のシークレットを設定してください：

```
Settings → Secrets and variables → Actions
```

必須のシークレット：

- `SLACK_WEBHOOK` - Slack通知用のIncoming Webhook URL

オプションのシークレット：

- `CODECOV_TOKEN` - コードカバレッジレポート用（プライベートリポジトリの場合）
- `ANTHROPIC_API_KEY` - i18n自動翻訳用（Claude Haiku 4.5を使用）
- `NPM_TOKEN` - npm公開用（npmパッケージとして公開する場合）
- `JSR_TOKEN` - JSR公開用（JSRパッケージとして公開する場合）

## デプロイ手順

### ローカル開発

```bash
# ローカルで実行（開発環境）
slack run workflows/example_workflow

# .envファイルは自動的に読み込まれます
```

### 本番環境へのデプロイ

本番環境へデプロイする場合は、以下の手順を実行してください：

```bash
# 1. slack.jsonにdeploymentsセクションを追加
# slack.jsonに以下を追加：
# "deployments": {
#   "production": {
#     "workspace": "your-workspace-name",
#     "token_alias": "production"
#   }
# }

# 2. テストと型チェックを完了させる
deno task test
deno task check

# 3. Slack CLI でデプロイ
slack deploy --env production

# 4. トリガーを有効化
slack triggers create --trigger-file triggers/example_trigger.ts
```

**注意:**

- `deployments`セクションはデフォルトでは含まれていません（開発専用テンプレートのため）
- 本番デプロイ時に必要に応じて追加してください
- 詳細は「slack.json 設定」セクションを参照

## プロジェクト構成

```
slack-utils-template/
├── functions/         # Slack Functions（各関数にtest.tsを配置）
├── workflows/         # Slack Workflows
├── triggers/          # Slack Triggers
├── docs/              # ドキュメント（テストガイド等）
├── assets/            # アイコンなどの静的アセット
├── .github/           # CI/CD と Issue テンプレート
├── .cursor/           # Cursor AI エディタのルール設定
├── .gitattributes     # 改行コード統一設定 (LF)
└── deno.jsonc         # Deno設定（CHANGELOG.md除外含む）
```

## 開発時の注意事項

### 改行コード

- **全ファイルでLF（Unix形式）に統一されています**
- `.gitattributes` で自動的に設定されます
- Windows環境では Git が自動変換するため、特別な設定は不要です

### エディタ設定

- **Cursor AI**: `.cursor/rules/push_rules.mdc`
  でpush前チェックが自動実行されます
- **Deno**: `deno.jsonc` で設定を管理（フォーマッター、リンターなど）
- **VSCode/Cursor**: Deno拡張機能を有効化してください

### 自動生成ファイル

- **CHANGELOG.md**: release-please/semantic-release
  が自動生成するため、フォーマットチェックから除外されています
- 手動で編集しないでください（自動更新されます）

### OS固有の注意点

#### Windows

- **Git Bash の使用**: スクリプト実行時は Git Bash または WSL を使用
- **改行コード**: `.gitattributes` が自動的にLFに変換します
- **パス区切り**: スラッシュ（`/`）を使用（バックスラッシュ不要）

#### macOS

- **Xcode Command Line Tools**: Gitインストールに必要
- **Homebrew**: 各種ツールのインストールに推奨

#### Linux

- **権限**: スクリプト実行時に `chmod +x` が必要な場合があります
- **パッケージマネージャー**: ディストリビューションに応じて選択

## Git Hooks による品質チェック（推奨）

Git hooksを設定すると、commit/push時に自動的に品質チェックが実行されます。

### セットアップ

#### macOS / Linux

```bash
bash scripts/setup-git-hooks.sh
```

#### Windows

**PowerShellを使用:**

```powershell
# Git Bashがインストールされている場合
bash scripts/setup-git-hooks.sh

# または、WSL内で実行
wsl bash scripts/setup-git-hooks.sh
```

**Git Bashを使用:**

```bash
bash scripts/setup-git-hooks.sh
```

### 自動実行される内容

**pre-commit（コミット前）:**

- ✅ フォーマットチェック
- ✅ リントチェック

**pre-push（プッシュ前）:**

- ✅ フォーマットチェック
- ✅ リントチェック
- ✅ テスト実行

### メリット

- CI/CDのエラーを事前に防止
- ローカルで即座にフィードバック
- 品質の自動保証

### 緊急時のスキップ（非推奨）

```bash
git commit --no-verify  # pre-commitをスキップ
git push --no-verify    # pre-pushをスキップ
```

詳細は `docs/git-hooks-setup.md` を参照してください。

## ライセンス

本テンプレートは MIT ライセンスで提供されています。詳細は `LICENSE`
を参照してください。
