#!/usr/bin/env bash
set -euo pipefail

if [ -z "${IMPORT_PAT:-}" ]; then
  echo "ERROR: IMPORT_PAT environment variable is not set. Set repository secret IMPORT_PAT to a personal access token with repo scope."
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
  names=$(echo "$resp" | jq -r '.[].name')
  if [ -z "$names" ]; then
    break
  fi
  while read -r name; do
    repos+=("$name")
  done <<< "$names"
  page=$((page+1))
done

# Remove this repo from list
repos=("${repos[@]/fresh-web-lite/}")

echo "Found ${#repos[@]} repositories to import (excluding this repo)."

for repo in "${repos[@]}"; do
  if [ -z "$repo" ]; then
    continue
  fi
  echo "----"
  echo "Importing: $repo"
  remote_name="import-$repo"
  repo_url="https://$OWNER:$IMPORT_PAT@github.com/$OWNER/$repo.git"

  if git remote get-url "$remote_name" >/dev/null 2>&1; then
    echo "Remote $remote_name already exists, skipping remote add"
  else
    git remote add "$remote_name" "$repo_url"
  fi

  git fetch "$remote_name" --tags --prune

  # Try main then master
  if git show-ref --quiet refs/remotes/$remote_name/main; then
    branch_ref="main"
  elif git show-ref --quiet refs/remotes/$remote_name/master; then
    branch_ref="master"
  else
    # fallback: use remote's default branch via API
    default_branch=$(curl -s -H "Authorization: token $IMPORT_PAT" "https://api.github.com/repos/$OWNER/$repo" | jq -r .default_branch)
    branch_ref="${default_branch:-main}"
  fi

  echo "Using branch: $branch_ref"

  prefix="$TARGET_DIR/$repo"

  # If subtree already present, skip
  if git ls-tree -r --name-only HEAD | grep -q "^$prefix"; then
    echo "Prefix $prefix already exists in repo — attempting subtree merge update"
    set +e
    git subtree pull --prefix="$prefix" "$remote_name" "$branch_ref" --squash
    rc=$?
    set -e
    if [ $rc -ne 0 ]; then
      echo "Subtree pull failed, attempting add with --squash"
      git subtree add --prefix="$prefix" "$remote_name" "$branch_ref" --squash || true
    fi
  else
    git subtree add --prefix="$prefix" "$remote_name" "$branch_ref" --squash || true
  fi

  echo "Imported $repo into $prefix"
done

echo "Import complete. Commit & push if everything looks correct."
