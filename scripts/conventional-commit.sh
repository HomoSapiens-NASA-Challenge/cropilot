#!/bin/sh
# Validates a commit subject or a PR title. Used by the commit-msg hook and by CI.
#   conventional-commit.sh "<subject>"         (CI: the PR title)
#   conventional-commit.sh --file <msg-file>   (hook: the first line of the commit message)
# The hook passes a path instead of "$(head ...)": lefthook on Windows wraps the job in
# sh -c "...", and nested double quotes break it.
if [ "$1" = "--file" ]; then
  subject=$(head -n 1 "$2")
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
