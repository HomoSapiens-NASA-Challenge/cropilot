# One-week demo deployment

One Linux VPS runs the existing Docker Compose stack: Traefik, web, auth, backend and Postgres. Only ports 80/443 are public. `/api/mcp` uses the same backend route and origin. No GPU, model training or scientific Python environment is needed: public `case-v1` bundles ship in the image, and detailed historical water results are frozen files.

This is an operator runbook, not evidence of a live deployment. A host, domain and access are required before running it remotely.

## Preflight

1. Install Git, Docker Engine with Compose v2 supporting `up --wait`, Python 3, [uv](https://docs.astral.sh/uv/getting-started/installation/) and GitHub CLI. Enable Docker at boot. Confirm disk headroom for the images, database, previous release and an approximately 86 MB archive plus its extracted copy. Measure actual memory use after starting the stack; no instance sizing has been load-tested.
2. Clone this repository into `~/cropilot` on a dedicated deployment checkout. Check out the reviewed commit SHA. Keep `.env`, database and TLS volumes on persistent disk. Never run `docker compose down -v` during the demo.
3. Point the domain at the host and allow inbound TCP 80/443. Verify the SSH host fingerprint through the provider before saving `DEPLOY_KNOWN_HOSTS`. Do not expose Postgres, auth, backend or the Traefik dashboard.
4. Copy `.env.example` to `.env`, `chmod 600 .env`, and set `DOMAIN` (hostname only), `ACME_EMAIL`, database values and `BETTER_AUTH_SECRET`. Generate passwords with `openssl rand -hex 32`; a hexadecimal database password is safe inside the connection URI. Do not retain the example `cropilot` password. Compose supplies the production URLs from `DOMAIN`.
5. For Google login, set real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and authorize `https://<DOMAIN>/api/auth/callback/google`. For the public-only judging demo, set both Google values to `demo-disabled`: the auth process requires nonempty values, but Google sign-in will not work. Public cases and MCP remain usable without login. A successful health check does not validate Google login.
6. Authenticate `gh` on the host with read access to the release repository, or download `cropilot-strategies-v1.tar.gz` from the [frozen release](https://github.com/HomoSapiens-NASA-Challenge/cropilot/releases/tag/models-strategies-v1) on an authorized machine and securely copy it to the host. No GitHub token enters Docker, the image build or Compose.

From the repository root:

```sh
docker compose -f compose.prod.yml config --quiet
scripts/deploy/prepare-strategies.sh
# Offline alternative: scripts/deploy/prepare-strategies.sh --archive /absolute/path/cropilot-strategies-v1.tar.gz
```

Provisioning reuses the backend's installer and committed `strategies-release.json`: it checks the archive SHA-256 and all 1,173 file hashes, rejects altered existing installations, and writes only the ignored `apps/backend/data/strategies-v1` and `apps/backend/models/strategies-v1` payloads. `uv` installs the ordinary backend dependencies with Python 3.14; it does not create `.venv-models` or execute simulations. Run as the deployment user, with readable files and traversable parent directories. The two Compose mounts are read-only and refuse missing source directories. A changed release requires a new manifest/version; do not patch files in place.

The separate authenticated crop-map endpoint still needs its optional release from [crop-map.md](crop-map.md). It is not required for the public case map, which ships in `case-v1`. Other scientific water inference endpoints are not provisioned by this runbook.

## Deploy and smoke

Record the current commit and take a database backup before updating an existing deployment:

```sh
git rev-parse HEAD
mkdir -p "$HOME/cropilot-backups"
chmod 700 "$HOME/cropilot-backups"
backup_path="$HOME/cropilot-backups/$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose -f compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_path"
chmod 600 "$backup_path"
```

Confirm the backup command succeeded and retain that dated file before updating. The first deployment has no running database to back up.

```sh
scripts/deploy/deploy.sh
# Offline alternative: scripts/deploy/deploy.sh --archive /absolute/path/cropilot-strategies-v1.tar.gz
```

The script first refuses tracked or staged changes and non-ignored untracked files, so Docker cannot include unreviewed application files or migrations. Ignored `.env`, installed assets and environments remain allowed; a refusal leaves local files untouched. It then validates configuration without printing secrets, installs/verifies the frozen assets, builds images, verifies the read-only mounts as the backend container user, and waits up to 180 seconds for all five service health checks. It checks the real HTTPS origin: web routes, every public case, auth health/JWKS, private water returning 401 without credentials, unknown cases returning 404, and MCP initialize/list/call. Certificate and DNS errors fail the check. Database/auth migrations run at container startup. A nonzero exit means deployment is unverified; inspect the services before announcing availability.

Repeat the public check independently, preferably from another network:

```sh
python3 scripts/deploy/smoke.py --base-url https://YOUR_DOMAIN
docker compose -f compose.prod.yml ps
docker compose -f compose.prod.yml logs --tail 100 backend auth traefik
```

Then open the site on desktop and a real phone, follow the Pergamino case through Years, Strategies and Map, and compare rotation/water views. Set the mobile build's `EXPO_PUBLIC_API_URL` to this same HTTPS origin before building it. If login is enabled, sign in with a real test account and inspect `/api/water/strategies` and one returned run ID with that account's JWT. Do not paste tokens into logs or this repository. The automated check deliberately tests the unauthenticated boundary; the container verification covers the mounted water payload.

Automatic deployment is opt-in: set repository variables `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KNOWN_HOSTS` and secrets `DEPLOY_SSH_KEY` and `OPENAI_API_KEY` only after a successful manual deployment. CI waits for application and scientific checks, refuses tracked/staged changes and non-ignored untracked files before checkout, fetches the tested commit, checks out that exact SHA and runs the same deployment script. The script repeats the clean-source check before provisioning and building. Neither check deletes files; ignored `.env` and installed assets remain allowed. An existing installation is verified without downloading again; retain release read access for future versions. Take a database backup before a push that changes migrations: CI does not make one automatically. During the judging week, leave automatic deployment disabled unless an update is needed.

### Assistant and voice credentials

`OPENAI_API_KEY` is a repository Actions secret, shared by text, transcription and speech.
It is not a `VITE_` or `EXPO_PUBLIC_` variable and is not used by PR checks or image builds.
The deployment job sends it through encrypted SSH standard input and writes the ignored
`~/cropilot/.env.openai` with mode `600`. `deploy.sh` loads `.env`, then this optional
secret file, and Compose passes the key only to the backend. Environment variables take
precedence. Never run an unredacted `docker compose config` or enable shell tracing.

For the first manual deployment, securely provision `OPENAI_API_KEY` in the host's `.env`
or `.env.openai`; do not put its value in shell history. Set `ASSISTANT_PUBLIC_ENABLED=true`
in `.env` to enable the paid public demo. Model defaults and request budget are documented
in [assistant.md](assistant.md). After rotation, update the Actions secret and redeploy;
updating a GitHub secret alone does not change a running container. The public smoke test
does not incur paid model calls: separately verify one text and one voice turn on HTTPS.

As of the local verification on 2026-11-15, the OpenAI repository secret is configured;
no deployment host or `DEPLOY_*` variables were configured. These changes do not provision
a VPS, domain or publicly reachable service.

## Seven days and rollback

- Keep the VPS/account active and the machine on for the full judging window. Disable scheduled shutdown and leave DNS unchanged. Docker services restart after crashes/reboots; an unhealthy-but-running container is reported unhealthy, not automatically restarted. Check the smoke result after any reboot.
- Check the URL, `compose ps`, disk space and `docker stats --no-stream` daily and after any update. Docker logs rotate at 10 MB × 3 files per service. Logs, database and image layers still need disk headroom. No external monitoring or uptime guarantee is configured.
- Retain the previous commit, images, immutable assets, database backup and `letsencrypt` volume. Do not prune images/volumes during the week. Save the TLS volume with the host backup so a rebuild does not needlessly request new certificates.
- To roll back a code-only update with compatible migrations: `git checkout --detach <PREVIOUS_SHA>`, then `scripts/deploy/deploy.sh`. Re-run the external smoke and phone flow. If that old commit predates these scripts, use its deployment instructions and the current smoke script saved outside the checkout.
- If database migrations changed incompatibly, restoring code alone is insufficient. Schedule an interruption, stop backend/auth, restore the pre-deployment Postgres backup into a clean database using the corresponding previous schema, and deploy the matching commit. Restore deliberately with the operator; do not blindly run Alembic downgrade or delete volumes. This change introduces no schema migration.

Codex (OpenAI) assisted with the deployment configuration, verification scripts and runbook. No new datasets, pretrained models or third-party code were added here; provisioning reuses the already attributed frozen Cropilot water release.
