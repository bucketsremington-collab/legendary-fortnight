# Deploy Park Stats Edge Function

Since the Supabase CLI requires a specific installation method, you can deploy the Edge Function via the Supabase Dashboard:

## Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://supabase.com/dashboard/project/fsgxoaocntphqnrzuhqe

2. Navigate to **Edge Functions** in the left sidebar

3. Click **"Create a new function"**

4. Name it: `park-stats`

5. Copy the code from `supabase/functions/park-stats/index.ts` and paste it into the editor

6. Click **"Deploy function"**

7. The function URL will be: `https://fsgxoaocntphqnrzuhqe.supabase.co/functions/v1/park-stats`

## Option 2: Install Supabase CLI (Windows)

Use Scoop or download the binary:

### Using Scoop:
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Or download directly:
https://github.com/supabase/cli/releases

Then run:
```bash
supabase login
supabase link --project-ref fsgxoaocntphqnrzuhqe
supabase functions deploy park-stats
```

## Testing the Function

Once deployed, test it with curl or in your browser:

```bash
# Test with a player UUID
curl "https://fsgxoaocntphqnrzuhqe.supabase.co/functions/v1/park-stats/rred4?season=1"
```

## Important: Verify MySQL Table Schema

Before the function will work, you need to verify the actual table name and columns in your MySQL database. 

The current code assumes:
- Table name: `player_stats`
- Columns match the enum names (SEASON_1_WINS, SEASON_1_POINTS, etc.)

You may need to adjust the SQL query in the Edge Function to match your actual schema.

## Security: Move Credentials to Secrets

After testing, move the database credentials to Supabase Secrets for security:

1. In Supabase Dashboard, go to **Settings** → **Edge Functions** → **Secrets**

2. Add these secrets:
   - `MYSQL_HOST` = sql1.revivenode.com
   - `MYSQL_USER` = u33066_lxlvlVUN8X  
   - `MYSQL_PASSWORD` = =j22tJcO3+=vXg@jFNSzma6L
   - `MYSQL_DB` = s33066_MBA

3. Update the Edge Function code to use `Deno.env.get('MYSQL_HOST')` instead of hardcoded values

## Next Steps

1. Deploy the Edge Function
2. Test it with a known player UUID
3. Check the Profile page to see park stats appear
4. Adjust the SQL query if needed based on your actual table schema
