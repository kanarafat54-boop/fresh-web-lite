#!/usr/bin/env bash
set -euo pipefail
set -x

# Improved import script with authentication check and resilient subtree handling.
# Requires IMPORT_PAT env var (personal access token with repo scope).

if [ -z "${IMPORT_PAT:-}" ]; then
  echo "ERROR: IMPORT_PAT environment variable is not set. Set repository secret IMPORT_PAT to a personal access token with repo scope."
  exit 1
fi

# Quick token test
echo "Verifying IMPORT_PAT..."
user_resp=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $IMPORT_PAT" https://api.github.com/user)
if [ "$user_resp" != "200" ]; then
  echo "ERROR: IMPORT_PAT is not valid or lacks scope (HTTP $user_resp). Ensure token has 'repo' scope and is correct."
  exit 1
fi

OWNER="kanarafat54-boop"
TARGET_DIR="projects"
mkdir -p "$TARGET_DIR"

# Get list of repos for the user (paginated)
page=1
repos=()
while :; do
  resp=$(curl -s -H "Authorization: token $IMPORT_PAT" "https://api.github.com/users/$OWNER/repos?per_page=100&page=$page")
  # If API rate limited or error, dump and exit
  if echo "$resp" | grep -q 'API rate limit exceeded\|Bad credentials'; then
    echo "ERROR: GitHub API returned an error or rate limit. Response:\n$resp"
    exit 1
  fi
  names=$(echo "$resp" | jq -r '.[].name')
  if [ -z "$names" ]; then
    break
  fi
  while read -r name; do
    repos+=("$name")
  done <<< "$names"
  page=$((page+1))
done

# Exclude this repo from import list if present
cleaned=()
for r in "${repos[@]}"; do
  if [ "$r" = "fresh-web-lite" ] || [ "$r" = "Fresh-" ] || [ "$r" = "Fresh-web-lite-" ]; then
    echo "Skipping $r (target repo)"
    continue
  fi
  cleaned+=("$r")
done
repos=("${cleaned[@]}")

echo "Found ${#repos[@]} repositories to import (excluding this repo)."

for repo in "${repos[@]}"; do
  if [ -z "$repo" ]; then
    continue
  fi
  echo "----"
  echo "Importing: $repo"
  remote_name="import-$repo"
  repo_url="https://$OWNER:$IMPORT_PAT@github.com/$OWNER/$repo.git"

  # Add or update remote
  if git remote get-url "$remote_name" >/dev/null 2>&1; then
    echo "Remote $remote_name already exists. Updating URL and fetching."
    git remote set-url "$remote_name" "$repo_url"
  else
    git remote add "$remote_name" "$repo_url"
  fi

  # Fetch and handle errors gracefully
  if ! git fetch "$remote_name" --tags --prune; then
    echo "Warning: git fetch for $remote_name failed. Skipping $repo."
    continue
  fi

  # Detect remote branch
  branch_ref=""
  if git ls-remote --heads "$remote_name" | grep -q "refs/heads/main"; then
    branch_ref="main"
  elif git ls-remote --heads "$remote_name" | grep -q "refs/heads/master"; then
    branch_ref="master"
  else
    default_branch=$(curl -s -H "Authorization: token $IMPORT_PAT" "https://api.github.com/repos/$OWNER/$repo" | jq -r .default_branch)
    branch_ref="${default_branch:-main}"
  fi

  echo "Using branch: $branch_ref"

  prefix="$TARGET_DIR/$repo"

  # Ensure prefix directory exists in index if previously added
  if git ls-tree -r --name-only HEAD | grep -q "^$prefix"; then
    echo "Prefix $prefix already exists in repo — attempting subtree pull update (non-fatal)."
    set +e
    git subtree pull --prefix="$prefix" "$remote_name" "$branch_ref" --squash
    rc=$?
    set -e
    if [ $rc -ne 0 ]; then
      echo "Subtree pull failed (rc=$rc). Attempting add with --squash as fallback."
      git subtree add --prefix="$prefix" "$remote_name" "$branch_ref" --squash || echo "Fallback add failed for $repo; skipping."
    fi
  else
    set +e
    git subtree add --prefix="$prefix" "$remote_name" "$branch_ref" --squash
    rc=$?
    set -e
    if [ $rc -ne 0 ]; then
      echo "Subtree add failed (rc=$rc) for $repo. Skipping."
      continue
    fi
  fi

  echo "Imported $repo into $prefix"
done

echo "Import complete. Commit & push if everything looks correct."
