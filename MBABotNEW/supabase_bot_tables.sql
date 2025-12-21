-- =============================================
-- MBA Bot Migration - Works with EXISTING Website Tables
-- =============================================
-- Your existing tables: teams, users, player_stats, games, leaderboards
-- This adds ONLY the bot-specific tables that don't exist yet

-- =============================================
-- BOT CONFIG (Discord server settings)
-- =============================================
CREATE TABLE IF NOT EXISTS server_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT UNIQUE NOT NULL,
    
    -- Role IDs
    franchise_owner_role_id TEXT,
    gm_role_id TEXT,
    head_coach_role_id TEXT,
    assistant_coach_role_id TEXT,
    pickup_host_role_id TEXT,
    streamer_role_id TEXT,
    referee_role_id TEXT,
    free_agent_role_id TEXT,
    autorole_id TEXT,
    
    -- Channel IDs
    lft_channel_id TEXT,
    alerts_channel_id TEXT,
    demands_channel_id TEXT,
    verdicts_channel_id TEXT,
    transactions_channel_id TEXT,
    contracts_channel_id TEXT,
    agency_channel_id TEXT,
    gametimes_channel_id TEXT,
    
    -- Minecraft
    mc_status_channel_id TEXT,
    mc_status_message_id TEXT,
    mc_server_address TEXT DEFAULT '45.126.211.8:8105',
    
    roster_cap INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PLAYER TEAMS (links Discord users to teams)
-- Uses your existing teams table (TEXT id)
-- =============================================
CREATE TABLE IF NOT EXISTS player_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(guild_id, user_id)
);

-- =============================================
-- DEMANDS (trade demands tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    demand_count INTEGER DEFAULT 0,
    season TEXT DEFAULT 'current',
    UNIQUE(guild_id, user_id, season)
);

-- =============================================
-- SAVED ROLES (role persistence on rejoin)
-- =============================================
CREATE TABLE IF NOT EXISTS saved_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_ids TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(guild_id, user_id)
);

-- =============================================
-- INELIGIBLE ROLES (can't be traded/signed)
-- =============================================
CREATE TABLE IF NOT EXISTS ineligible_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    UNIQUE(guild_id, role_id)
);

-- =============================================
-- PENDING OFFERS (contract offers)
-- =============================================
CREATE TABLE IF NOT EXISTS pending_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    offered_by TEXT NOT NULL,
    message_id TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PENDING TRADES
-- =============================================
CREATE TABLE IF NOT EXISTS pending_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    team1_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    team2_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    team1_player_id TEXT NOT NULL,
    team2_player_id TEXT NOT NULL,
    initiated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PENDING GAMETIMES
-- =============================================
CREATE TABLE IF NOT EXISTS pending_gametimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    team1_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    team2_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    scheduled_time TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PLAYERS (Discord <-> Minecraft links)
-- =============================================
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id TEXT NOT NULL,
    minecraft_name TEXT,
    guild_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(discord_id, guild_id)
);

-- =============================================
-- SEASONS
-- =============================================
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    season_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    UNIQUE(guild_id, season_name)
);

-- =============================================
-- TRANSACTION HISTORY (audit log)
-- =============================================
CREATE TABLE IF NOT EXISTS transaction_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    player_id TEXT NOT NULL,
    from_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    to_team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACCOLADES (awards - if not exists)
-- =============================================
CREATE TABLE IF NOT EXISTS accolades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    accolade_type TEXT NOT NULL,
    description TEXT,
    awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADD team_role_id TO TEAMS (if not exists)
-- This is needed for Discord role <-> team mapping
-- =============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_role_id') THEN
        ALTER TABLE teams ADD COLUMN team_role_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'guild_id') THEN
        ALTER TABLE teams ADD COLUMN guild_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'conference') THEN
        ALTER TABLE teams ADD COLUMN conference TEXT DEFAULT 'East';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_logo_emoji') THEN
        ALTER TABLE teams ADD COLUMN team_logo_emoji TEXT;
    END IF;
END $$;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_player_teams_team ON player_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_user ON player_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_offers_expires ON pending_offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_players_discord ON players(discord_id);
CREATE INDEX IF NOT EXISTS idx_players_mc ON players(minecraft_name);
CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(guild_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transaction_history_player ON transaction_history(player_id);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE server_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ineligible_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_gametimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES (allow service role full access)
-- =============================================
CREATE POLICY "Full access server_config" ON server_config FOR ALL USING (true);
CREATE POLICY "Full access player_teams" ON player_teams FOR ALL USING (true);
CREATE POLICY "Full access demands" ON demands FOR ALL USING (true);
CREATE POLICY "Full access saved_roles" ON saved_roles FOR ALL USING (true);
CREATE POLICY "Full access ineligible_roles" ON ineligible_roles FOR ALL USING (true);
CREATE POLICY "Full access pending_offers" ON pending_offers FOR ALL USING (true);
CREATE POLICY "Full access pending_trades" ON pending_trades FOR ALL USING (true);
CREATE POLICY "Full access pending_gametimes" ON pending_gametimes FOR ALL USING (true);
CREATE POLICY "Full access players" ON players FOR ALL USING (true);
CREATE POLICY "Full access seasons" ON seasons FOR ALL USING (true);
CREATE POLICY "Full access transaction_history" ON transaction_history FOR ALL USING (true);

SELECT 'Migration complete! Bot tables added to existing schema.' as status;
