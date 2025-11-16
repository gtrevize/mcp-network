# Release Workflow

This document describes the automated release process for publishing new versions of @gtrevize/mcp-network.

## Quick Release

For a standard patch release:

```bash
# 1. Bump version
npm run version:patch  # or version:minor, version:major

# 2. Build and test
npm run build
npm test

# 3. Run automated release
npm run release
```

The release script will:
1. ✅ Verify git working directory is clean
2. ✅ Check you're on main branch (warns if not)
3. ✅ Prompt for commit message and release notes
4. ✅ Commit changes with Claude Code attribution
5. ✅ Push to GitHub
6. ✅ Publish to npm registry
7. ✅ Create and push git tag
8. ✅ Create GitHub release

## Step-by-Step Release Process

### 1. Prepare Changes

Make your code changes, update documentation, write tests.

### 2. Bump Version

Choose the appropriate version bump:

```bash
# Patch release (0.1.4 → 0.1.5) - bug fixes, minor updates
npm run version:patch

# Minor release (0.1.4 → 0.2.0) - new features, backwards compatible
npm run version:minor

# Major release (0.1.4 → 1.0.0) - breaking changes
npm run version:major
```

This updates `package.json` without creating a git tag.

### 3. Build and Test

Ensure everything works:

```bash
# Build
npm run build

# Run tests
npm test

# Optional: Run security scan
npm run semgrep

# Optional: Test locally
npm link
mcp-network-cli  # test the CLI
npm unlink
```

### 4. Run Release Automation

```bash
npm run release
```

**The script will prompt for:**
1. **Commit message**: Describe what changed (e.g., "fix: token generation command")
2. **Release notes**: Multi-line markdown description of the release

**Example commit message:**
```
feat: add WebSocket support for real-time updates

Added WebSocket server for real-time network monitoring.
Includes connection pooling and automatic reconnection.
```

**Example release notes:**
```
## ✨ New Features

- WebSocket support for real-time monitoring
- Connection pooling with automatic reconnection
- Live updates for ping, traceroute, and bandwidth tests

## 📚 Documentation

- Added WebSocket API examples
- Updated architecture diagrams

## 🔧 Improvements

- Reduced memory usage by 30%
- Improved error handling for network timeouts
```

### 5. Verify Release

After successful release, verify:

- **npm**: https://www.npmjs.com/package/@gtrevize/mcp-network
- **GitHub**: https://github.com/gtrevize/mcp-network/releases
- **Installation**: `npm install -g @gtrevize/mcp-network`

## Manual Release (Advanced)

If you need more control, you can run steps manually:

```bash
# 1. Bump version
npm run version:patch

# 2. Build and test
npm run build && npm test

# 3. Commit
git add -A
git commit -m "release: v$(node -p 'require(\"./package.json\").version')"

# 4. Push to GitHub
git push

# 5. Publish to npm
npm publish --access public

# 6. Create git tag
VERSION=$(node -p 'require("./package.json").version')
git tag -a "v$VERSION" -m "v$VERSION"
git push origin "v$VERSION"

# 7. Create GitHub release
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --notes "Release notes here" \
  --latest
```

## Hotfix Releases

For urgent fixes on already-released versions:

```bash
# 1. Create hotfix branch from tag
git checkout -b hotfix/0.1.4 v0.1.4

# 2. Make fix
# ... edit files ...

# 3. Bump patch version
npm run version:patch

# 4. Build and test
npm run build && npm test

# 5. Release
npm run release

# 6. Merge back to main
git checkout main
git merge hotfix/0.1.4
git push
```

## Pre-release Versions

For beta/alpha releases:

```bash
# Create pre-release version
npm version prerelease --preid=beta --no-git-tag-version
# Result: 0.1.5-beta.0

# Manual publish (don't use automated script)
git add package.json
git commit -m "chore: bump to 0.1.5-beta.0"
git push
npm publish --access public --tag beta

# Users install with:
npm install @gtrevize/mcp-network@beta
```

## Release Checklist

Before each release:

- [ ] All tests passing
- [ ] No security vulnerabilities (npm audit, semgrep)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped appropriately
- [ ] Clean git working directory
- [ ] On main branch (or document why not)

After release:

- [ ] Verify npm package page
- [ ] Verify GitHub release page
- [ ] Test installation: `npm install -g @gtrevize/mcp-network`
- [ ] Update project README if needed
- [ ] Announce release (if significant)

## Rollback

If you need to unpublish a broken release:

```bash
# Unpublish within 72 hours (npm policy)
npm unpublish @gtrevize/mcp-network@0.1.5

# Or deprecate (preferred)
npm deprecate @gtrevize/mcp-network@0.1.5 "Broken release, use 0.1.4 or 0.1.6"

# Delete GitHub release
gh release delete v0.1.5 --yes

# Delete git tag
git tag -d v0.1.5
git push origin :refs/tags/v0.1.5
```

## Troubleshooting

### "npm publish" fails with 2FA

Ensure your npm automation token is configured:
```bash
source ~/.zshrc
echo "//registry.npmjs.org/:_authToken=${NPM_REGISTRY_TOKEN}" > ~/.npmrc
```

### "gh release create" fails

Ensure GitHub CLI is authenticated:
```bash
gh auth status
gh auth login  # if needed
```

### Version mismatch

If package.json version doesn't match git tag:
```bash
# Check current state
git tag | tail -5
node -p 'require("./package.json").version'

# Fix: Set package.json to match last tag + 1 patch
npm version patch --no-git-tag-version
```

## Version History

Current versioning scheme: **MAJOR.MINOR.PATCH**

- **MAJOR**: Breaking changes (0.x.x → 1.0.0)
- **MINOR**: New features, backwards compatible (0.1.x → 0.2.0)
- **PATCH**: Bug fixes, documentation updates (0.1.4 → 0.1.5)

We follow [Semantic Versioning](https://semver.org/).
