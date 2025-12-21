// Data service that uses Supabase when configured, falls back to mock data
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Team, User, PlayerStats, Game, Accolade } from '../types';
import {
  mockTeams,
  mockUsers,
  mockPlayerStats,
  mockGames,
  mockAccolades,
  mockFreeAgentListings,
  mockNews,
  FreeAgentListing,
  NewsItem,
} from './mockData';

// Re-export types for use in other modules
export type { NewsItem, FreeAgentListing };

// ============================================
// TEAMS
// ============================================
export async function fetchTeams(): Promise<Team[]> {
  if (!isSupabaseConfigured()) {
    return mockTeams;
  }

  const { data, error } = await supabase!
    .from('teams')
    .select('*')
    .order('wins', { ascending: false });

  if (error) {
    console.error('Error fetching teams:', error);
    return mockTeams;
  }

  return data || mockTeams;
}

export async function fetchTeamById(id: string): Promise<Team | null> {
  if (!isSupabaseConfigured()) {
    return mockTeams.find(t => t.id === id) || null;
  }

  const { data, error } = await supabase!
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching team:', error);
    return mockTeams.find(t => t.id === id) || null;
  }

  return data;
}

export async function fetchTeamByRoleId(roleId: string): Promise<Team | null> {
  if (!isSupabaseConfigured()) {
    // In mock mode, can't look up by role ID
    return null;
  }

  const { data, error } = await supabase!
    .from('teams')
    .select('*')
    .eq('team_role_id', roleId)
    .single();

  if (error) {
    console.error('Error fetching team by role ID:', error);
    return null;
  }

  return data;
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.log('Demo mode: Team update not saved to database');
    return true;
  }

  const { error } = await supabase!
    .from('teams')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating team:', error);
    return false;
  }

  return true;
}

// Reset all teams to Season 0 defaults (wins, losses, championships only)
export async function resetAllTeamsToDefaults(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.log('Demo mode: Team reset not saved to database');
    return true;
  }

  const { error } = await supabase!
    .from('teams')
    .update({
      wins: 0,
      losses: 0,
      championships: 0
    })
    .neq('id', ''); // Update all teams

  if (error) {
    console.error('Error resetting teams:', error);
    return false;
  }

  return true;
}

// ============================================
// USERS
// ============================================
export async function fetchUsers(): Promise<User[]> {
  if (!isSupabaseConfigured()) {
    return mockUsers;
  }

  const { data, error } = await supabase!
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return mockUsers;
  }

  return data || mockUsers;
}

export async function fetchUserById(id: string): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return mockUsers.find(u => u.id === id) || null;
  }

  const { data, error } = await supabase!
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return mockUsers.find(u => u.id === id) || null;
  }

  return data;
}

export async function fetchUserByUsername(username: string): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  const { data, error } = await supabase!
    .from('users')
    .select('*')
    .ilike('username', username)
    .single();

  if (error) {
    console.error('Error fetching user by username:', error);
    return mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  return data;
}

export async function fetchTeamMembers(teamId: string): Promise<User[]> {
  if (!isSupabaseConfigured()) {
    return mockUsers.filter(u => u.team_id === teamId);
  }

  const { data, error } = await supabase!
    .from('users')
    .select('*')
    .eq('team_id', teamId);

  if (error) {
    console.error('Error fetching team members:', error);
    return mockUsers.filter(u => u.team_id === teamId);
  }

  return data || [];
}

// Fetch users without a team (free agents = anyone with no team_id)
export async function fetchFreeAgentUsers(): Promise<User[]> {
  if (!isSupabaseConfigured()) {
    return mockUsers.filter(u => u.team_id === null);
  }

  const { data, error } = await supabase!
    .from('users')
    .select('*')
    .is('team_id', null);

  if (error) {
    console.error('Error fetching free agent users:', error);
    return mockUsers.filter(u => u.team_id === null);
  }

  return data || [];
}

export async function createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    console.log('Demo mode: User not saved to database');
    return { ...user, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as User;
  }

  const { data, error } = await supabase!
    .from('users')
    .insert(user)
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    console.log('Demo mode: User update not saved to database');
    return null;
  }

  const { data, error } = await supabase!
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return data;
}

// ============================================
// PLAYER STATS
// ============================================
export async function fetchPlayerStats(season?: string): Promise<PlayerStats[]> {
  if (!isSupabaseConfigured()) {
    return mockPlayerStats;
  }

  // If season specified, filter by it
  if (season) {
    const { data, error } = await supabase!
      .from('player_stats')
      .select('*')
      .eq('season', season);

    if (error) {
      console.error('Error fetching player stats:', error);
      return mockPlayerStats;
    }

    return data || mockPlayerStats;
  }

  // Otherwise get all stats but deduplicate by user (keep most recent season)
  const { data, error } = await supabase!
    .from('player_stats')
    .select('*')
    .order('season', { ascending: false });

  if (error) {
    console.error('Error fetching player stats:', error);
    return mockPlayerStats;
  }

  // Deduplicate: keep only the first (most recent) stat per user
  const seenUsers = new Set<string>();
  const deduped = (data || []).filter(stat => {
    if (seenUsers.has(stat.user_id)) {
      return false;
    }
    seenUsers.add(stat.user_id);
    return true;
  });

  return deduped.length > 0 ? deduped : mockPlayerStats;
}

export async function fetchPlayerStatsByUserId(userId: string): Promise<PlayerStats | null> {
  if (!isSupabaseConfigured()) {
    return mockPlayerStats.find(s => s.user_id === userId) || null;
  }

  const { data, error } = await supabase!
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .order('season', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching player stats:', error);
    return mockPlayerStats.find(s => s.user_id === userId) || null;
  }

  return data;
}

export async function fetchPlayerStatsByUserIdAndSeason(userId: string, season: string): Promise<PlayerStats | null> {
  if (!isSupabaseConfigured()) {
    return mockPlayerStats.find(s => s.user_id === userId && s.season === season) || null;
  }

  const { data, error } = await supabase!
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('season', season)
    .maybeSingle();

  if (error) {
    console.error('Error fetching player stats:', error);
    return mockPlayerStats.find(s => s.user_id === userId && s.season === season) || null;
  }

  return data || null;
}

export async function upsertPlayerStats(stats: Omit<PlayerStats, 'id' | 'created_at' | 'updated_at'>): Promise<PlayerStats | null> {
  if (!isSupabaseConfigured()) {
    console.log('Demo mode: Stats not saved to database');
    return { 
      id: `stats-${Date.now()}`, 
      ...stats, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    } as PlayerStats;
  }

  // Check if stats exist for this user/season
  const existing = await fetchPlayerStatsByUserIdAndSeason(stats.user_id, stats.season);

  if (existing) {
    // Update existing stats
    const { data, error } = await supabase!
      .from('player_stats')
      .update({
        ...stats,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', stats.user_id)
      .eq('season', stats.season)
      .select()
      .single();

    if (error) {
      console.error('Error updating player stats:', error);
      return null;
    }

    return data;
  } else {
    // Insert new stats
    const { data, error } = await supabase!
      .from('player_stats')
      .insert(stats)
      .select()
      .single();

    if (error) {
      console.error('Error inserting player stats:', error);
      return null;
    }

    return data;
  }
}

// ============================================
// GAMES
// ============================================
export async function fetchGames(): Promise<Game[]> {
  if (!isSupabaseConfigured()) {
    return mockGames;
  }

  const { data, error } = await supabase!
    .from('games')
    .select('*')
    .order('scheduled_date', { ascending: false });

  if (error) {
    console.error('Error fetching games:', error);
    return mockGames;
  }

  return data || mockGames;
}

export async function fetchGamesByTeamId(teamId: string): Promise<Game[]> {
  if (!isSupabaseConfigured()) {
    return mockGames.filter(g => g.home_team_id === teamId || g.away_team_id === teamId);
  }

  const { data, error } = await supabase!
    .from('games')
    .select('*')
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .order('scheduled_date', { ascending: false });

  if (error) {
    console.error('Error fetching team games:', error);
    return mockGames.filter(g => g.home_team_id === teamId || g.away_team_id === teamId);
  }

  return data || [];
}

// ============================================
// ACCOLADES
// ============================================
export async function fetchAccoladesByUserId(userId: string): Promise<Accolade[]> {
  if (!isSupabaseConfigured()) {
    return mockAccolades.filter(a => a.user_id === userId);
  }

  const { data, error } = await supabase!
    .from('accolades')
    .select('*')
    .eq('user_id', userId)
    .order('awarded_date', { ascending: false });

  if (error) {
    console.error('Error fetching accolades:', error);
    return mockAccolades.filter(a => a.user_id === userId);
  }

  return data || [];
}

// ============================================
// FREE AGENT LISTINGS
// ============================================
export async function fetchFreeAgentListings(): Promise<FreeAgentListing[]> {
  if (!isSupabaseConfigured()) {
    return mockFreeAgentListings;
  }

  const { data, error } = await supabase!
    .from('free_agent_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching free agent listings:', error);
    return mockFreeAgentListings;
  }

  // Map database fields to our interface
  return (data || []).map(listing => ({
    id: listing.id,
    user_id: listing.user_id,
    positions: listing.positions || [],
    description: listing.looking_for || '',
    availability: listing.availability,
    discord_tag: '',
    created_at: listing.created_at,
  }));
}

// ============================================
// NEWS
// ============================================
export async function fetchNews(): Promise<NewsItem[]> {
  if (!isSupabaseConfigured()) {
    return mockNews;
  }

  const { data, error } = await supabase!
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching news:', error);
    return mockNews;
  }

  // Map database fields to our interface
  return (data || []).map(news => ({
    id: news.id,
    title: news.title,
    content: news.content,
    category: news.tags?.[0] || 'announcement',
    author: 'MBA Official',
    created_at: news.created_at,
    is_pinned: news.is_pinned,
  }));
}

// ============================================
// UTILITY: Check Supabase connection
// ============================================
export async function checkSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase!.from('teams').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
