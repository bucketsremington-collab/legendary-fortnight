# Discord Integration Setup Guide

The web app now has **full parity** with the Discord bot for player transactions. When you sign or release a player via the website, it will:

✅ Update the database (`users.team_id`)  
✅ Log to `transaction_history` table  
✅ Sync Discord roles (add/remove team role)  
✅ Post to Discord transactions channel  

## Setup Steps

### 1. Deploy the Discord Role Sync Edge Function

```bash
# Navigate to project root
cd C:\Users\Triston\Downloads\MBASocial

# Deploy the Edge Function to Supabase
supabase functions deploy discord-role-sync
```

### 2. Configure Supabase Secrets

Add the Discord bot token to Supabase Edge Functions:

```bash
supabase secrets set DISCORD_BOT_TOKEN=your_discord_bot_token_here
```

Or via Supabase Dashboard:
1. Go to **Edge Functions** → **Settings**
2. Add secret: `DISCORD_BOT_TOKEN` = `your_bot_token`
3. Add secret: `VITE_MBA_DISCORD_SERVER_ID` = `your_discord_server_id`

### 3. Create Discord Webhook for Transactions Channel

1. In Discord, go to your transactions channel (e.g., `#transactions`)
2. Right-click → **Edit Channel** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it "MBA Web Transactions"
5. Copy the **Webhook URL**

### 4. Update Vercel Environment Variables

Add these to your Vercel project:

```
VITE_DISCORD_TRANSACTIONS_WEBHOOK_URL=your_webhook_url_from_step_3
VITE_MBA_DISCORD_SERVER_ID=your_discord_server_id
```

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

### 5. Redeploy

After adding the environment variables, trigger a redeploy in Vercel.

## How It Works

### When a coach signs a player via the website:

1. **Database Update**: `users.team_id` is set to the team ID
2. **Transaction Log**: Record added to `transaction_history` table:
   ```sql
   {
     guild_id: "your_server_id",
     transaction_type: "sign",
     player_id: "discord-123456789",
     from_team_id: null,
     to_team_id: "team_uuid",
     performed_by: "coach_id",
     notes: "Player signed via web app",
     created_at: "2025-12-22T..."
   }
   ```
3. **Discord Role Sync**: Edge Function calls Discord API to add team role
4. **Channel Notification**: Webhook posts embed to transactions channel

### When a coach releases a player:

Same process, but:
- `from_team_id` is set, `to_team_id` is null
- Discord role is **removed**
- Embed shows "📤 Player Released"

## Database Schema

The web app now uses the same `transaction_history` table as the Discord bot:

```sql
CREATE TABLE transaction_history (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'sign', 'release', 'trade', 'demand'
    player_id TEXT NOT NULL,
    from_team_id BIGINT REFERENCES teams(id),
    to_team_id BIGINT REFERENCES teams(id),
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Discord roles not syncing?
- Check that `DISCORD_BOT_TOKEN` is set in Supabase secrets
- Verify the bot has "Manage Roles" permission in Discord
- Ensure bot's role is higher than team roles in Discord hierarchy
- Check Edge Function logs: `supabase functions logs discord-role-sync`

### Transactions not posting to Discord?
- Verify `VITE_DISCORD_TRANSACTIONS_WEBHOOK_URL` is set in Vercel
- Check webhook is for the correct channel
- Inspect browser console for webhook errors

### Players don't have `discord_id`?
- Players must log in to the website at least once to link their Discord account
- The `discord_id` field is populated during OAuth login
- Non-authenticated players won't get Discord roles (but transaction still succeeds)

## Testing

1. **Sign a player** via the website
2. Check Discord:
   - Player should have team role
   - Transaction should appear in transactions channel
3. Check Supabase:
   - `users.team_id` should be updated
   - New row in `transaction_history`
4. **Release the player**
5. Check Discord:
   - Player should lose team role
   - Release notification in transactions channel

## Notes

- The Edge Function gracefully handles players not in Discord (returns success with warning)
- Webhook embeds match Discord bot format exactly (same title, color, fields)
- All transactions are logged regardless of Discord sync status
- Roster cap enforcement (10 players) is still enforced before any Discord operations
