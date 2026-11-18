#!/usr/bin/env bash
# SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
# SPDX-License-Identifier: MIT
# ⚓ COMPONENT: QueryLanguage / BuildPipeline
# 📜 PURPOSE: Regenerates the TypeScript lexer and parser from the apps'
#    grammar, only when the grammar or the ANTLR version changed (#205). The
#    output is committed, so a build never needs Java, and each change to the
#    parser traces to one grammar change. This mirrors the apps' own
#    querylanguage/generate.sh, which makes their C# from the same files.
# 🔗 RELATES: [[QueryLanguage]], [[FacetSearch]]
#
# USAGE
#   bash scripts/generate-querylanguage.sh           regenerate if the grammar changed
#   bash scripts/generate-querylanguage.sh --force   regenerate anyway
#
# A grammar change reaches this repo as a request in the apps' bugreports
# folder, which names the knobbyio/apps commit to copy QlLexer.g4 and
# QlParser.g4 from. Copy both into components/querylanguage/grammar/, then run
# this, then commit the grammar and the generated code together.
#
# The stamp has two lines: a hash of the inputs (the version and both
# grammars), and a hash of the generated .ts files. querylanguage.test.ts
# computes both. It fails when the grammar changed without this script, and
# when someone edited the generated code by hand.
set -euo pipefail

# The apps use 4.13.1, and generated code must match its runtime. Change this,
# the checksum and the exact antlr4 version in package.json together, and tell
# the apps.
ANTLR_VERSION=4.13.1
ANTLR_SHA1=e59266b0351e7543f19834614aa76551023ab4cc

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HERE="$ROOT/components/querylanguage"
JAR="$ROOT/.tools/antlr-$ANTLR_VERSION-complete.jar"
OUT="$HERE/generated"
STAMP="$OUT/grammar.stamp"

inputs_hash() {
    { printf 'antlr %s\n' "$ANTLR_VERSION"; cat "$HERE/grammar/QlLexer.g4" "$HERE/grammar/QlParser.g4"; } \
        | shasum -a 256 | cut -d' ' -f1
}

outputs_hash() {
    # Sorted by byte order, as the test sorts them, whatever the locale.
    find "$OUT" -maxdepth 1 -name '*.ts' -print0 | LC_ALL=C sort -z | xargs -0 cat | shasum -a 256 | cut -d' ' -f1
}

want="$(inputs_hash)"
if [[ "${1:-}" != "--force" && -f "$STAMP" && "$(head -1 "$STAMP")" == "$want" ]]; then
    echo "The generated parser matches the grammar. Nothing to do."
    exit 0
fi

if ! command -v java >/dev/null 2>&1; then
    echo "FATAL: ANTLR runs on Java, and no java is on the PATH. Install a JDK, such as 'brew install openjdk'." >&2
    exit 1
fi

mkdir -p "$ROOT/.tools"
if [[ ! -f "$JAR" ]]; then
    url="https://repo1.maven.org/maven2/org/antlr/antlr4/$ANTLR_VERSION/antlr4-$ANTLR_VERSION-complete.jar"
    curl -fsSL -o "$JAR.part" "$url"
    got="$(shasum -a 1 "$JAR.part" | cut -d' ' -f1)"
    if [[ "$got" != "$ANTLR_SHA1" ]]; then
        rm -f "$JAR.part"
        echo "FATAL: the ANTLR jar from $url has checksum $got, and $ANTLR_SHA1 was expected." \
            "Nothing was generated." >&2
        exit 1
    fi
    mv "$JAR.part" "$JAR"
fi

rm -rf "$OUT"
mkdir -p "$OUT"

# Run from the grammar folder with plain file names, so the generated headers
# name the grammar file and not this machine's path. The colours walk the
# tree directly, so no listener or visitor is made.
(cd "$HERE/grammar" && java -jar "$JAR" -Dlanguage=TypeScript \
    -no-visitor -no-listener -Xexact-output-dir -o "$OUT" -lib "$OUT" QlLexer.g4 QlParser.g4)

# The .interp and .tokens files are inputs to tools, not to the build.
rm -f "$OUT"/*.interp "$OUT"/*.tokens

printf '%s\n%s\n' "$want" "$(outputs_hash)" > "$STAMP"
echo "Regenerated the parser. Commit components/querylanguage/grammar and generated together."
