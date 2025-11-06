#!/bin/bash

# Git Hooks セットアップスクリプト
# このスクリプトは pre-commit と pre-push フックを設定します

set -e

echo "🔧 Setting up Git hooks..."
echo ""

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクトルートにいることを確認
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Error: .git directory not found${NC}"
  echo "Please run this script from the project root"
  exit 1
fi

# pre-commit hook
echo -e "${BLUE}📝 Creating pre-commit hook...${NC}"
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

set -e

echo "🔍 Running pre-commit checks..."

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ステージングされたファイルをチェック
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|json|md)$' || true)

if [ -n "$STAGED_FILES" ]; then
  echo -e "${YELLOW}📝 Checking format...${NC}"
  if ! deno fmt --check $STAGED_FILES; then
    echo -e "${RED}❌ Format check failed!${NC}"
    echo -e "${YELLOW}💡 Run: deno fmt${NC}"
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
EOF

chmod +x .git/hooks/pre-commit
echo -e "${GREEN}✓${NC} pre-commit hook created"
echo ""

# pre-push hook
echo -e "${BLUE}📝 Creating pre-push hook...${NC}"
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash

set -e

echo "🚀 Running pre-push checks..."

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

echo ""
echo -e "${GREEN}🎉 All pre-push checks passed! Pushing...${NC}"
EOF

chmod +x .git/hooks/pre-push
echo -e "${GREEN}✓${NC} pre-push hook created"
echo ""

# 完了メッセージ
echo -e "${GREEN}✅ Git hooks have been set up successfully!${NC}"
echo ""
echo -e "${BLUE}Hooks installed:${NC}"
echo "  • pre-commit: format + lint (fast)"
echo "  • pre-push: format + lint + test (comprehensive)"
echo ""
echo -e "${YELLOW}Usage:${NC}"
echo "  git commit -m \"...\"  → pre-commit hook runs"
echo "  git push              → pre-push hook runs"
echo ""
echo -e "${YELLOW}To skip hooks (emergency only):${NC}"
echo "  git commit --no-verify"
echo "  git push --no-verify"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"

