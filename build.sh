#!/bin/bash
# AGENT: Full build script — cleans, installs, compiles SCSS, copies assets, rebuilds repository index.
# @entrypoint

set -e

# Clean previous build artefacts
rm -f -R ./dist/
rm -f -R ./node_modules/

# Install dependencies and compile
npm install
npm audit fix
npm run build

# Copy static assets
cp -R ./cloud-icons/ ./dist/

# Rebuild the repository index for agent navigation
if command -v python3 >/dev/null 2>&1; then
    echo "Rebuilding repository index..."
    python3 ./scripts/repo-index.py rebuild
    echo "Repository index updated."
else
    echo "Warning: python3 not found — skipping repository index rebuild."
fi

