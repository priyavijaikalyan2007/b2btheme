#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Generates build.json with git metadata and timestamps.
# Copied to dist/ and dist/docs/ so it is fetchable from the CDN.
# ----------------------------------------------------------------------------

set -euo pipefail

DIST_DIR="dist"
DOCS_DIR="dist/docs"

mkdir -p "$DIST_DIR" "$DOCS_DIR"

# Use node for proper JSON escaping of all values
node -e "
var cp = require('child_process');
var fs = require('fs');
var path = require('path');

function git(args) {
    try { return cp.execSync('git ' + args, { encoding: 'utf8' }).trim(); }
    catch (_) { return ''; }
}

function sh(cmd) {
    try { return cp.execSync(cmd, { encoding: 'utf8' }).trim(); }
    catch (_) { return 'unknown'; }
}

var pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

var info = {
    package: pkg.name,
    version: pkg.version,
    git: {
        commit:      git('rev-parse HEAD')             || 'unknown',
        commitShort: git('rev-parse --short HEAD')     || 'unknown',
        branch:      git('rev-parse --abbrev-ref HEAD') || 'unknown',
        tag:         git('describe --tags --exact-match 2>/dev/null') || '',
        message:     git('log -1 --pretty=%s')         || 'unknown',
        author:      git('log -1 --pretty=%an')        || 'unknown',
        commitDate:  git('log -1 --pretty=%aI')        || 'unknown',
        dirty:       sh('git diff --quiet && echo false || echo true') === 'true'
    },
    build: {
        timestamp:   new Date().toISOString(),
        timezone:    Intl.DateTimeFormat().resolvedOptions().timeZone,
        host:        sh('hostname'),
        user:        sh('whoami'),
        nodeVersion: process.version,
        npmVersion:  sh('npm --version')
    }
};

var json = JSON.stringify(info, null, 2) + '\n';

fs.writeFileSync('$DIST_DIR/build.json', json);
fs.writeFileSync('$DOCS_DIR/build.json', json);

console.log('[BuildInfo] wrote $DIST_DIR/build.json');
console.log('[BuildInfo] copied to $DOCS_DIR/build.json');
"
