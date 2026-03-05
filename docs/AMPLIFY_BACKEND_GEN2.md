# Amplify Gen 2 Backend Setup (Auth + Data)

This project now includes Amplify Gen 2 backend definitions in `amplify/`.

## Included Resources

- Auth: Cognito user pool with groups
  - `guest`
  - `curator`
  - `admin`
- Data: AppSync + DynamoDB models for favorites, collections, curation shelves, and admin audit.

Files:

- `amplify/backend.ts`
- `amplify/auth/resource.ts`
- `amplify/data/resource.ts`

## 1. Provision Backend (Local Sandbox)

From repo root:

1. `npm install`
2. `npm run amplify:sandbox`

This will provision a temporary Amplify backend environment and output connection details.

## 2. Generate Outputs

From repo root:

1. `npm run amplify:outputs`

This generates `amplify_outputs.json` in the repository root.

## 3. Configure Amplify Hosted Web App

In Amplify Hosting env vars for `apps/web`:

- `PUBLIC_AUTH_MODE=amplify`
- `PUBLIC_COGNITO_DOMAIN=https://<domain>.auth.<region>.amazoncognito.com`
- `PUBLIC_COGNITO_CLIENT_ID=<app-client-id>`
- `PUBLIC_COGNITO_REDIRECT_SIGN_IN=https://<app-domain>/account`
- `PUBLIC_COGNITO_REDIRECT_SIGN_OUT=https://<app-domain>/`

## 4. Group Mapping

Add users to Cognito groups:

- `guest` for registered baseline users
- `curator` for curation workflows
- `admin` for administrative controls

Role semantics in app:

- `visitor`: unauthenticated
- `guest`: authenticated baseline
- `curator`: privileged curation access
- `admin`: full platform access

## 5. Data Models

Defined models:

- `Favorite`
- `Collection`
- `CollectionVoice`
- `CartItem`
- `CurationShelf`
- `AdminAuditEvent`

Authorization highlights:

- Owner-based access for personal data (`Favorite`, `Collection`, `CollectionVoice`, `CartItem`)
- Group-based elevated access for curation/admin data
- Optional API key read access for published `CurationShelf`

## 6. Next Integration Step

Current web app still uses local user-scoped storage for favorites/collections/cart.

Next task: replace local persistence with Amplify Data client operations against the models above.
