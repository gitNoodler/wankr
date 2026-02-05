---
name: organize-and-push-to-github
description: Organizes a project (structure, naming, conventions), cleans code (lint, format, remove cruft), and prepares/upload to GitHub. Use when the user wants to get the project organized, clean the code, upload to GitHub, or prepare for a first push.
---

# Organize, Clean, and Push to GitHub

Use this skill when helping organize a project, clean its code, and get it onto GitHub. Work through the phases in order; adjust scope based on user preference (e.g. "just GitHub" vs "full cleanup").

## Task Progress Checklist

Copy and track:

```
- [ ] Phase 1: Organize project structure
- [ ] Phase 2: Clean the code
- [ ] Phase 3: Prepare for GitHub
- [ ] Phase 4: Create repo and push
```

---

## Phase 1: Organize Project Structure

1. **Review layout**
   - Identify root clutter (loose scripts, one-off files). Move into logical folders (e.g. `scripts/`, `docs/`) or remove if obsolete.
   - Keep standard roots: app entrypoints, README, config files (.env.example, requirements.txt, package.json), .gitignore.

2. **Naming and consistency**
   - Use lowercase-with-hyphens for dirs/files where the project already does; avoid mixing styles.
   - Ensure asset folders have clear names (e.g. `images_logo_banner_mascot` → consider `assets/` or `static/images/` if it fits the stack).

3. **Sensitive and generated files**
   - Confirm no secrets in repo: `.env` and secret config in `.gitignore`; use `.env.example` with placeholder keys only.
   - Ignore build/output dirs, venv, node_modules, and IDE/OS cruft (already common in .gitignore).

4. **Documentation**
   - Single README at root with: what the project is, how to run it, and any one-time setup (e.g. Infisical). Point to sub-project READMEs (e.g. wankr-backend) if needed.

Do not rename or move files in a way that breaks existing scripts or docs without updating references.

---

## Phase 2: Clean the Code

1. **Lint and format**
   - **Python**: Run formatter (e.g. black, ruff format) and linter (ruff or flake8). Fix or agree to ignore specific rules.
   - **JavaScript/Node**: Run formatter (e.g. prettier) and linter (eslint) in subprojects (e.g. wankr-backend). Fix or document exceptions.

2. **Remove cruft**
   - Delete commented-out blocks, unused imports, and dead code.
   - Remove debug prints or replace with proper logging if needed.
   - Drop duplicate or obsolete files (e.g. old backups, temp scripts).

3. **Consistency**
   - Same quote style and indentation within each language.
   - Consistent error handling and minimal use of bare `except`.

4. **Dependencies**
   - Pin versions in requirements.txt / package.json where appropriate; ensure no stray or unused deps.

Run lint/format from project root or the relevant subfolder; fix issues before moving to Phase 3.

---

## Phase 3: Prepare for GitHub

1. **.gitignore**
   - Must include: `.env`, any secret or local config files, `__pycache__/`, `*.pyc`, `venv/`, `node_modules/`, `.idea/`, `.vscode/`, OS junk (e.g. `.DS_Store`, `Thumbs.db`).
   - Add project-specific ignores (e.g. `training_data.json`, generated outputs).

2. **README**
   - Clear title and one-line description.
   - Prerequisites and one-time setup (e.g. Infisical login/init).
   - How to run (e.g. `infisical run --env=dev -- python app.py` and backend if applicable).
   - Optional: link to backend README, license, contributing.

3. **No secrets**
   - Grep for API keys, passwords, tokens in code and config; ensure they are in env or secret manager only, and that .env is ignored.

4. **Git**
   - If not yet a repo: `git init`.
   - If already a repo: ensure no large or sensitive files are staged; run `git status` and fix .gitignore if needed.

---

## Phase 4: Create Repo and Push

1. **Create GitHub repo**
   - User creates a new repository on GitHub (no README/license if the project already has them).
   - Note the remote URL (HTTPS or SSH).

2. **Initial commit (if none)**
   - `git add .`
   - `git status` — verify nothing sensitive or unwanted.
   - `git commit -m "Initial commit: <short description>"`

3. **Add remote and push**
   - `git remote add origin <url>`
   - `git branch -M main` (if default branch should be main)
   - `git push -u origin main`

4. **Optional**
   - Add branch protection, add a LICENSE file, or set up GitHub Actions for lint/format in a follow-up.

---

## Quick Reference

| Phase   | Focus                          |
|--------|---------------------------------|
| 1      | Structure, naming, docs, no secrets in tree |
| 2      | Lint, format, remove dead code  |
| 3      | .gitignore, README, git sanity  |
| 4      | Create repo, first commit, push |

If the user says "just get it on GitHub", do a minimal pass: ensure .gitignore and README are good, then Phase 4. If they say "full cleanup", work through all phases in order.
