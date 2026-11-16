# Deployment

One Linux VPS runs the Docker Compose stack in `compose.prod.yml`: Traefik (automatic TLS), web, backend and Postgres. Only ports 80 and 443 are public, and `/api/mcp` is served by the same backend. No GPU or scientific Python environment is needed: the public case bundles ship in the image and the detailed water results are a frozen release mounted read-only.

## Prepare the host

1. Install Git, Docker Engine with Compose v2, Python 3, [uv](https://docs.astral.sh/uv/getting-started/installation/) and the GitHub CLI. Enable Docker at boot. Leave disk space for the images, the database, the previous release and the water release (about 86 MB compressed, plus its extracted copy).
2. Clone the repository into `~/cropilot` and check out the commit to deploy. Keep `.env`, the database volume and the TLS volume on persistent disk.
3. Point the domain at the host and open TCP 80 and 443. Do not expose Postgres, the backend or the Traefik dashboard.
4. Copy `.env.example` to `.env`, `chmod 600 .env`, and set `DOMAIN` (hostname only), `ACME_EMAIL` and the database values. Generate passwords with `openssl rand -hex 32`. Compose derives the production URLs from `DOMAIN`.
5. Authenticate `gh` with read access to this repository, or copy `cropilot-strategies-v1.tar.gz` from the [`models-strategies-v1` release](https://github.com/HomoSapiens-NASA-Challenge/cropilot/releases/tag/models-strategies-v1) to the host.

Then, from the repository root:

```sh
docker compose -f compose.prod.yml config --quiet
scripts/deploy/prepare-strategies.sh            # or: --archive /absolute/path/cropilot-strategies-v1.tar.gz
```

`prepare-strategies.sh` checks the archive and every file against the committed `strategies-release.json` and installs them into the ignored `apps/backend/data/strategies-v1` and `apps/backend/models/strategies-v1`. It refuses to overwrite an altered installation. A changed release needs a new version and manifest. The authenticated crop-map endpoint needs its own release (see [crop-map.md](crop-map.md)); the public case map does not.

## Deploy

Before updating a running deployment, back up the database:

```sh
mkdir -p "$HOME/cropilot-backups" && chmod 700 "$HOME/cropilot-backups"
backup_path="$HOME/cropilot-backups/$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_path"
chmod 600 "$backup_path"
```

Then:

```sh
scripts/deploy/deploy.sh                        # or: --archive /absolute/path/cropilot-strategies-v1.tar.gz
```

`deploy.sh` refuses to run with uncommitted or untracked non-ignored files, so the images only contain reviewed code. It validates the configuration, installs and verifies the water release, builds the images, checks the read-only mounts, waits for the four health checks and runs `scripts/deploy/smoke.py` against the real HTTPS origin: web routes, every public case, private routes answering 401 without a handle, the workspace answering with one, 404 for unknown cases and an MCP initialize, list and call. Migrations run when the backend starts. A nonzero exit means the deployment is not verified.

Repeat the smoke check from another network, then open the site on a desktop and a phone and walk the Pergamino case:

```sh
python3 scripts/deploy/smoke.py --base-url https://YOUR_DOMAIN
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs --tail 100 backend traefik
```

Build the mobile app with `EXPO_PUBLIC_API_URL` set to the same HTTPS origin.

## Assistant key

`OPENAI_API_KEY` is used by chat, transcription and speech, and only by the backend. For a manual deployment, put it in the host's `.env` or in `~/cropilot/.env.openai` (mode 600); `deploy.sh` loads both. Set `ASSISTANT_PUBLIC_ENABLED=true` to enable the paid public assistant. Never run an unredacted `docker compose config`. See [assistant.md](assistant.md) for models and limits.

## Automatic deployment

Optional, after a successful manual deployment. Set the repository variables `DEPLOY_HOST`, `DEPLOY_USER` and `DEPLOY_KNOWN_HOSTS` (verify the host fingerprint with the provider first) and the secrets `DEPLOY_SSH_KEY` and `OPENAI_API_KEY`. On every push to `main` that passes CI, the workflow sends the key over SSH standard input into `~/cropilot/.env.openai`, checks out the tested commit on the host and runs `deploy.sh`. CI does not back up the database: do it by hand before pushing a migration. Updating the GitHub secret does not change a running container until the next deployment.

## Operation and rollback

- Keep the host on for the whole judging window. Services restart after a crash or reboot; rerun the smoke check after a reboot.
- Check the URL, `docker compose ps`, disk space and `docker stats --no-stream` daily. Docker logs rotate at 10 MB × 3 files per service.
- Keep the previous commit, its images, the water release, the database backup and the `letsencrypt` volume. Do not prune images or volumes, and never run `docker compose down -v`.
- Code-only rollback: `git checkout --detach <PREVIOUS_SHA>` and `scripts/deploy/deploy.sh`, then rerun the smoke check.
- If a migration changed the schema incompatibly, stop the backend, restore the backup into a clean database and deploy the matching commit. Do not run Alembic downgrades blindly.
