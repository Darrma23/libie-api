#!/bin/bash

# Stage semua perubahan
git add .

# Ambil perubahan yang sudah di-stage
CHANGED=$(git diff --cached --name-only)

if [[ -z "$CHANGED" ]]; then
    echo "Ga ada perubahan 😴"
    exit 0
fi

TYPE="$1"
shift
MSG="$*"

# Auto detect type
if [[ -z "$TYPE" ]]; then
    if echo "$CHANGED" | grep -Eq "\.md$"; then
        TYPE="docs"
    elif echo "$CHANGED" | grep -Eq "\.json$|\.config|\.env"; then
        TYPE="chore"
    elif echo "$CHANGED" | grep -Eq "\.test\.|spec\."; then
        TYPE="test"
    else
        TYPE="feat"
    fi
fi

case "$TYPE" in
    feat) EMOJI="✨" ;;
    fix) EMOJI="🐛" ;;
    chore) EMOJI="🔧" ;;
    docs) EMOJI="📝" ;;
    test) EMOJI="🧪" ;;
    refactor) EMOJI="♻️" ;;
    perf) EMOJI="⚡" ;;
    style) EMOJI="🎨" ;;
    *) EMOJI="🔹" ;;
esac

if [[ -z "$MSG" ]]; then
    FILE_COUNT=$(echo "$CHANGED" | wc -l)
    MSG="update $FILE_COUNT file(s)"
fi

STATS=$(git diff --cached --shortstat)

git commit -m "$EMOJI $TYPE: $MSG

Changes:
$STATS

Files:
$CHANGED"

if [[ $? -eq 0 ]]; then
    git push origin "$(git branch --show-current)"
fi