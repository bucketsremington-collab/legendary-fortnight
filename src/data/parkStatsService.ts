// Service for querying park/rec game stats from MySQL database
import { User } from '../types';

export interface ParkGameStats {
  player_uuid: string;
  player_name: string;
  season: number;
  
  // Record
  wins: number;
  losses: number;
  games_played: number;
  
  // Stats
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fg_made: number;
  fg_attempted: number;
  three_fg_made: number;
  three_fg_attempted: number;
  threes: number;
}

export interface ParkStatsAggregated {
  // Totals
  total_games: number;
  total_wins: number;
  total_losses: number;
  total_points: number;
  total_assists: number;
  total_rebounds: number;
  total_steals: number;
  total_blocks: number;
  total_turnovers: number;
  total_fg_made: number;
  total_fg_attempted: number;
  total_3fg_made: number;
  total_3fg_attempted: number;
  
  // Averages (per game)
  ppg: number;
  apg: number;
  rpg: number;
  spg: number;
  bpg: number;
  tpg: number;
  fg_percentage: number;
  three_pt_percentage: number;
  win_percentage: number;
}

// API endpoint - Supabase Edge Function for park stats
const PARK_STATS_API = import.meta.env.VITE_PARK_STATS_API || '/api/park-stats';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Fetch park stats for all players
 */
export async function fetchAllParkStats(season: number = 1): Promise<ParkGameStats[]> {
  try {
    const url = `${PARK_STATS_API}?all=true&season=${season}`;
    console.log('Fetching all park stats from:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch all park stats:', response.statusText);
      return [];
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Park stats Edge Function not deployed yet.');
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching all park stats:', error);
    return [];
  }
}

/**
 * Fetch park stats for a specific player by their Minecraft UUID
 */
export async function fetchParkStatsByUUID(uuid: string, season: number = 1): Promise<ParkGameStats | null> {
  try {
    const url = `${PARK_STATS_API}/${uuid}?season=${season}`;
    console.log('Fetching park stats from:', url);
    console.log('Using anon key:', SUPABASE_ANON_KEY ? 'Present' : 'MISSING');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('Player not found in park stats database');
        return null;
      }
      console.error('Failed to fetch park stats:', response.statusText);
      const text = await response.text();
      console.error('Response body:', text.substring(0, 200));
      return null;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Park stats Edge Function not deployed yet. Deploy via Supabase Dashboard.');
      console.warn('Content-Type:', contentType);
      const text = await response.text();
      console.warn('Response preview:', text.substring(0, 200));
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching park stats:', error);
    return null;
  }
}

/**
 * Fetch aggregated park stats (totals and averages) for a player
 */
export async function fetchParkStatsAggregated(uuid: string, season: number = 1): Promise<ParkStatsAggregated | null> {
  const stats = await fetchParkStatsByUUID(uuid, season);
  if (!stats) return null;
  
  const games = stats.games_played || 1; // Prevent division by zero
  
  return {
    total_games: stats.games_played,
    total_wins: stats.wins,
    total_losses: stats.losses,
    total_points: stats.points,
    total_assists: stats.assists,
    total_rebounds: stats.rebounds,
    total_steals: stats.steals,
    total_blocks: stats.blocks,
    total_turnovers: stats.turnovers,
    total_fg_made: stats.fg_made,
    total_fg_attempted: stats.fg_attempted,
    total_3fg_made: stats.three_fg_made,
    total_3fg_attempted: stats.three_fg_attempted,
    
    // Calculate averages
    ppg: stats.points / games,
    apg: stats.assists / games,
    rpg: stats.rebounds / games,
    spg: stats.steals / games,
    bpg: stats.blocks / games,
    tpg: stats.turnovers / games,
    fg_percentage: stats.fg_attempted > 0 ? (stats.fg_made / stats.fg_attempted) * 100 : 0,
    three_pt_percentage: stats.three_fg_attempted > 0 ? (stats.three_fg_made / stats.three_fg_attempted) * 100 : 0,
    win_percentage: games > 0 ? (stats.wins / games) * 100 : 0,
  };
}

/**
 * Fetch park stats by MBA user
 * The Edge Function will handle converting minecraft_username to UUID server-side
 */
export async function fetchParkStatsByUser(user: User, season: number = 1): Promise<ParkStatsAggregated | null> {
  // Pass the minecraft username directly - Edge Function will convert to UUID
  const identifier = user.minecraft_username || user.username;
  return fetchParkStatsAggregated(identifier, season);
}

/**
 * Get top players by a specific stat
 */
export async function fetchTopParkPlayers(stat: keyof ParkStatsAggregated, season: number = 1, limit: number = 10): Promise<any[]> {
  try {
    const response = await fetch(`${PARK_STATS_API}/leaderboard?stat=${stat}&season=${season}&limit=${limit}`);
    if (!response.ok) {
      console.error('Failed to fetch leaderboard:', response.statusText);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}
