# GitHub Setup Checklist (`iksnae` private repo)

## 1. Create and push repository

1. Create private repo in GitHub: `iksnae/vokda`.
2. From local project:
   - `git remote add origin git@github.com:iksnae/vokda.git`
   - `git push -u origin main`

## 2. Enable branch protection for `main`

In GitHub repo settings:

1. Go to **Settings > Branches > Add branch protection rule**.
2. Branch name pattern: `main`.
3. Enable:
   - Require a pull request before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include administrators (optional but recommended for solo discipline)

## 3. Required status checks

After first CI run, mark these as required:

- `web-checks`

This job is defined in `.github/workflows/ci.yml`.

## 4. Repository hygiene

In **Settings > General**:

- Disable merge commits if you prefer linear history
- Enable squash merge (recommended for short feature branches)
- Add repo description and topics

## 5. Connect Amplify to GitHub

Follow `docs/AMPLIFY_SETUP.md` after push:

- connect `iksnae/vokda`
- app root `apps/web`
- use `amplify.yml`
- set branch env var (`PUBLIC_APP_ENV`)

## 6. Optional labels and milestones

Create labels for simple personal workflow:

- `scope:mvp`
- `scope:phase2`
- `type:feature`
- `type:bug`
- `type:docs`
