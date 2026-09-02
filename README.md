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

The quickest path is the guided script. It creates the D1 database, writes `.env`, builds, applies migrations, stores the four Worker secrets, and prints the values you need for GitHub:

```bash
npx wrangler login
./scripts/setup-cloudflare.sh
```

It is safe to re-run; an existing database is reused rather than duplicated. To do the same steps by hand:

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

### Find your account ID

Open the [Workers & Pages dashboard](https://dash.cloudflare.com/?to=/:account/workers) and copy **Account ID** from the right-hand sidebar. It is a 32-character hex string. The account ID is an identifier, not a credential, but there is no reason to publish it.

From the terminal, `npx wrangler whoami` prints the same value.

### Create the API token

1. Go to [My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) and choose **Create Token**.
2. Scroll to **Custom token** and choose **Get started**. The `Edit Cloudflare Workers` template does not include D1, so a custom token is the correct choice here.
3. Give it a recognisable name, for example `sd5913-registry-deploy`.
4. Add exactly these permissions:

   | Type | Resource | Access |
   | --- | --- | --- |
   | Account | Workers Scripts | Edit |
   | Account | D1 | Edit |

5. Under **Account Resources**, select **Include** and then the single account you deploy to. Leave **Zone Resources** unset.
6. Optionally restrict **TTL** to the length of the semester.
7. **Continue to summary**, then **Create Token**.
8. Copy the token now. Cloudflare shows it exactly once.

The token can deploy Workers and write to every D1 database on that account, so treat it as a credential: paste it straight into GitHub and do not store it in a file, a chat message, or the repository.

### Add the secrets and variables

Create a GitHub environment named `production` under **Settings → Environments → New environment**, then add:

| Type | Name | Value |
| --- | --- | --- |
| Environment secret | `CLOUDFLARE_API_TOKEN` | The token created above |
| Environment secret | `CLOUDFLARE_ACCOUNT_ID` | Your 32-character account ID |
| Environment variable | `CLOUDFLARE_D1_DATABASE_ID` | The ID returned by `wrangler d1 create` |
| Environment variable | `NEXT_PUBLIC_SITE_URL` | The final HTTPS URL, without a trailing slash |

Secrets go under **Environment secrets** and variables under **Environment variables**; the workflow reads them as `secrets.*` and `vars.*` respectively, so a value added in the wrong place fails the `Verify configuration` step.

The GitHub OAuth credentials and `SESSION_SECRET` / `ADMIN_TOKEN` remain Cloudflare Worker secrets. Add them once using the commands in the first-time setup section; the deployment workflow does not copy application secrets through GitHub.

### Rotating or revoking

Roll the API token at [API Tokens](https://dash.cloudflare.com/profile/api-tokens) with **Roll** and update the `CLOUDFLARE_API_TOKEN` secret, or **Delete** it to cut off deployment access immediately. Rotate a Worker secret by running `wrangler secret put` again with the new value; the change takes effect on the next request without a redeploy.

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
