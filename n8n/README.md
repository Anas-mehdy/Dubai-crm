# n8n Workflows — Dubai CRM × Evolution API

## Overview

Three workflows power the WhatsApp automation:

| File | Purpose | Trigger |
|------|---------|---------|
| `workflow-campaign-sender.json` | Sends campaign messages to leads | CRM webhook (Launch button) |
| `workflow-campaign-receipts.json` | Updates delivery stats from Evolution API | Evolution API delivery webhook |
| `workflow-incoming-message.json` | Handles inbound replies, runs AI qualification | Evolution API message webhook |

---

## Setup Steps

### 1. Supabase — Run Helper Functions
Go to **Supabase SQL Editor** and run `supabase/campaign-functions.sql`.
This creates the `increment_campaign_sent` and `increment_campaign_stat` RPC functions.

---

### 2. n8n — Configure Variables
Go to **n8n Settings → Variables** and add:

| Variable | Value |
|----------|-------|
| `EVOLUTION_API_URL` | `https://your-evolution-instance.com` |
| `EVOLUTION_INSTANCE` | Your Evolution instance name (e.g. `dubai-crm`) |
| `EVOLUTION_API_KEY` | Your Evolution API key |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase `anon` key |

---

### 3. n8n — Import Workflows
1. Open n8n → **Workflows → Import**
2. Import each `.json` file
3. Activate all three workflows
4. Copy the webhook URLs from each workflow

---

### 4. Evolution API — Configure Webhooks
In your Evolution API instance settings under the **Webhook** section:

1. **Toggle ON** the **"Webhook by Events"** switch.
2. In the **URL** field, enter your base n8n webhook URL:
   ```text
   https://your-n8n.com/webhook/
   ```
3. Below that, select (check) the following events:
   - `MESSAGES_UPDATE` (for delivery receipts)
   - `MESSAGES_UPSERT` (for inbound messages)
4. Evolution API will automatically route these events to:
   - `https://your-n8n.com/webhook/messages-update` (Receipts)
   - `https://your-n8n.com/webhook/messages-upsert` (Incoming Handler)

---

### 5. CRM — Set Webhook URL in Admin Settings
Go to **CRM → Admin → Settings** and set:
- **Campaign Webhook URL**: `https://your-n8n.com/webhook/campaign-sender`

---

## Data Flow

```
Admin clicks "Launch Campaign" in CRM
  └─► POST /webhook/campaign-sender
        ├─ Fetches campaign from Supabase
        ├─ Validates status = 'active'
        ├─ Fetches leads matching target filters
        ├─ Slices to daily_send_limit (default: 33)
        ├─ For each lead:
        │     ├─ Personalises message ({name} → first name)
        │     ├─ Uses Arabic template if lead.language = 'ar'
        │     ├─ POST to Evolution API /message/sendText
        │     ├─ Logs to messages table (direction: outbound)
        │     ├─ Logs to campaign_leads junction table
        │     └─ Increments campaign.total_sent
        └─ Returns { status, leads_targeted, dry_run }

Evolution API fires delivery webhook
  └─► POST /webhook/whatsapp-receipt
        ├─ Extracts message_id and status (delivered/read/failed)
        ├─ Updates messages.status in Supabase
        ├─ Updates campaign_leads.delivered_at / read_at
        └─ Increments campaign.total_delivered / total_read

Lead replies to WhatsApp
  └─► POST /webhook/whatsapp-incoming
        ├─ Detects language (OpenAI)
        ├─ Runs AI qualification bot
        ├─ Logs message to Supabase
        └─ Alerts agent if score ≥ 80 (HOT lead)
```

---

## Dry Run Mode

To test without sending real WhatsApp messages, call the webhook with `dry_run: true`:

```bash
curl -X POST https://your-n8n.com/webhook/campaign-sender \
  -H "Content-Type: application/json" \
  -d '{ "campaign_id": "YOUR_CAMPAIGN_UUID", "dry_run": true }'
```

The workflow will filter leads and log what it **would** send, but skip the Evolution API call.

---

## Notes

- **Daily limit**: Enforced per campaign launch (`daily_send_limit` column, default 33).
- **A/B variants**: The `variant_label` on the campaign is logged to `campaign_leads.variant` for analysis.
- **Arabic support**: If `lead.language = 'ar'` and `message_template_ar` is set, the Arabic template is used automatically.
- **{name} placeholder**: Replaced with the lead's first name before sending.
