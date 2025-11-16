#!/bin/bash

# Automated Release Script
# Usage: npm run release "commit message" "release notes"
# Or: npm run release (will prompt for inputs)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 MCP Network Release Automation${NC}\n"

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}\n"

# Check if git working directory is clean
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}Error: Git working directory is not clean.${NC}"
  echo "Please commit or stash your changes before releasing."
  exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo -e "${YELLOW}Warning: You're not on main branch (current: $CURRENT_BRANCH)${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Get commit message
if [[ -n "$1" ]]; then
  COMMIT_MSG="$1"
else
  read -p "Enter commit message: " COMMIT_MSG
fi

# Get release notes
if [[ -n "$2" ]]; then
  RELEASE_NOTES="$2"
else
  echo -e "\n${YELLOW}Enter release notes (end with Ctrl+D):${NC}"
  RELEASE_NOTES=$(cat)
fi

# Append Claude Code attribution
COMMIT_MSG="$COMMIT_MSG

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

echo -e "\n${GREEN}📋 Release Summary${NC}"
echo -e "${YELLOW}Version:${NC} v${CURRENT_VERSION}"
echo -e "${YELLOW}Commit:${NC} $COMMIT_MSG"
echo -e "${YELLOW}Branch:${NC} $CURRENT_BRANCH"
echo ""
read -p "Proceed with release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Release cancelled."
  exit 0
fi

echo -e "\n${GREEN}Step 1/5: Committing changes...${NC}"
git add -A
git commit -m "$COMMIT_MSG" || echo "No changes to commit"

echo -e "\n${GREEN}Step 2/5: Pushing to GitHub...${NC}"
git push origin "$CURRENT_BRANCH"

echo -e "\n${GREEN}Step 3/5: Publishing to npm...${NC}"
npm publish --access public

echo -e "\n${GREEN}Step 4/5: Creating git tag...${NC}"
git tag -a "v${CURRENT_VERSION}" -m "v${CURRENT_VERSION}"
git push origin "v${CURRENT_VERSION}"

echo -e "\n${GREEN}Step 5/5: Creating GitHub release...${NC}"
gh release create "v${CURRENT_VERSION}" \
  --title "v${CURRENT_VERSION}" \
  --notes "$RELEASE_NOTES" \
  --latest

echo -e "\n${GREEN}✅ Release v${CURRENT_VERSION} completed successfully!${NC}"
echo -e "\n${YELLOW}Published:${NC}"
echo "  • npm: https://www.npmjs.com/package/@gtrevize/mcp-network"
echo "  • GitHub: https://github.com/gtrevize/mcp-network/releases/tag/v${CURRENT_VERSION}"
