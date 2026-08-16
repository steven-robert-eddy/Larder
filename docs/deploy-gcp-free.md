# Deploying Larder for free (GCP e2-micro + Cloudflare R2)

Gets Larder running on a real, always-on server reachable from your
phone anywhere — no VPS bill, no domain purchase. Two free accounts do
the work:

- **Google Cloud** — one `e2-micro` VM, permanently free (their "Always
  Free" tier, not a trial).
- **Cloudflare R2** — object storage for recipe photos, permanently free
  up to 10GB.

Photo bytes never touch the VM: the browser uploads straight to R2 via a
presigned URL, and photos are served straight from R2's public URL. That
matters because the free VM's network egress is capped at 1GB/month —
keeping photos off it is what makes that limit a non-issue.

Total cost: **$0/month**, as long as you stay within the free tiers
(very likely for one person's recipe library).

---

## 1. Create the GCP VM

1. Sign up at [cloud.google.com](https://cloud.google.com) if you haven't
   (a card is required for identity verification, but the Always Free
   tier genuinely doesn't charge it unless you explicitly upgrade).
2. Create a project.
3. **Compute Engine → VM instances → Create instance:**
   - Name: `larder`
   - Region: **us-central1**, **us-west1**, or **us-east1** — only these
     three qualify for the free e2-micro.
   - Machine type: `e2-micro`
   - Boot disk: Debian 12 or Ubuntu 22.04, up to 30GB (still free)
   - Under **Firewall**, check **Allow HTTP traffic** and **Allow HTTPS
     traffic**.
   - Create.
4. **Reserve a static IP** so it doesn't change on reboot: VPC network →
   IP addresses → Reserve external static address → attach it to the
   `larder` VM. (Free as long as it stays attached to a running
   instance.)

Note the VM's external IP — you'll need it below.

## 2. Set up the VM

Open a shell via the GCP Console's **SSH** button (easiest — no key
setup needed), then:

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Swap — e2-micro's 1GB RAM is tight; 2GB of swap is cheap insurance
# against an OOM kill under load.
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Set up Cloudflare R2

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2 Object
   Storage** → Create bucket → name it `larder-photos`.
2. Open the bucket → **Settings** → under **Public Access**, enable the
   **R2.dev subdomain**. Copy the resulting URL
   (`https://pub-xxxxxxxx.r2.dev`) — that's `S3_PUBLIC_URL`.
3. **R2 → Manage API tokens → Create API token** — permission "Object
   Read & Write", scoped to the `larder-photos` bucket. Copy the
   **Access Key ID** and **Secret Access Key** — you won't see the
   secret again.
4. On the R2 overview page, copy your **Account ID**. Your endpoint is:
   ```
   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   ```

## 4. Build the image

Already wired up: `.github/workflows/deploy-image.yml` builds the
Dockerfile and pushes it to `ghcr.io/<you>/<repo>` on every push to
`main`. Push this branch's changes to `main` (or merge the PR) once and
check the **Actions** tab for a green run.

If the repo is private, the resulting package is private too — the VM
would need a token to pull it. Easiest fix: on GitHub, go to the
package's page (linked from the Actions run) → **Package settings** →
change visibility to **Public**. It's just compiled app code (no
secrets are baked into the image — `.env` is excluded via
`.dockerignore`), so this is safe.

## 5. Deploy on the VM

Back in the VM's SSH session:

```bash
git clone https://github.com/<you>/<repo>.git larder
cd larder
cp .env.production.example .env
nano .env   # fill in every value — see below
```

What goes in `.env`:

| Variable | Where it comes from |
|---|---|
| `APP_IMAGE` | `ghcr.io/<you>/<repo>:latest` (lowercase) |
| `DOMAIN` | `<your-VM's-static-IP>.sslip.io`, e.g. `34.123.45.67.sslip.io` — resolves automatically, no signup, and Caddy will get it a real Let's Encrypt certificate |
| `POSTGRES_PASSWORD` | anything random — e.g. `openssl rand -hex 16` |
| `AUTH_SECRET` | `openssl rand -base64 33` |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` from step 3 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | the R2 API token from step 3 |
| `S3_PUBLIC_URL` | the `pub-xxxxxxxx.r2.dev` URL from step 3 |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | your login — change the password after first sign-in by re-running the seed |

Then:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec app node_modules/.bin/prisma db seed   # first time only
```

The `app` container runs `prisma migrate deploy` automatically on every
start (see `docker-entrypoint.sh`), so schema updates just need a
redeploy, not a manual step.

Visit `https://<DOMAIN>` — Caddy will take a few seconds on first
request to provision the certificate. On your phone, open the same URL
and use "Add to Home Screen" to install it.

## Redeploying after code changes

```bash
# after pushing to main and the Actions build finishes:
docker compose -f docker-compose.prod.yml pull app
docker compose -f docker-compose.prod.yml up -d app
```

## Staying within the free tier

- **GCP**: one `e2-micro`, one of the three free regions, ≤30GB disk,
  ≤1GB egress/month. Photo traffic doesn't count against this (it goes
  straight to R2), so this is mainly just page loads — very unlikely to
  matter for one person.
- **R2**: 10GB storage, 1M Class A + 10M Class B operations/month, and
  R2 charges **no egress fees ever**, free tier or not.

## Not covered yet

- **Backups.** This VM's Postgres volume is the only copy of your
  recipes. A nightly `pg_dump` to R2 is cheap to add and worth doing
  before this becomes your only copy of a few hundred recipes — see
  design doc section 13, still an open decision.
- **A friendlier domain.** `sslip.io` works but isn't memorable — if you
  register a real domain later, point it at the static IP and swap
  `DOMAIN` in `.env`.
