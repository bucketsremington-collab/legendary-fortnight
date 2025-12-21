-- =============================================
-- MBA Bot + Website Complete Supabase Schema
-- =============================================
-- Run this in Supabase SQL Editor to set up all tables
-- This schema is used by BOTH the Discord bot and website

-- =============================================
-- SERVER CONFIGURATION
-- =============================================

CREATE TABLE IF NOT EXISTS server_config (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT UNIQUE NOT NULL,
    
    -- Role IDs (stored as text for Discord snowflake compatibility)
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
    
    -- Minecraft server status
    mc_status_channel_id TEXT,
    mc_status_message_id TEXT,
    mc_server_address TEXT DEFAULT '45.126.211.8:8105',
    
    -- Settings
    roster_cap INTEGER DEFAULT 10,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TEAMS
-- =============================================

CREATE TABLE IF NOT EXISTS teams (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    team_name TEXT NOT NULL,
    team_role_id TEXT NOT NULL,
    conference TEXT NOT NULL,
    team_logo_emoji TEXT,
    team_logo_url TEXT,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(guild_id, team_role_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_guild ON teams(guild_id);

-- =============================================
-- PLAYER TEAMS (Roster assignments)
-- =============================================

CREATE TABLE IF NOT EXISTS player_teams (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_player_teams_team ON player_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_player_teams_user ON player_teams(user_id);

-- =============================================
-- DEMANDS
-- =============================================

CREATE TABLE IF NOT EXISTS demands (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    demand_count INTEGER DEFAULT 0,
    season TEXT DEFAULT 'current',
    
    UNIQUE(guild_id, user_id, season)
);

-- =============================================
-- SAVED ROLES (for role persistence)
-- =============================================

CREATE TABLE IF NOT EXISTS saved_roles (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_ids TEXT,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(guild_id, user_id)
);

-- =============================================
-- INELIGIBLE ROLES
-- =============================================

CREATE TABLE IF NOT EXISTS ineligible_roles (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    
    UNIQUE(guild_id, role_id)
);

-- =============================================
-- PENDING OFFERS
-- =============================================

CREATE TABLE IF NOT EXISTS pending_offers (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    offered_by TEXT NOT NULL,
    message_id TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_offers_expires ON pending_offers(expires_at);

-- =============================================
-- PENDING TRADES
-- =============================================

CREATE TABLE IF NOT EXISTS pending_trades (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    team1_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    team2_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    team1_player_id TEXT NOT NULL,
    team2_player_id TEXT NOT NULL,
    initiated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PENDING GAMETIMES
-- =============================================

CREATE TABLE IF NOT EXISTS pending_gametimes (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    team1_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    team2_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    scheduled_time TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PLAYERS (Discord to Minecraft mapping)
-- =============================================

CREATE TABLE IF NOT EXISTS players (
    id BIGSERIAL PRIMARY KEY,
    discord_id TEXT NOT NULL,
    minecraft_name TEXT,
    guild_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(discord_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_players_discord ON players(discord_id);
CREATE INDEX IF NOT EXISTS idx_players_mc ON players(minecraft_name);

-- =============================================
-- SEASONS
-- =============================================

CREATE TABLE IF NOT EXISTS seasons (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    season_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    UNIQUE(guild_id, season_name)
);

CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(guild_id, is_active);

-- =============================================
-- GAMES
-- =============================================

CREATE TABLE IF NOT EXISTS games (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    season_id BIGINT REFERENCES seasons(id) ON DELETE CASCADE,
    team1_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    team2_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    team1_score INTEGER NOT NULL,
    team2_score INTEGER NOT NULL,
    winner_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    played_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by TEXT,
    vod_url TEXT,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_games_season ON games(season_id);
CREATE INDEX IF NOT EXISTS idx_games_teams ON games(team1_id, team2_id);

-- =============================================
-- PLAYER GAME STATS (per-game stats)
-- =============================================

CREATE TABLE IF NOT EXISTS player_game_stats (
    id BIGSERIAL PRIMARY KEY,
    game_id BIGINT REFERENCES games(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    points INTEGER DEFAULT 0,
    rebounds INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    steals INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    
    UNIQUE(game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_game_stats_player ON player_game_stats(player_id);

-- =============================================
-- PLAYER SEASON STATS (aggregated)
-- =============================================

CREATE TABLE IF NOT EXISTS player_season_stats (
    id BIGSERIAL PRIMARY KEY,
    player_id TEXT NOT NULL,
    season_id BIGINT REFERENCES seasons(id) ON DELETE CASCADE,
    guild_id TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    total_rebounds INTEGER DEFAULT 0,
    total_assists INTEGER DEFAULT 0,
    total_steals INTEGER DEFAULT 0,
    total_blocks INTEGER DEFAULT 0,
    total_turnovers INTEGER DEFAULT 0,
    
    UNIQUE(player_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_player_season_stats_player ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_season ON player_season_stats(season_id);

-- =============================================
-- TRANSACTION HISTORY (audit log)
-- =============================================

CREATE TABLE IF NOT EXISTS transaction_history (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'sign', 'release', 'trade', 'demand'
    player_id TEXT NOT NULL,
    from_team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    to_team_id BIGINT REFERENCES teams(id) ON DELETE SET NULL,
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_history_player ON transaction_history(player_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_date ON transaction_history(created_at);

-- =============================================
-- ACCOLADES (awards, achievements)
-- =============================================

CREATE TABLE IF NOT EXISTS accolades (
    id BIGSERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    season_id BIGINT REFERENCES seasons(id) ON DELETE CASCADE,
    accolade_type TEXT NOT NULL, -- 'MVP', 'DPOY', 'All-Star', etc.
    description TEXT,
    awarded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE server_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ineligible_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_gametimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE accolades ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables (website can read)
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON player_teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON seasons FOR SELECT USING (true);
CREATE POLICY "Public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access" ON player_game_stats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON player_season_stats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON transaction_history FOR SELECT USING (true);
CREATE POLICY "Public read access" ON accolades FOR SELECT USING (true);

-- Service role full access (bot uses service key)
CREATE POLICY "Service role full access" ON server_config FOR ALL USING (true);
CREATE POLICY "Service role full access" ON teams FOR ALL USING (true);
CREATE POLICY "Service role full access" ON player_teams FOR ALL USING (true);
CREATE POLICY "Service role full access" ON demands FOR ALL USING (true);
CREATE POLICY "Service role full access" ON saved_roles FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ineligible_roles FOR ALL USING (true);
CREATE POLICY "Service role full access" ON pending_offers FOR ALL USING (true);
CREATE POLICY "Service role full access" ON pending_trades FOR ALL USING (true);
CREATE POLICY "Service role full access" ON pending_gametimes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON players FOR ALL USING (true);
CREATE POLICY "Service role full access" ON seasons FOR ALL USING (true);
CREATE POLICY "Service role full access" ON games FOR ALL USING (true);
CREATE POLICY "Service role full access" ON player_game_stats FOR ALL USING (true);
CREATE POLICY "Service role full access" ON player_season_stats FOR ALL USING (true);
CREATE POLICY "Service role full access" ON transaction_history FOR ALL USING (true);
CREATE POLICY "Service role full access" ON accolades FOR ALL USING (true);

-- =============================================
-- USEFUL VIEWS FOR WEBSITE
-- =============================================

-- View: Player stats with averages
CREATE OR REPLACE VIEW player_stats_view AS
SELECT 
    ps.player_id,
    ps.guild_id,
    s.season_name,
    p.minecraft_name,
    ps.games_played,
    ps.total_points,
    ps.total_rebounds,
    ps.total_assists,
    ps.total_steals,
    ps.total_blocks,
    ps.total_turnovers,
    ROUND(ps.total_points::DECIMAL / NULLIF(ps.games_played, 0), 1) as ppg,
    ROUND(ps.total_rebounds::DECIMAL / NULLIF(ps.games_played, 0), 1) as rpg,
    ROUND(ps.total_assists::DECIMAL / NULLIF(ps.games_played, 0), 1) as apg,
    ROUND(ps.total_steals::DECIMAL / NULLIF(ps.games_played, 0), 1) as spg,
    ROUND(ps.total_blocks::DECIMAL / NULLIF(ps.games_played, 0), 1) as bpg,
    ROUND(ps.total_turnovers::DECIMAL / NULLIF(ps.games_played, 0), 1) as tpg
FROM player_season_stats ps
JOIN seasons s ON ps.season_id = s.id
LEFT JOIN players p ON ps.player_id = p.discord_id AND ps.guild_id = p.guild_id;

-- View: Team standings
CREATE OR REPLACE VIEW team_standings AS
SELECT 
    t.id,
    t.guild_id,
    t.team_name,
    t.team_role_id,
    t.conference,
    t.team_logo_emoji,
    COUNT(CASE WHEN g.winner_id = t.id THEN 1 END) as wins,
    COUNT(CASE WHEN (g.team1_id = t.id OR g.team2_id = t.id) AND g.winner_id != t.id AND g.winner_id IS NOT NULL THEN 1 END) as losses,
    COUNT(CASE WHEN g.team1_id = t.id OR g.team2_id = t.id THEN 1 END) as games_played
FROM teams t
LEFT JOIN games g ON (g.team1_id = t.id OR g.team2_id = t.id)
LEFT JOIN seasons s ON g.season_id = s.id AND s.is_active = true
GROUP BY t.id, t.guild_id, t.team_name, t.team_role_id, t.conference, t.team_logo_emoji;

-- View: Recent transactions
CREATE OR REPLACE VIEW recent_transactions AS
SELECT 
    th.id,
    th.guild_id,
    th.transaction_type,
    th.player_id,
    p.minecraft_name as player_name,
    ft.team_name as from_team,
    tt.team_name as to_team,
    th.performed_by,
    th.notes,
    th.created_at
FROM transaction_history th
LEFT JOIN players p ON th.player_id = p.discord_id AND th.guild_id = p.guild_id
LEFT JOIN teams ft ON th.from_team_id = ft.id
LEFT JOIN teams tt ON th.to_team_id = tt.id
ORDER BY th.created_at DESC;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function: Get player stats by Discord ID
CREATE OR REPLACE FUNCTION get_player_stats(p_discord_id TEXT, p_guild_id TEXT DEFAULT NULL)
RETURNS TABLE (
    season_name TEXT,
    games_played INTEGER,
    ppg DECIMAL,
    rpg DECIMAL,
    apg DECIMAL,
    spg DECIMAL,
    bpg DECIMAL,
    tpg DECIMAL,
    total_points INTEGER,
    total_rebounds INTEGER,
    total_assists INTEGER,
    total_steals INTEGER,
    total_blocks INTEGER,
    total_turnovers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.season_name,
        ps.games_played,
        ROUND(ps.total_points::DECIMAL / NULLIF(ps.games_played, 0), 1),
        ROUND(ps.total_rebounds::DECIMAL / NULLIF(ps.games_played, 0), 1),
        ROUND(ps.total_assists::DECIMAL / NULLIF(ps.games_played, 0), 1),
        ROUND(ps.total_steals::DECIMAL / NULLIF(ps.games_played, 0), 1),
        ROUND(ps.total_blocks::DECIMAL / NULLIF(ps.games_played, 0), 1),
        ROUND(ps.total_turnovers::DECIMAL / NULLIF(ps.games_played, 0), 1),
        ps.total_points,
        ps.total_rebounds,
        ps.total_assists,
        ps.total_steals,
        ps.total_blocks,
        ps.total_turnovers
    FROM player_season_stats ps
    JOIN seasons s ON ps.season_id = s.id
    WHERE ps.player_id = p_discord_id
      AND (p_guild_id IS NULL OR ps.guild_id = p_guild_id)
    ORDER BY s.season_name DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(
    p_guild_id TEXT,
    p_stat TEXT DEFAULT 'ppg',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    rank BIGINT,
    player_id TEXT,
    minecraft_name TEXT,
    games_played INTEGER,
    stat_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format('
        SELECT 
            ROW_NUMBER() OVER (ORDER BY ROUND(ps.total_%I::DECIMAL / NULLIF(ps.games_played, 0), 1) DESC) as rank,
            ps.player_id,
            p.minecraft_name,
            ps.games_played,
            ROUND(ps.total_%I::DECIMAL / NULLIF(ps.games_played, 0), 1) as stat_value
        FROM player_season_stats ps
        JOIN seasons s ON ps.season_id = s.id AND s.is_active = true
        LEFT JOIN players p ON ps.player_id = p.discord_id AND ps.guild_id = p.guild_id
        WHERE ps.guild_id = $1 AND ps.games_played > 0
        ORDER BY stat_value DESC
        LIMIT $2
    ', 
    CASE p_stat 
        WHEN 'ppg' THEN 'points'
        WHEN 'rpg' THEN 'rebounds'
        WHEN 'apg' THEN 'assists'
        WHEN 'spg' THEN 'steals'
        WHEN 'bpg' THEN 'blocks'
        ELSE 'points'
    END,
    CASE p_stat 
        WHEN 'ppg' THEN 'points'
        WHEN 'rpg' THEN 'rebounds'
        WHEN 'apg' THEN 'assists'
        WHEN 'spg' THEN 'steals'
        WHEN 'bpg' THEN 'blocks'
        ELSE 'points'
    END)
    USING p_guild_id, p_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_server_config_updated_at
    BEFORE UPDATE ON server_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
