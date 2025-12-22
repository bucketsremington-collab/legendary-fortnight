# Park Stats MySQL Integration

## Overview
This integration connects the MBA website to the MySQL database containing rec/park game stats.

## Database Schema
- **Host**: sql1.revivenode.com:3306
- **Database**: s33066_MBA
- **Table**: `player_stats` (assumed)

### Columns:
- `player_uuid` - Minecraft UUID
- `player_name` - Player name
- `SEASON_1_WINS`, `SEASON_1_LOSSES`, `SEASON_1_GAMES_PLAYED`
- `SEASON_1_POINTS`, `SEASON_1_ASSISTS`, `SEASON_1_REBOUNDS`
- `SEASON_1_STEALS`, `SEASON_1_BLOCKS`, `SEASON_1_TURNOVERS`
- `SEASON_1_FG_MADE`, `SEASON_1_FG_ATTEMPTED`
- `SEASON_1_3FG_MADE`, `SEASON_1_3FG_ATTEMPTED`, `SEASON_1_THREES`

## Setup Instructions

### 1. Deploy Supabase Edge Function

First, install the Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Login to Supabase:
```bash
supabase login
```

Link your project:
```bash
supabase link --project-ref <your-project-ref>
```

Deploy the function:
```bash
supabase functions deploy park-stats
```

### 2. Set Environment Variable

Add the Edge Function URL to your `.env` file:
```
VITE_PARK_STATS_API=https://<your-project-ref>.supabase.co/functions/v1/park-stats
```

### 3. Usage in Code

Import the component on any profile page:
```tsx
import ParkStatsDisplay from '../components/ParkStatsDisplay';

// In your component:
<ParkStatsDisplay user={user} season={1} />
```

## Features

- **Averages/Totals Toggle**: Users can switch between per-game averages and total stats
- **Win/Loss Record**: Displays wins, losses, and win percentage
- **Comprehensive Stats**: Points, assists, rebounds, steals, blocks, turnovers, FG%, 3P%
- **Season Support**: Can query different seasons (Season 1, Season 2, etc.)

## Security Notes

**IMPORTANT**: The database credentials are currently hardcoded in the Edge Function. For production:

1. Move credentials to Supabase Secrets:
```bash
supabase secrets set MYSQL_HOST=sql1.revivenode.com
supabase secrets set MYSQL_USER=u33066_lxlvlVUN8X
supabase secrets set MYSQL_PASSWORD="=j22tJcO3+=vXg@jFNSzma6L"
supabase secrets set MYSQL_DB=s33066_MBA
```

2. Update the Edge Function to use secrets:
```typescript
const client = await new Client().connect({
  hostname: Deno.env.get('MYSQL_HOST'),
  username: Deno.env.get('MYSQL_USER'),
  password: Deno.env.get('MYSQL_PASSWORD'),
  db: Deno.env.get('MYSQL_DB'),
  port: 3306,
})
```

## TODO

- [ ] Verify table name and schema in MySQL database
- [ ] Add support for multiple seasons (dynamic column selection)
- [ ] Create leaderboard endpoint for top players
- [ ] Add UUID lookup service (minecraft username → UUID)
- [ ] Implement caching to reduce MySQL queries
- [ ] Add error handling for missing players
