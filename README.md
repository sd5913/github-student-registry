# GitHub Student Registry · SD5913

A Cloudflare Worker that lets students authenticate with GitHub and match that account to a student ID. D1 is the source of truth.

## Included

- GitHub OAuth with public-profile access only (`read:user`)
- Signed, HTTP-only sessions; GitHub access tokens are never stored
- One GitHub account per student ID, enforced by D1 unique indexes
- Self-service updates for returning students
- Instructor-only JSON and CSV exports
- Responsive interface based on the visual language of [ait4x.org](https://ait4x.org)

## First-time Cloudflare setup

You need Node 22+, a Cloudflare account, and a GitHub OAuth App.

1. Install and authenticate:

   ```bash
   npm install
   npx wrangler login
   ```

2. Create the database:

   ```bash
   npx wrangler d1 create github-student-registry
   ```

3. Copy `.env.example` to `.env`. Add the D1 ID returned above and set `NEXT_PUBLIC_SITE_URL` to the final HTTPS address. The build uses these values for the D1 binding and absolute social-preview metadata.

4. Build and migrate:

   ```bash
   npm run build
   npm run db:migrate:remote
   ```

5. Create a GitHub OAuth App under **GitHub → Settings → Developer settings → OAuth Apps**. Use the deployed site as the homepage and this callback URL:

   ```text
   https://YOUR-DOMAIN/api/auth/github/callback
   ```

6. Add the Worker secrets. Generate independent random values for the last two:

   ```bash
   npx wrangler secret put GITHUB_CLIENT_ID --config dist/server/wrangler.json
   npx wrangler secret put GITHUB_CLIENT_SECRET --config dist/server/wrangler.json
   openssl rand -base64 32 | npx wrangler secret put SESSION_SECRET --config dist/server/wrangler.json
   openssl rand -base64 32 | npx wrangler secret put ADMIN_TOKEN --config dist/server/wrangler.json
   ```

7. Deploy:

   ```bash
   npm run deploy
   ```

If the first deploy creates the `workers.dev` address you will keep, update `NEXT_PUBLIC_SITE_URL` with it and deploy once more.

## Local development

Copy `.dev.vars.example` to `.dev.vars` and add development OAuth credentials and random secrets. Set the OAuth callback to `http://localhost:3000/api/auth/github/callback`.

```bash
npm run dev
```

For a local production-style Worker preview:

```bash
npm run build
npm run db:migrate:local
npm start
```

Never commit `.env`, `.dev.vars`, OAuth secrets, or admin tokens.

## Automatic deployment from GitHub

The `Deploy to Cloudflare` workflow runs on every push to `main` and can also be started manually. It checks the code, builds the Worker, applies pending D1 migrations, and deploys.

Create a GitHub environment named `production`, then add:

| Type | Name | Value |
| --- | --- | --- |
| Environment secret | `CLOUDFLARE_API_TOKEN` | A scoped Cloudflare API token with Workers and D1 edit access |
| Environment secret | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| Environment variable | `CLOUDFLARE_D1_DATABASE_ID` | The ID returned by `wrangler d1 create` |
| Environment variable | `NEXT_PUBLIC_SITE_URL` | The final HTTPS URL, without a trailing slash |

The GitHub OAuth credentials and `SESSION_SECRET` / `ADMIN_TOKEN` remain Cloudflare Worker secrets. Add them once using the commands in the first-time setup section; the deployment workflow does not copy application secrets through GitHub.

## Export the class list

Keep `ADMIN_TOKEN` private. Download a spreadsheet-ready CSV with:

```bash
curl -fsS \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://YOUR-DOMAIN/api/admin/registrations?format=csv" \
  -o sd5913-github-students.csv
```

Remove `?format=csv` for JSON. The export includes student ID, GitHub login and numeric ID, profile URL, name, and timestamps.

## Security

- Short-lived OAuth state cookie prevents login CSRF.
- Writes require a signed session and same-origin request.
- Session cookies are `Secure`, `HttpOnly`, and `SameSite=Lax`.
- No email, organization, or repository permissions are requested.
- D1 enforces one-to-one matches under concurrent writes.
- Instructor exports are uncached and require a bearer token.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```
