-- MBA Social Database Schema for Supabase (Standalone version)
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  abbreviation VARCHAR(5) NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#1E40AF',
  description TEXT,
  founded_date DATE,
  home_arena VARCHAR(100),
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  championships INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (standalone, not linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'fan' CHECK (role IN ('player', 'coach', 'admin', 'fan')),
  minecraft_username VARCHAR(50) NOT NULL,
  discord_id VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player stats table
CREATE TABLE IF NOT EXISTS player_stats (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season VARCHAR(20) NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_lost INTEGER NOT NULL DEFAULT 0,
  points_scored INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  rebounds INTEGER NOT NULL DEFAULT 0,
  steals INTEGER NOT NULL DEFAULT 0,
  blocks INTEGER NOT NULL DEFAULT 0,
  three_pointers_made INTEGER NOT NULL DEFAULT 0,
  three_pointers_attempted INTEGER NOT NULL DEFAULT 0,
  field_goals_made INTEGER NOT NULL DEFAULT 0,
  field_goals_attempted INTEGER NOT NULL DEFAULT 0,
  free_throws_made INTEGER NOT NULL DEFAULT 0,
  free_throws_attempted INTEGER NOT NULL DEFAULT 0,
  turnovers INTEGER NOT NULL DEFAULT 0,
  fouls INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season)
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  home_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'postponed')),
  scheduled_date TIMESTAMPTZ NOT NULL,
  season VARCHAR(20) NOT NULL,
  is_playoff BOOLEAN NOT NULL DEFAULT FALSE,
  arena VARCHAR(100),
  mvp_player_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Free agent listings
CREATE TABLE IF NOT EXISTS free_agent_listings (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  availability VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'in-talks', 'signed')),
  positions TEXT[] NOT NULL DEFAULT '{}',
  looking_for TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News table
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  image_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accolades table
CREATE TABLE IF NOT EXISTS accolades (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  season VARCHAR(20),
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  icon VARCHAR(50),
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_player_stats_user ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_season ON player_stats(season);
CREATE INDEX IF NOT EXISTS idx_games_teams ON games(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_free_agent_user ON free_agent_listings(user_id);

-- Row Level Security (allow public read for now)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_agent_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE accolades ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Public read access" ON player_stats FOR SELECT USING (true);
CREATE POLICY "Public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access" ON free_agent_listings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON news FOR SELECT USING (true);
CREATE POLICY "Public read access" ON accolades FOR SELECT USING (true);

-- Allow anon inserts/updates for admin functionality (you can restrict this later)
CREATE POLICY "Allow inserts" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates" ON teams FOR UPDATE USING (true);
CREATE POLICY "Allow inserts" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates" ON users FOR UPDATE USING (true);
CREATE POLICY "Allow inserts" ON player_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates" ON player_stats FOR UPDATE USING (true);
CREATE POLICY "Allow inserts" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates" ON games FOR UPDATE USING (true);
CREATE POLICY "Allow inserts" ON free_agent_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates" ON free_agent_listings FOR UPDATE USING (true);
CREATE POLICY "Allow inserts" ON news FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates" ON news FOR UPDATE USING (true);
CREATE POLICY "Allow inserts" ON accolades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow updates" ON accolades FOR UPDATE USING (true);

-- =============================================
-- SEED DATA: Insert the 8 MBA Teams
-- =============================================

INSERT INTO teams (id, name, abbreviation, logo_url, primary_color, secondary_color, description, founded_date, home_arena, wins, losses, championships) VALUES
('team-withers', 'Washington Withers', 'WAS', '/teams/washington-withers.png', '#1C2541', '#C41E3A', 'The fearsome Washington Withers bring destruction to their opponents.', '2024-01-01', 'Nether Dome', 12, 4, 0),
('team-magma', 'Miami Magma Cubes', 'MIA', '/teams/miami-magma-cubes.png', '#C41E3A', '#FF6B35', 'The heat is on with the Miami Magma Cubes.', '2024-01-01', 'Lava Court', 10, 6, 0),
('team-creepers', 'Los Angeles Creepers', 'LAC', '/teams/los-angeles-creepers.png', '#6B21A8', '#EAB308', 'Explosive plays from the Los Angeles Creepers.', '2024-01-01', 'TNT Arena', 14, 2, 1),
('team-bows', 'Chicago Bows', 'CHI', '/teams/chicago-bows.png', '#DC2626', '#000000', 'Sharp shooters from the Windy City.', '2024-01-01', 'Arrow Stadium', 8, 8, 0),
('team-buckets', 'Brooklyn Buckets', 'BKN', '/teams/brooklyn-buckets.png', '#000000', '#FFFFFF', 'Filling buckets since day one.', '2024-01-01', 'The Bucket', 9, 7, 0),
('team-breeze', 'Boston Breeze', 'BOS', '/teams/boston-breeze.png', '#14532D', '#FFFFFF', 'Swift and unstoppable like the wind.', '2024-01-01', 'Wind Garden', 11, 5, 0),
('team-64s', 'Philadelphia 64s', 'PHI', '/teams/philadelphia-64s.png', '#1E3A8A', '#C41E3A', 'Stacking wins 64 at a time.', '2024-01-01', 'Stack Arena', 7, 9, 0),
('team-allays', 'Atlanta Allays', 'ATL', '/teams/atlanta-allays.png', '#0EA5E9', '#A855F7', 'Collecting victories with charm.', '2024-01-01', 'Allay Arena', 6, 10, 0)
ON CONFLICT (id) DO NOTHING;

-- Insert sample user (Steve)
INSERT INTO users (id, username, display_name, minecraft_username, team_id, role, bio) VALUES
('user-1', 'steve', 'Steve', 'Steve', 'team-creepers', 'player', 'Original Minecraft player and MBA star.')
ON CONFLICT (id) DO NOTHING;

-- Insert sample stats for Steve
INSERT INTO player_stats (id, user_id, season, games_played, games_won, games_lost, points_scored, assists, rebounds, steals, blocks, three_pointers_made, three_pointers_attempted, field_goals_made, field_goals_attempted, free_throws_made, free_throws_attempted, turnovers, fouls, minutes_played) VALUES
('stats-1', 'user-1', 'S1', 10, 7, 3, 200, 50, 80, 15, 10, 20, 50, 80, 160, 20, 25, 20, 15, 300)
ON CONFLICT (user_id, season) DO NOTHING;

-- Insert sample games
INSERT INTO games (id, home_team_id, away_team_id, home_score, away_score, status, scheduled_date, season, is_playoff, arena, mvp_player_id) VALUES
('game-1', 'team-creepers', 'team-withers', 78, 72, 'completed', '2024-12-10T19:00:00Z', 'S1', false, 'TNT Arena', 'user-1'),
('game-2', 'team-magma', 'team-breeze', 0, 0, 'scheduled', '2024-12-20T19:00:00Z', 'S1', false, 'Lava Court', null)
ON CONFLICT (id) DO NOTHING;

SELECT 'Schema and seed data created successfully!' as result;
