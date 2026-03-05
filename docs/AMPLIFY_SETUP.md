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
- `PUBLIC_CATALOG_INDEX_URL=https://<your-cdn-or-s3-url>/catalog/voices.json`

For preview branches:

- `PUBLIC_APP_ENV=preview`
- `PUBLIC_CATALOG_INDEX_URL` set to preview/dev catalog URL

## 4. S3 and CORS baseline

1. Create S3 bucket for catalog/sample artifacts.
2. Upload `catalog/voices.json`.
3. Add CORS policy allowing your Amplify domain(s) to GET JSON/audio assets.

## 5. Verify deployment

1. Trigger first Amplify build from `main`.
2. Open deployed URL and confirm catalog page loads.
3. Validate browser network request to `PUBLIC_CATALOG_INDEX_URL` returns HTTP 200.

## 6. Optional hardening

- Add custom domain in Amplify.
- Put CloudFront in front of S3 for assets.
- Restrict S3 access pattern by prefix and bucket policy.
