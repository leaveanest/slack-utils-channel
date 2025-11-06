# Git Hooks でコミット・Push前に自動チェック

このドキュメントでは、Git
hooksを使って**push前に自動的にテストを実行する方法**を説明します。

---

## 📋 目次

1. [Git Hooksとは](#git-hooksとは)
2. [pre-push hookの設定](#pre-push-hookの設定)
3. [pre-commit hookの設定](#pre-commit-hookの設定)
4. [使い方](#使い方)
5. [トラブルシューティング](#トラブルシューティング)

---

## Git Hooksとは

**Git hooks**は、Gitの特定のアクション（commit、push
など）の前後に自動実行されるスクリプトです。

### 主なフック

| フック         | 実行タイミング           | 用途                 |
| -------------- | ------------------------ | -------------------- |
| **pre-commit** | コミット前               | フォーマット、リント |
| **pre-push**   | プッシュ前               | テスト、型チェック   |
| **commit-msg** | コミットメッセージ作成後 | メッセージの検証     |

---

## pre-push hookの設定

push前に**フォーマット、リント、テスト**を自動実行します。

### 1. フックスクリプトの作成

```bash
# .git/hooks/pre-push ファイルを作成
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

set -e

echo "🚀 Running pre-push checks..."

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. フォーマットチェック
echo -e "${YELLOW}📝 Checking format...${NC}"
if ! deno fmt --check; then
  echo -e "${RED}❌ Format check failed!${NC}"
  echo -e "${YELLOW}💡 Run: deno fmt${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Format check passed${NC}"

# 2. リントチェック
echo -e "${YELLOW}🔍 Running lint...${NC}"
if ! deno lint; then
  echo -e "${RED}❌ Lint check failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Lint check passed${NC}"

# 3. テスト実行
echo -e "${YELLOW}🧪 Running tests...${NC}"
if ! deno test --allow-all; then
  echo -e "${RED}❌ Tests failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ All tests passed${NC}"

echo -e "${GREEN}🎉 All pre-push checks passed! Pushing...${NC}"
EOF

# 実行権限を付与
chmod +x .git/hooks/pre-push
```

### 2. 動作確認

```bash
# テストpush（実際にはpushされない）
git push --dry-run

# 実際にpush
git push
# → 自動的にチェックが実行される
```

---

## pre-commit hookの設定

コミット前に**フォーマットとリント**のみを実行します（テストは含めない）。

### 1. フックスクリプトの作成

```bash
# .git/hooks/pre-commit ファイルを作成
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

set -e

echo "🔍 Running pre-commit checks..."

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ステージングされたファイルのみチェック
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|json|md)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "No files to check"
  exit 0
fi

echo "Checking files: $STAGED_FILES"

# 1. フォーマットチェック（ステージングされたファイルのみ）
echo -e "${YELLOW}📝 Checking format...${NC}"
if ! deno fmt --check $STAGED_FILES; then
  echo -e "${RED}❌ Format check failed!${NC}"
  echo -e "${YELLOW}💡 Run: deno fmt${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Format check passed${NC}"

# 2. リントチェック（全体）
echo -e "${YELLOW}🔍 Running lint...${NC}"
if ! deno lint; then
  echo -e "${RED}❌ Lint check failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Lint check passed${NC}"

echo -e "${GREEN}✅ Pre-commit checks passed! Committing...${NC}"
EOF

# 実行権限を付与
chmod +x .git/hooks/pre-commit
```

### 2. 動作確認

```bash
# コミットを試す
git add README.md
git commit -m "test: pre-commit hook"
# → 自動的にチェックが実行される
```

---

## 両方を設定する（推奨）

**pre-commit**と**pre-push**の両方を設定することを推奨します。

```bash
# 一括設定スクリプト
cat > setup-git-hooks.sh << 'EOF'
#!/bin/bash

echo "Setting up Git hooks..."

# pre-commit hook
cat > .git/hooks/pre-commit << 'HOOK_EOF'
#!/bin/bash
set -e
echo "🔍 Running pre-commit checks..."
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|json|md)$' || true)

if [ -n "$STAGED_FILES" ]; then
  echo -e "${YELLOW}📝 Checking format...${NC}"
  if ! deno fmt --check $STAGED_FILES; then
    echo -e "${RED}❌ Format check failed! Run: deno fmt${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Format check passed${NC}"
fi

echo -e "${YELLOW}🔍 Running lint...${NC}"
if ! deno lint; then
  echo -e "${RED}❌ Lint check failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Lint check passed${NC}"

echo -e "${GREEN}✅ Pre-commit checks passed!${NC}"
HOOK_EOF

# pre-push hook
cat > .git/hooks/pre-push << 'HOOK_EOF'
#!/bin/bash
set -e
echo "🚀 Running pre-push checks..."
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📝 Checking format...${NC}"
if ! deno fmt --check; then
  echo -e "${RED}❌ Format check failed! Run: deno fmt${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Format check passed${NC}"

echo -e "${YELLOW}🔍 Running lint...${NC}"
if ! deno lint; then
  echo -e "${RED}❌ Lint check failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Lint check passed${NC}"

echo -e "${YELLOW}🧪 Running tests...${NC}"
if ! deno test --allow-all; then
  echo -e "${RED}❌ Tests failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ All tests passed${NC}"

echo -e "${GREEN}🎉 All pre-push checks passed! Pushing...${NC}"
HOOK_EOF

# 実行権限を付与
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/pre-push

echo "✅ Git hooks have been set up successfully!"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: format + lint"
echo "  - pre-push: format + lint + test"
EOF

# スクリプトを実行可能にして実行
chmod +x setup-git-hooks.sh
./setup-git-hooks.sh
```

---

## 使い方

### 通常の使用

```bash
# 1. コミット
git add .
git commit -m "feat: add new feature"
# → pre-commit hook が自動実行される
# → フォーマットとリントがチェックされる

# 2. プッシュ
git push origin main
# → pre-push hook が自動実行される
# → フォーマット、リント、テストがチェックされる
```

### フックをスキップする（緊急時のみ）

```bash
# コミット時にフックをスキップ
git commit --no-verify -m "emergency fix"

# プッシュ時にフックをスキップ
git push --no-verify

# ⚠️ 注意: 通常はスキップしないでください！
```

### チェック内容のカスタマイズ

`.git/hooks/pre-push` を編集して、チェック内容を変更できます：

```bash
# 型チェックを追加
echo -e "${YELLOW}🔍 Type checking...${NC}"
if ! deno check **/*.ts; then
  echo -e "${RED}❌ Type check failed!${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Type check passed${NC}"
```

---

## メリット・デメリット

### メリット ✅

1. **CIエラーの事前防止**
   - ローカルで問題を発見できる
   - CIの無駄な実行を削減

2. **品質の自動保証**
   - 手動チェックの忘れ防止
   - チーム全体で統一された品質基準

3. **フィードバックが早い**
   - push前に問題を発見
   - 修正コストが低い

4. **学習効果**
   - エラーメッセージから学べる
   - コーディング規約が身につく

### デメリット ❌

1. **pushに時間がかかる**
   - テスト実行に数秒〜数十秒
   - 対処: pre-commitは軽量に、pre-pushで全チェック

2. **初期設定が必要**
   - チームメンバー全員が設定する必要がある
   - 対処: セットアップスクリプトを用意

3. **緊急時に邪魔になる**
   - hotfixで急いでいる時など
   - 対処: `--no-verify` オプションを使用（最終手段）

---

## チーム全体で使用する場合

### 方法1: セットアップスクリプトをリポジトリに含める

````bash
# scripts/setup-git-hooks.sh として保存
# README.mdに記載：
# 
# ## 初期セットアップ
# ```bash
# bash scripts/setup-git-hooks.sh
# ```
````

### 方法2: hooksディレクトリを共有（Git 2.9+）

```bash
# .github/hooks/ ディレクトリを作成
mkdir -p .github/hooks

# フックファイルを配置
cp .git/hooks/pre-push .github/hooks/

# Git設定を変更（各開発者が実行）
git config core.hooksPath .github/hooks
```

**メリット:**

- Git管理下に置ける
- チーム全体で同じフックを使用
- 更新が自動的に反映される

### 方法3: Deno taskとして統合

`deno.jsonc` に追加：

```json
{
  "tasks": {
    "pre-push": "deno fmt --check && deno lint && deno test --allow-all",
    "pre-commit": "deno fmt --check && deno lint"
  }
}
```

フックから呼び出す：

```bash
#!/bin/bash
deno task pre-push
```

---

## トラブルシューティング

### Q1: フックが実行されない

**原因:**

- 実行権限がない
- ファイル名が間違っている

**解決策:**

```bash
# 権限を確認
ls -l .git/hooks/pre-push

# 実行権限を付与
chmod +x .git/hooks/pre-push
chmod +x .git/hooks/pre-commit

# ファイル名を確認（拡張子なし）
# NG: pre-push.sh
# OK: pre-push
```

### Q2: テストが遅すぎる

**解決策:**

1. **pre-commitは軽量に**
   ```bash
   # フォーマットとリントのみ
   deno fmt --check
   deno lint
   ```

2. **pre-pushで完全チェック**
   ```bash
   # 全チェック
   deno fmt --check && deno lint && deno test --allow-all
   ```

3. **並列実行**
   ```bash
   # 可能であれば並列実行
   deno fmt --check & deno lint & wait
   ```

### Q3: 特定のブランチでのみスキップしたい

```bash
#!/bin/bash
# mainブランチへのpushのみチェック
BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$BRANCH" != "main" ]; then
  echo "Skipping checks for branch: $BRANCH"
  exit 0
fi

# チェック実行
deno fmt --check
deno lint
deno test --allow-all
```

### Q4: Windowsで動作しない

**原因:**

- Bashスクリプトが実行できない

**解決策:**

- Git Bash を使用
- または PowerShell版を作成

```powershell
# .git/hooks/pre-push.ps1
Write-Host "Running pre-push checks..." -ForegroundColor Yellow

deno fmt --check
if ($LASTEXITCODE -ne 0) { exit 1 }

deno lint
if ($LASTEXITCODE -ne 0) { exit 1 }

deno test --allow-all
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "All checks passed!" -ForegroundColor Green
```

---

## 推奨設定

このプロジェクトでは以下の構成を推奨します：

### pre-commit

- ✅ フォーマットチェック（軽量・高速）
- ✅ リントチェック
- ❌ テスト（時間がかかるため pre-push で実行）

### pre-push

- ✅ フォーマットチェック
- ✅ リントチェック
- ✅ テスト実行
- ✅ 型チェック（オプション）

---

## 参考リンク

- [Git Hooks 公式ドキュメント](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Deno タスクランナー](https://deno.land/manual@v1.37.0/tools/task_runner)

---

**Git hooksを活用して、品質の高いコードを維持しましょう！** 🚀
