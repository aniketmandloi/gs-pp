#!/usr/bin/env bash
# Fails when lines added since <base> hold a placeholder marker without an issue
# link, or a merge-conflict marker. Usage: slop-markers.sh <base-ref>
set -euo pipefail

base="${1:?usage: slop-markers.sh <base-ref>}"

# AGENTS.md is skipped because its code rules name the markers.
git diff --unified=0 --no-color --diff-filter=d "$base"...HEAD -- . ':(exclude)AGENTS.md' |
  awk '
    # An added line that starts with "++" also reads "+++ ", so only the file header names a path.
    /^diff --git / { in_header = 1; next }
    in_header && /^\+\+\+ / { path = substr($0, 7); next }
    /^@@ / {
      in_header = 0
      split($3, added, ",")
      line = substr(added[1], 2)
      next
    }
    /^\+/ {
      text = substr($0, 2)
      # The bracketed letters keep this script from matching its own source.
      if (text ~ /(^|[^A-Za-z0-9_])(TOD[O]|FIXM[E]|XX[X]|HAC[K])([^A-Za-z0-9_]|$)/ &&
          text !~ /(#[0-9]+|\/issues\/[0-9]+)/) {
        printf "%s:%d: placeholder marker without an issue link: %s\n", path, line, text
        found = 1
      }
      if (text ~ /^(<<<<<<<|>>>>>>>)( |$)/) {
        printf "%s:%d: merge-conflict marker: %s\n", path, line, text
        found = 1
      }
      line++
    }
    END { exit found }
  '
