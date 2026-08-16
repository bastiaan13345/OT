# Infini beta operations

The beta deployment is a single stateful Node process. Build an immutable image, mount a durable `/data` volume, bind the app to loopback, and put TLS plus an identity allowlist in front of it. Do not expose port 3000 directly to the internet.

## First deployment

1. Create the host directories first (`mkdir -p backups`) and ensure the container user can write `backups/`. Copy `.env.example` to a secrets-managed `.env.production` and replace every example value. `NEXTAUTH_URL` must be the final HTTPS origin, `NEXTAUTH_SECRET` must be at least 32 random characters, and `SUPPORT_EMAIL` must be monitored.
2. Set `INFINI_IMAGE` to an immutable commit tag (or a registry digest), then build and start it: `INFINI_IMAGE=infini:<commit> docker compose -f compose.beta.yml up -d --build`.
3. Confirm `GET /api/health` returns `{"status":"ok"}` through the host proxy.
4. Provision the first admin explicitly:

   ```sh
   docker compose -f compose.beta.yml exec -T \
     -e PROVISION_EMAIL='admin@example.com' \
     -e PROVISION_NAME='Infini operator' \
     -e PROVISION_PASSWORD='use-a-unique-password' \
     -e PROVISION_ROLE='ADMIN' \
     infini npm run user:provision
   ```

5. Provision each beta creator in the same way with `PROVISION_ROLE=CREATOR`. Browser registration creates listeners only. Re-running provisioning resets the password and invalidates the account's existing sessions on their next request.

The compose service intentionally binds to `127.0.0.1`. Configure the host ingress with HTTPS, request body limits of at least 320 MB, login/signup/upload rate limits, and access logs with credentials redacted. The open-beta exception may waive the invited-user allowlist only when the waiver is recorded in `release-record.json` with an owner and timestamp.

## Backups and restore drill

Create the host `backups/` directory and sync it to off-host storage. A backup is a short planned outage: the runtime owns an exclusive `/data` lock so the database snapshot and media archive cannot race an upload or deletion. Stop the service, run a one-off backup container against the same volumes, then restart:

```sh
INFINI_IMAGE=infini:<commit> docker compose -f compose.beta.yml stop infini
INFINI_IMAGE=infini:<commit> docker compose -f compose.beta.yml run --rm --no-deps \
  --entrypoint /app/scripts/backup-data.sh \
  -e BACKUP_DIR=/backups \
  -e BACKUP_RECIPIENT='age1replacewithyourpublickey' \
  infini
INFINI_IMAGE=infini:<commit> docker compose -f compose.beta.yml start infini
```

The backup command refuses to run while any Infini runtime owns `/data`. Retain at least 14 encrypted daily copies and their `.sha256` files, and verify the checksum after every off-host transfer.

To test restoration, use a new empty Docker volume and an age identity matching the recipient. Never mount the live data volume as the restore target:

```sh
docker volume create infini-restore
docker run --rm \
  --entrypoint /app/scripts/restore-data.sh \
  -e DATA_DIR=/restore \
  -e BACKUP_FILE=/backups/infini-20260810T120000Z.tar.gz.age \
  -e BACKUP_IDENTITY=/keys/infini-backup.txt \
  -v infini-restore:/restore \
  -v "$PWD/backups:/backups:ro" \
  -v /secure/keys:/keys:ro \
  infini:<commit>
```

Start the same image against the restored directory, wait for migrations and `/api/health`, then stream a known track and inspect its cover. The restore target must be separate from live `/data`; the script refuses to populate a non-empty directory.

## Release and rollback

Run `npm run release:check` and `npm run release:container` in CI or on the release host. The container gate builds a clean image, migrates an empty volume, checks health, proves that a live backup is rejected, then performs an encrypted checksum-verified restore. Publish the resulting image by commit tag and record its registry digest. Take a backup before any schema migration, deploy one instance, and wait for the health check before allowing traffic.

The application writes structured upload, processing, cleanup, health, and startup events to stdout/stderr. Configure ingress access logs with a request ID and pass it as `X-Request-ID`; upload events include that ID. The Compose defaults cap the single process at two CPUs, 2 GiB of memory, 256 PIDs, and four concurrent server-side upload/audio-processing jobs.

Install `scripts/monitor-host.sh` as a five-minute host job. Set its `INFINI_CONTAINER_NAME`, `INFINI_PUBLIC_URL`, and `INFINI_BACKUP_DIR` values for the host. It fails when the container, loopback health, or public HTTPS health is unavailable; `/data` has less than 10 GiB free; the newest encrypted backup fails its checksum; or the downloaded, byte-matched off-host copy is older than 36 hours. The job writes JSON lines to `~/Library/Logs/Infini/monitor.log` and raises a host notification on failure and recovery transitions. Cloudflare tunnel and passive-origin notification policies provide the independent email path; test or otherwise verify delivery before publication.

Keep the previous image available. Roll back the image only when its Prisma schema is compatible with the migrated database. A database restore is a planned outage procedure and must use a verified backup, never an automatic container restart.

## Beta limitations

Password recovery and account deletion are support-assisted during this beta. Content removal requests go to the configured support address. Do not invite users until the privacy notice, terms, support ownership, and content-removal process have been reviewed.

An open beta may intentionally waive the identity allowlist, legal review, and invite-list gates only when the operator records that exception, its owner, timestamp, and rationale in `release-record.json`. The exception does not waive HTTPS, rate limits, monitoring, backup, restore, credential rotation, or immutable-image requirements.
