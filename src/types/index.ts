// Database Types - mirrors Supabase schema

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  team_id: string | null;
  role: 'player' | 'coach' | 'admin' | 'fan';
  minecraft_username: string;
  discord_id?: string; // Discord user ID (format: discord-123456789)
  discord_roles?: string[]; // Array of Discord role IDs synced from MBA server
  created_at: string;
  updated_at: string;
}

export interface DiscordLink {
  minecraft_uuid: string;
  minecraft_username: string;
  discord_id: string;
  discord_username: string;
  discord_tag: string;
  linked_at: string;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo_url: string | null;
  minecraft_item?: string;
  primary_color: string;
  secondary_color: string;
  description: string | null;
  founded_date: string;
  home_arena: string | null;
  conference: 'Plains' | 'Desert';
  wins: number;
  losses: number;
  championships: number;
  created_at: string;
}

export interface PlayerStats {
  id: string;
  user_id: string;
  season: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  points_scored: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  three_pointers_made: number;
  three_pointers_attempted: number;
  field_goals_made: number;
  field_goals_attempted: number;
  free_throws_made: number;
  free_throws_attempted: number;
  turnovers: number;
  fouls: number;
  minutes_played: number;
  created_at: string;
  updated_at: string;
}

export interface Accolade {
  id: string;
  user_id: string;
  type: AcColadeType;
  title: string;
  description: string | null;
  season: string | null;
  awarded_date: string;
  icon: string | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export type AcColadeType = 
  | 'mvp'
  | 'championship'
  | 'all_star'
  | 'scoring_leader'
  | 'assist_leader'
  | 'rebound_leader'
  | 'defensive_player'
  | 'rookie_of_year'
  | 'most_improved'
  | 'sixth_man'
  | 'milestone'
  | 'special';

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  is_pinned: boolean;
  game_reference_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: User;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  // Joined data
  user?: User;
}

export interface Like {
  id: string;
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: 'scheduled' | 'live' | 'completed' | 'postponed';
  scheduled_date: string;
  season: string;
  is_playoff: boolean;
  arena: string | null;
  mvp_player_id: string | null;
  created_at: string;
  // Joined data
  home_team?: Team;
  away_team?: Team;
  mvp_player?: User;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Auth types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Stats calculations
export interface CalculatedStats {
  ppg: number; // Points per game
  apg: number; // Assists per game
  rpg: number; // Rebounds per game
  spg: number; // Steals per game
  bpg: number; // Blocks per game
  tpg: number; // Turnovers per game
  fg_pct: number; // Field goal percentage
  three_pct: number; // 3-point percentage
  ft_pct: number; // Free throw percentage
  win_pct: number; // Win percentage
}
