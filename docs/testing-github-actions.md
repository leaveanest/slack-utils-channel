# GitHub Actions ワークフローの動作確認方法

このドキュメントでは、各GitHub
Actionsワークフローをテスト・確認する方法を説明します。

---

## 📋 目次

1. [基本的な確認方法](#基本的な確認方法)
2. [各ワークフローの動作確認](#各ワークフローの動作確認)
3. [ローカルでのテスト方法](#ローカルでのテスト方法)
4. [トラブルシューティング](#トラブルシューティング)

---

## 基本的な確認方法

### ワークフロー実行状況の確認

1. **GitHubリポジトリページ**にアクセス
2. **Actions** タブをクリック
3. 左サイドバーで特定のワークフローを選択
4. 実行履歴とステータスを確認

**ステータス表示:**

- ✅ 緑チェック: 成功
- ❌ 赤バツ: 失敗
- 🟡 黄色丸: 実行中
- ⚪ 灰色丸: キャンセル

### ログの確認方法

1. 実行したいワークフローをクリック
2. ジョブ名（例: `test (ubuntu-latest)`）をクリック
3. 各ステップの詳細ログを確認
4. エラーがある場合は赤いバツマークのステップを確認

---

## 各ワークフローの動作確認

### 1. Deno CI (`.github/workflows/deno-ci.yml`)

**トリガー:** push (main), pull_request

#### テスト方法A: プルリクエストで確認

```bash
# 1. 新しいブランチを作成
git checkout -b test/deno-ci

# 2. ダミーの変更を加える
echo "# Test" >> README.md

# 3. コミット & プッシュ
git add README.md
git commit -m "test: trigger deno-ci"
git push origin test/deno-ci

# 4. GitHubでPRを作成
# → Deno CI が自動実行される
```

#### テスト方法B: mainブランチへのpush

```bash
# mainブランチに直接push（注意して実行）
git checkout main
git pull
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger deno-ci on main"
git push origin main

# → Deno CI が自動実行される
```

#### 確認ポイント

- ✅ 3つのOS（Ubuntu, macOS, Windows）すべてで実行されるか
- ✅ フォーマットチェックがパスするか
- ✅ リントがパスするか
- ✅ 型チェックがパスするか
- ✅ テストがパスするか
- ✅ カバレッジがCodecovにアップロードされるか（Linux のみ）

**実行時間:** 約2-3分

---

### 2. CI (`.github/workflows/ci.yml`)

**トリガー:** push (main), pull_request (main)

#### テスト方法

Deno CIと同じ方法でトリガーされます。

```bash
# PRを作成すると自動実行
git checkout -b test/ci
echo "# CI Test" >> README.md
git add README.md
git commit -m "test: trigger ci"
git push origin test/ci
# GitHubでPRを作成
```

#### 確認ポイント

- ✅ Ubuntu環境で実行されるか
- ✅ 4つのステップ（fmt, lint, check, test）がパスするか

**実行時間:** 約1分

---

### 3. Security Scan (`.github/workflows/security.yml`)

**トリガー:** push (main), pull_request, schedule (毎週月曜 0:00 UTC)

#### テスト方法A: PRで確認

```bash
git checkout -b test/security
echo "# Security Test" >> README.md
git add README.md
git commit -m "test: trigger security scan"
git push origin test/security
# GitHubでPRを作成
```

#### テスト方法B: 手動実行

1. GitHub Actions タブを開く
2. 左サイドバーで **Security Scan** を選択
3. 右上の **Run workflow** ボタンをクリック
4. ブランチを選択して **Run workflow** を実行

#### テスト方法C: シークレットを含めてテスト

**警告: これは実際のシークレットを使わないでください**

```bash
# ダミーのシークレットを一時的に追加
git checkout -b test/security-secret
echo "AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE" >> test-secret.txt
git add test-secret.txt
git commit -m "test: add dummy secret for testing"
git push origin test/security-secret
# → TruffleHogが検出するはず
```

**テスト後は必ずブランチを削除:**

```bash
git push origin --delete test/security-secret
```

#### 確認ポイント

- ✅ TruffleHogが実行されるか
- ✅ Trivyが実行されるか
- ✅ シークレットが検出されるか（テストの場合）
- ✅ `continue-on-error: true` により失敗してもワークフローは成功するか

**実行時間:** 約3分

---

### 4. Release (`.github/workflows/release.yml`)

**トリガー:** push (main)

**注意:
このワークフローは実際のリリースを作成するため、慎重にテストしてください**

#### テスト方法A: リリース可能なコミットをpush

```bash
# Conventional Commitsに従ったコミット
git checkout main
git pull

# 機能追加（minorバージョンアップ）
git commit --allow-empty -m "feat: add new feature for testing"
git push origin main

# → release-pleaseがPRを作成する
# → PRをマージするとリリースが作成される
```

#### テスト方法B: バグ修正コミット

```bash
# パッチバージョンアップ
git commit --allow-empty -m "fix: resolve bug for testing"
git push origin main

# → release-pleaseがPRを更新またはu作成
```

#### リリースPRの確認

1. GitHub Pull Requests タブを開く
2. **Release PR** (release-pleaseが作成) を確認
3. CHANGELOG.md の更新を確認
4. PRをマージしてリリースを実行

#### 確認ポイント

- ✅ release-pleaseがPRを作成するか
- ✅ CHANGELOG.mdが正しく生成されるか
- ✅ バージョン番号が正しく更新されるか
- ✅ PRマージ後にGitHubリリースが作成されるか
- ✅ バイリンガルリリースノートが生成されるか
- ✅ リリースアセット（zipファイル）がアップロードされるか

**実行時間:** 約5分

---

### 5. Slack Notify (`.github/workflows/slack-notify.yml`)

**トリガー:** issues, pull_request, release, workflow_run

#### 前提条件

`SLACK_WEBHOOK` シークレットが設定されていること

#### テスト方法A: Issueで確認

```bash
# 1. GitHubでIssueを作成
# タイトル: "Test: Slack Notification"
# 本文: "Slack通知のテストです"

# 2. #05-miyazawa チャンネルを確認
# → "🆕 新しいIssue: Test: Slack Notification [URL]" が届く

# 3. Issueをクローズ
# → "✅ Issue解決: Test: Slack Notification [URL]" が届く
```

#### テスト方法B: PRで確認

```bash
git checkout -b test/slack-notification
echo "# Slack Test" >> README.md
git add README.md
git commit -m "test: slack notification"
git push origin test/slack-notification

# GitHubでPRを作成
# → "🔄 新しいPR: test: slack notification by @username [URL]" が届く

# PRをマージ
# → "🎉 マージ完了: test: slack notification [URL]" が届く
```

#### テスト方法C: CI完了通知

```bash
# Deno CI が完了すると自動的に通知される
# 成功: "✅ CI完了: Deno CI [URL]"
# 失敗: "⚠️ CI失敗: Deno CI [URL]"
```

#### 確認ポイント

- ✅ Slackの任意のチャンネルに通知が届くか
- ✅ 適切な絵文字とメッセージが表示されるか
- ✅ URLが正しくリンクされているか
- ✅ Webhookが設定されていない場合はスキップされるか

**実行時間:** 約10秒

---

### 6. Welcome (`.github/workflows/welcome.yml`)

**トリガー:** issues (opened), pull_request_target (opened)

**注意: 初回コントリビューター専用なので、テストは新しいGitHubアカウントが必要**

#### テスト方法（限定的）

このワークフローは実際にテストするのが難しいため、以下の方法で確認：

1. **手動実行でテスト:**
   - Actions タブ → Welcome → Run workflow

2. **別のGitHubアカウントで確認:**
   - 友人に協力を依頼してIssueまたはPRを作成してもらう

3. **コードレビュー:**
   ```yaml
   - uses: actions/first-interaction@v3
     with:
       issue-message: |
         初めてのIssueありがとうございます！🎉
   ```

#### 確認ポイント

- ✅ 初回コントリビューターにのみメッセージが送信されるか
- ✅ 日英併記のメッセージが表示されるか
- ✅ CONTRIBUTING.mdへのリンクが含まれているか

---

### 7. Issue Automation (`.github/workflows/issue-automation.yml`)

**ステータス:** 将来実装予定（現在は動作しない）

**トリガー:** issues (labeled)

#### 現在の状態

- ✅ ワークフローファイルは存在
- ❌ 実際の運用フローがまだ確立していない
- ⏳ 運用フローが確立した段階で有効化予定

#### テストは不要

運用フローが確立した後に、以下のような動作確認を行う予定です：

```bash
# （将来的な確認方法）
# 1. GitHubでIssueを作成
# 2. ラベル `ready-for-development` を追加
# 3. 自動コメントと `backlog` ラベルが追加されることを確認
```

---

### 8. Issue to PR (`.github/workflows/issue-to-pr.yml`)

**ステータス:** 将来実装予定（現在は動作しない）

#### 現在の状態

- ✅ ワークフローファイルは存在
- ✅ Codex 自体は実用的
- ❌ GitHub Actions からの操作がまだ不可
- ⏳ GitHub Actions連携が可能になり次第、有効化予定

#### テストは不要

GitHub Actions から Codex を操作できるようになった後に動作確認を行う予定です。

---

### 9. PR Size (`.github/workflows/pr-size.yml`)

**トリガー:** pull_request (opened, synchronize, reopened)

#### テスト方法

```bash
# 小さいPR (XS)
git checkout -b test/pr-size-xs
echo "# Small change" >> README.md
git add README.md
git commit -m "test: xs pr"
git push origin test/pr-size-xs
# PRを作成 → `size/XS` ラベルが付く

# 大きいPR (XL)
git checkout -b test/pr-size-xl
for i in {1..100}; do
  echo "Line $i" >> large-file.txt
done
git add large-file.txt
git commit -m "test: xl pr"
git push origin test/pr-size-xl
# PRを作成 → `size/XL` ラベルが付く
# → 1000行超の警告コメントが付く
```

#### サイズ区分

| ラベル | 変更行数 |
| ------ | -------- |
| XS     | 0-9      |
| S      | 10-49    |
| M      | 50-249   |
| L      | 250-999  |
| XL     | 1000+    |

#### 確認ポイント

- ✅ PRに適切なサイズラベルが自動付与されるか
- ✅ 1000行超の場合に警告コメントが投稿されるか
- ✅ PRを更新するとラベルも更新されるか

**実行時間:** 約5秒

---

## ローカルでのテスト方法

### act を使ったローカル実行

[act](https://github.com/nektos/act) を使うと、ローカルでGitHub
Actionsを実行できます。

#### actのインストール

```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Windows (scoop)
scoop install act
```

#### 使用方法

```bash
# すべてのワークフローをリスト表示
act -l

# 特定のワークフローを実行
act pull_request

# Deno CI を実行
act -j test

# ドライラン（実際には実行しない）
act -n

# 特定のイベントをシミュレート
act issues --eventpath event.json
```

#### 制限事項

- ⚠️ すべてのワークフローが完全に動作するわけではない
- ⚠️ シークレットは別途設定が必要（`.secrets` ファイル）
- ⚠️ 一部のアクションはローカルで動作しない場合がある

---

## トラブルシューティング

### ワークフローが実行されない

**原因と対処:**

1. **トリガー条件が合っていない**
   - ワークフローファイルの `on:` セクションを確認
   - ブランチ名やイベントタイプを確認

2. **ワークフローファイルにエラーがある**
   - YAMLの構文エラーをチェック
   - インデントが正しいか確認

3. **権限が不足している**
   - `permissions:` セクションを確認
   - 必要な権限が付与されているか確認

### ワークフローが失敗する

**デバッグ方法:**

1. **ログを詳しく確認**
   ```yaml
   - name: Debug
     run: |
       echo "Event: ${{ github.event_name }}"
       echo "Ref: ${{ github.ref }}"
       cat $GITHUB_EVENT_PATH
   ```

2. **ステップバイステップで実行**
   - 失敗したステップの前後のログを確認
   - 環境変数やシークレットが正しく設定されているか確認

3. **ローカルで再現**
   ```bash
   # ワークフローと同じコマンドをローカルで実行
   deno fmt --check
   deno lint
   deno test --allow-all
   ```

### Slack通知が届かない

**チェックリスト:**

1. ✅ `SLACK_WEBHOOK` シークレットが設定されているか
2. ✅ Webhook URLが有効か（404エラーでないか）
3. ✅ チャンネル名が正しいか（`#05-miyazawa`）
4. ✅ Slack Appがワークスペースにインストールされているか

### カバレッジがアップロードされない

**確認事項:**

1. ✅ `CODECOV_TOKEN`
   シークレットが設定されているか（プライベートリポジトリの場合）
2. ✅ カバレッジファイル（`cov.lcov`）が生成されているか
3. ✅ Linuxジョブでのみアップロードされているか

---

## ワークフロー実行の履歴を確認

### GitHub UI

```
https://github.com/leaveanest/slack-utils/actions
```

### GitHub CLI

```bash
# インストール
brew install gh

# ログイン
gh auth login

# ワークフロー実行履歴を表示
gh run list

# 特定のワークフローの履歴
gh run list --workflow=deno-ci.yml

# 詳細を表示
gh run view <run-id>

# ログを表示
gh run view <run-id> --log
```

---

## まとめ

### 推奨テスト順序

新しい環境でテストする場合、以下の順序で確認することを推奨します：

1. **Deno CI** - 基本的な品質チェック
2. **PR Size** - PRサイズラベル
3. **Slack Notify** - 通知システム
4. **Security Scan** - セキュリティスキャン
5. **Welcome** - 新規コントリビューター歓迎
6. **Release** - リリースフロー（最後に実行）

**将来実装予定（テスト不要）:**

- Issue Automation
- Issue to PR

### 定期的な確認

- **毎週:** Security Scan の定期実行結果を確認
- **リリース前:** すべてのワークフローがパスしていることを確認
- **新機能追加後:** 関連するワークフローをテスト

---

**ワークフローの動作確認を通じて、CI/CDパイプラインの健全性を保ちましょう！** 🚀
