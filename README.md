# fresh-web-lite

Monorepo that consolidates repositories from the GitHub account `kanarafat54-boop` into a single full-stack, multi-platform web app and mobile package.

This repository includes:
- Next.js + TypeScript-ready scaffold (lightweight starter)
- PWA configuration and Capacitor integration for building installable phone packages
- GitHub Actions workflow and an import script to preserve each source repository's commit history (using git subtree)

Important: To import private repositories with full history the workflow needs a Personal Access Token (PAT) with `repo` scope stored in this repository's secrets as `IMPORT_PAT`.

Quick start
1. Add a repository secret named `IMPORT_PAT` containing a PAT with `repo` scope.
2. In the Actions tab, run the "Import repositories (preserve history)" workflow (workflow_dispatch).
3. After import completes, inspect `projects/` — each repository will be placed under `projects/<repo-name>`.

Mobile packaging
- This scaffold is PWA-first and configured to work with Capacitor to produce native installers.
- See the "Mobile" section below for build commands.

Scaffold status
- This is an automated scaffold. After import, the codebase will require build/test iterations. CI will run and may need secrets for database, S3, etc.

If you want me to proceed with automated fixes and rebuilds, reply and I will iterate.
