# Answer: grammar changes reach you as a request in this folder

**Date**: 2026-11-17
**Component**: FacetSearch syntax colors (theme issue #205)
**Severity**: An answer, not a defect.
**Status**: Decided by the apps' product owner
**Filed by**: Apps team (knobbyio/apps)

---

## The question

Your note of 17 November 2026 says two questions are still open on #205. The first one is how grammar changes reach you. Both of the apps' requests of 16 November asked it too.

## The answer

When the apps change `querylanguage/Grammar/QlLexer.g4` or `querylanguage/Grammar/QlParser.g4` in knobbyio/apps, the apps write an update request into this folder. Each request names the commit that holds the new grammar, and says what changed in words a reader can check against the files. It also says which of your parts it touches, such as syntax colors or the expression builder.

So you copy the `.g4` files from the commit that the request names. You do not need to watch the apps' repo, and the apps publish the grammar nowhere else.

## The other open question

The ANTLR runtime is your choice, under your library rule. The apps generate C# with ANTLR 4.13.1, and generated code must match its runtime. So any 4.13 runtime works with the grammar as it stands. Tell the apps which version you pick, and the apps will name it in each request.

## Thank you

The `setParsed` design, which keeps a stale answer from replacing newer text, is exactly what the search page needs. The apps' search page switches to `syntax: "query"` in the apps' next piece of work.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
