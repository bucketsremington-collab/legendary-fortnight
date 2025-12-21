import { useState, useEffect } from 'react';
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
  const [data, setData] = useState<PlayerStats[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!discordId || !supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: err } = await supabase!
          .from('player_stats')
          .select('*')
          .eq('discord_id', discordId)
          .order('season_name', { ascending: false });
        
        if (err) throw err;
        setData(result as PlayerStats[]);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [discordId]);

  return { data, isLoading, error };
}

/**
 * Fetch current season stats for a player
 */
export function useCurrentSeasonStats(discordId: string | undefined, seasonName: string = 'S1') {
  const [data, setData] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!discordId || !supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: err } = await supabase!
          .from('player_stats')
          .select('*')
          .eq('discord_id', discordId)
          .eq('season_name', seasonName)
          .single();
        
        if (err && err.code !== 'PGRST116') throw err; // PGRST116 = no rows
        setData(result as PlayerStats | null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [discordId, seasonName]);

  return { data, isLoading, error };
}

/**
 * Fetch leaderboard for a specific stat category
 */
export function useLeaderboard(statCategory: StatCategory, seasonName?: string) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let query = supabase!
          .from('leaderboards')
          .select('*')
          .eq('stat_category', statCategory)
          .order('rank', { ascending: true })
          .limit(10);
        
        if (seasonName) {
          query = query.eq('season_name', seasonName);
        }
        
        const { data: result, error: err } = await query;
        
        if (err) throw err;
        setData(result as LeaderboardEntry[]);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [statCategory, seasonName]);

  return { data, isLoading, error };
}

/**
 * Fetch recent games
 */
export function useRecentGames(limit: number = 10) {
  const [data, setData] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: err } = await supabase!
          .from('games')
          .select('*')
          .order('played_at', { ascending: false })
          .limit(limit);
        
        if (err) throw err;
        setData(result as Game[]);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [limit]);

  return { data, isLoading, error };
}

/**
 * Fetch games for a specific team
 */
export function useTeamGames(teamName: string, limit: number = 10) {
  const [data, setData] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!teamName || !supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: err } = await supabase!
          .from('games')
          .select('*')
          .or(`team1_name.eq.${teamName},team2_name.eq.${teamName}`)
          .order('played_at', { ascending: false })
          .limit(limit);
        
        if (err) throw err;
        setData(result as Game[]);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamName, limit]);

  return { data, isLoading, error };
}

/**
 * Get Minecraft name for a Discord user
 */
export function useMinecraftName(discordId: string | undefined) {
  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!discordId || !supabase) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: result, error: err } = await supabase!
          .from('player_minecraft_links')
          .select('minecraft_name')
          .eq('discord_id', discordId)
          .single();
        
        if (err && err.code !== 'PGRST116') throw err;
        setData(result?.minecraft_name || null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [discordId]);

  return { data, isLoading, error };
}
