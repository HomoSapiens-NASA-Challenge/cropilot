#!/bin/sh
# Validates a commit subject or a PR title. Used by the commit-msg hook and by CI.
if [ "$1" = "--file" ]; then
  IFS= read -r subject < "$2"
else
  subject=$1
fi
pattern='^((feat|fix|docs|refactor|test|chore)(\([a-z0-9-]+\))?: .+|(Merge|Revert) .+)'

if ! printf '%s' "$subject" | grep -Eq "$pattern" || [ "${#subject}" -gt 72 ]; then
  echo "Invalid subject: $subject" >&2
  echo "Expected '<type>(<scope>): <summary>' in 72 characters or fewer." >&2
  echo "Types: feat, fix, docs, refactor, test, chore." >&2
  exit 1
fi
