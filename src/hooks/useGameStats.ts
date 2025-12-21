import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types for synced stats
export interface PlayerStats {
  discord_id: string;
  season_name: string;
  games_played: number;
  total_points: number;
  total_rebounds: number;
  total_assists: number;
  total_steals: number;
  total_blocks: number;
  total_turnovers: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  tpg: number;
}

export interface LeaderboardEntry {
  rank: number;
  discord_id: string;
  minecraft_name: string | null;
  games_played: number;
  total: number;
  average: number;
}

export interface Game {
  game_id: number;
  season_name: string;
  team1_name: string;
  team2_name: string;
  team1_score: number;
  team2_score: number;
  winner_name: string | null;
  played_at: string;
}

export type StatCategory = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg';

/**
 * Fetch player stats by Discord ID
 * Use this on profile pages to show a player's season stats
 */
export function usePlayerStats(discordId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', discordId],
    queryFn: async () => {
      if (!discordId) return null;
      
      const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('discord_id', discordId)
        .order('season_name', { ascending: false });
      
      if (error) throw error;
      return data as PlayerStats[];
    },
    enabled: !!discordId,
  });
}

/**
 * Fetch current season stats for a player
 */
export function useCurrentSeasonStats(discordId: string | undefined, seasonName: string = 'S1') {
  return useQuery({
    queryKey: ['player-season-stats', discordId, seasonName],
    queryFn: async () => {
      if (!discordId) return null;
      
      const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('discord_id', discordId)
        .eq('season_name', seasonName)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as PlayerStats | null;
    },
    enabled: !!discordId,
  });
}

/**
 * Fetch leaderboard for a specific stat category
 */
export function useLeaderboard(statCategory: StatCategory, seasonName?: string) {
  return useQuery({
    queryKey: ['leaderboard', statCategory, seasonName],
    queryFn: async () => {
      let query = supabase
        .from('leaderboards')
        .select('*')
        .eq('stat_category', statCategory)
        .order('rank', { ascending: true })
        .limit(10);
      
      if (seasonName) {
        query = query.eq('season_name', seasonName);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as LeaderboardEntry[];
    },
  });
}

/**
 * Fetch recent games
 */
export function useRecentGames(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-games', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('played_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Game[];
    },
  });
}

/**
 * Fetch games for a specific team
 */
export function useTeamGames(teamName: string, limit: number = 10) {
  return useQuery({
    queryKey: ['team-games', teamName, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .or(`team1_name.eq.${teamName},team2_name.eq.${teamName}`)
        .order('played_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as Game[];
    },
    enabled: !!teamName,
  });
}

/**
 * Get Minecraft name for a Discord user
 */
export function useMinecraftName(discordId: string | undefined) {
  return useQuery({
    queryKey: ['minecraft-name', discordId],
    queryFn: async () => {
      if (!discordId) return null;
      
      const { data, error } = await supabase
        .from('player_minecraft_links')
        .select('minecraft_name')
        .eq('discord_id', discordId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.minecraft_name || null;
    },
    enabled: !!discordId,
  });
}
