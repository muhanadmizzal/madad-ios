# MADAD Local Runtime

## What this adds

- A standalone `local-runtime/` backend for offline-first local deployment
- SQLite-backed multi-user local access over LAN
- Local mode switching in the existing frontend without duplicating the UI
- Sync pull/push scaffolding for cloud re-connection

## Folder structure

```text
local-runtime/
  src/
    auth.js
    config.js
    database.js
    query-engine.js
    server.js
    sync-engine.js
  Dockerfile
  package.json
```

## Run locally

```bash
docker compose --env-file .env.local up --build
```

Frontend:
- `http://localhost:3000`

API:
- `http://localhost:4000/health`

## LAN access

1. Find the host machine IP, for example `192.168.1.20`.
2. Open `http://192.168.1.20:3000` from another device on the same network.
3. In Settings -> `Local Runtime`, set the local API base URL to `http://192.168.1.20:4000`.

## Default local credentials

- Email: `admin@local.madad`
- Password: `local-admin`

## Activation and sync

- Activate the local node with `POST /api/activation/activate`
- Sync status is available at `GET /api/sync/status`
- Pull and push endpoints are exposed at `POST /api/sync/pull` and `POST /api/sync/push`
- Configure `CLOUD_SYNC_URL` and `CLOUD_SYNC_API_KEY` in Docker to connect back to cloud services

## Notes

- Cloud mode remains available because the frontend still keeps the original Supabase configuration.
- Local mode swaps the client implementation at runtime based on the settings toggle.
- SQLite is embedded in the local API service, so a separate database container is not required.
