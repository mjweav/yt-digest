#!/bin/bash

# commitall.sh - Full commit and push workflow
# Usage: ./scripts/commitall.sh or bash scripts/commitall.sh

set -e  # Exit on any error

echo "🔄 Starting commitall workflow..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check git status
if git diff --quiet && git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
    exit 0
fi

echo "📦 Staging all files..."
git add .

# Get the commit message with timestamp
COMMIT_MSG="feat: automated commit - $(date +'%Y-%m-%d %H:%M:%S')"

echo "💾 Committing with message: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "⬆️  Pushing to remote..."
git push origin main

echo "✅ commitall workflow completed successfully!"
