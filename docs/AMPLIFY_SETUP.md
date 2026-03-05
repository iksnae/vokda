# Amplify Setup Checklist (Private GitHub Repo)

## 1. Push repo to GitHub

1. Create private repo under `iksnae` (example: `iksnae/vokda`).
2. Add remote:
   - `git remote add origin git@github.com:iksnae/vokda.git`
3. Push initial branch:
   - `git push -u origin main`

## 2. Connect Amplify to GitHub

1. In AWS Amplify Console, choose **Host web app**.
2. Select **GitHub** and authorize AWS Amplify.
3. Pick repository `iksnae/vokda` and branch `main`.
4. Confirm Amplify detects monorepo app root as `apps/web`.
5. Keep repository build spec from `amplify.yml`.

## 3. Configure frontend env vars

For `main` branch in Amplify:

- `PUBLIC_APP_ENV=production`

For preview branches:

- `PUBLIC_APP_ENV=preview`

## 4. Verify deployment

1. Trigger first Amplify build from `main`.
2. Open deployed URL and confirm catalog page loads.
3. Confirm catalog and voice detail routes render with app-owned data.

## 5. Optional hardening

- Add custom domain in Amplify.
- Add backend environment separation when `apps/api` is introduced.
