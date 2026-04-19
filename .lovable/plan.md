
The user is asking where `CLOUD_API_URL` is — likely the URL distributed local servers should POST to for the offline sync endpoint we just created.

The sync endpoint is a Supabase Edge Function deployed at:
`https://ejgvvgraxbsswguvdgpa.supabase.co/functions/v1/sync-events`

This is the value local servers should use as `CLOUD_API_URL`. There's no separate env var — it's derived from the Supabase project URL + function name.

## Answer

`CLOUD_API_URL` is not a stored secret — it's the public URL of the deployed `sync-events` Edge Function. Configure it on each local server as:

```
CLOUD_API_URL=https://ejgvvgraxbsswguvdgpa.supabase.co/functions/v1/sync-events
```

### How local servers call it
```bash
curl -X POST https://ejgvvgraxbsswguvdgpa.supabase.co/functions/v1/sync-events \
  -H "Authorization: Bearer <API_KEY from Integrations page>" \
  -H "Content-Type: application/json" \
  -d '{ "tenant_id": "...", "events": [ ... ] }'
```

### Where to get the API key
Tenant Admin → **Integrations** page (`/integrations`) → "مفاتيح API" → click **إنشاء مفتاح**. Copy the `tmk_...` token (shown once) and set it as `CLOUD_API_KEY` on the local server.

### Optional: expose it in the UI
If you'd like, I can add a "Sync Endpoint" panel to the Integrations page that displays the full `CLOUD_API_URL` with a copy button, plus a sample curl/JSON snippet — so tenants can configure their offline servers without leaving the portal.
