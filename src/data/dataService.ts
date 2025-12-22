// Data service that uses Supabase when configured, falls back to mock data
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Team, User, PlayerStats, Game, Accolade, DiscordLink } from '../types';
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
// IN-MEMORY CACHE TO PREVENT RATE LIMITING
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 120000; // 2 minute cache (increased from 1 min)
const pendingRequests = new Map<string, Promise<any>>();
const failureCounts = new Map<string, number>();
const lastRequestTime = new Map<string, number>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Exponential backoff with jitter
async function exponentialBackoff(attempt: number): Promise<void> {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds max
  const jitter = Math.random() * 1000; // Random jitter up to 1 second
  const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
  
  console.log(`Backing off for ${Math.round(delay)}ms (attempt ${attempt + 1})`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Request throttling - ensure minimum time between requests
async function throttleRequest(key: string): Promise<void> {
  const MIN_REQUEST_INTERVAL = 100; // 100ms between requests to same endpoint
  const lastTime = lastRequestTime.get(key);
  
  if (lastTime) {
    const timeSinceLastRequest = Date.now() - lastTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
  }
  
  lastRequestTime.set(key, Date.now());
}

// Deduplicate concurrent requests with exponential backoff retry
async function dedupedRequest<T>(key: string, fetcher: () => Promise<T>, maxRetries = 3): Promise<T> {
  // Check cache first
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Check if request is already in flight
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }
  
  // Throttle request
  await throttleRequest(key);
  
  // Make new request with retry logic
  const promise = (async () => {
    let lastError: any;
    const failures = failureCounts.get(key) || 0;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // If we've had failures before, apply backoff
        if (failures > 0 && attempt === 0) {
          await exponentialBackoff(failures - 1);
        } else if (attempt > 0) {
          await exponentialBackoff(attempt - 1);
        }
        
        const data = await fetcher();
        setCache(key, data);
        failureCounts.delete(key); // Reset failure count on success
        pendingRequests.delete(key);
        return data;
      } catch (err: any) {
        lastError = err;
        console.warn(`Request failed for ${key} (attempt ${attempt + 1}/${maxRetries + 1}):`, err.message);
        
        // Don't retry on certain errors (404, 403, etc)
        if (err.code === 'PGRST116' || err.status === 404 || err.status === 403) {
          break;
        }
      }
    }
    
    // All retries failed
    failureCounts.set(key, (failureCounts.get(key) || 0) + 1);
    pendingRequests.delete(key);
    throw lastError || new Error('Request failed after retries');
  })();

  
  pendingRequests.set(key, promise);
  return promise;
}

// ============================================
// TEAMS
// ============================================
export async function fetchTeams(): Promise<Team[]> {
  return dedupedRequest('teams', async () => {
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
  });
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
  return dedupedRequest('users', async () => {
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
  });
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

  // Note: We use a timestamp-based cache key concept for potential future request deduplication
  // This allows the same username to be fetched fresh every 30 seconds
  // Currently not actively used but prepared for enhanced caching layer
  
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
    .upsert(user, { onConflict: 'id' })
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
  return dedupedRequest('games', async () => {
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
  });
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
  return dedupedRequest('news', async () => {
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
  });
}

// ============================================
// DISCORD LINKS
// ============================================
export async function fetchDiscordLinkByDiscordId(discordId: string): Promise<DiscordLink | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase!
      .from('discord_links')
      .select('*')
      .eq('discord_id', discordId)
      .maybeSingle();

    if (error) {
      // Only log if it's not a "no rows" error
      if (error.code !== 'PGRST116') {
        console.error('Error fetching Discord link:', error);
      }
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching Discord link:', err);
    return null;
  }
}

export async function fetchDiscordLinkByMinecraftUsername(minecraftUsername: string): Promise<DiscordLink | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase!
      .from('discord_links')
      .select('*')
      .eq('minecraft_username', minecraftUsername)
      .maybeSingle();

    if (error) {
      // Only log if it's not a "no rows" error
      if (error.code !== 'PGRST116') {
        console.error('Error fetching Discord link by Minecraft username:', error);
      }
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching Discord link by Minecraft username:', err);
    return null;
  }
}

export async function validateMinecraftUsernameForUser(minecraftUsername: string, discordId: string): Promise<{valid: boolean; message: string; linkedUsername?: string}> {
  if (!isSupabaseConfigured()) {
    return { valid: true, message: 'Validation skipped in demo mode' };
  }

  try {
    // Get the user's linked Minecraft account
    const userLink = await fetchDiscordLinkByDiscordId(discordId);
    
    if (!userLink) {
      return { 
        valid: false, 
        message: 'No Minecraft account linked to your Discord. Please link your account first.' 
      };
    }

    // Check if the provided username matches their linked account
    if (userLink.minecraft_username.toLowerCase() !== minecraftUsername.toLowerCase()) {
      return { 
        valid: false, 
        message: `This Minecraft account is not linked to your Discord. Your linked account is: ${userLink.minecraft_username}`,
        linkedUsername: userLink.minecraft_username
      };
    }

    return { valid: true, message: 'Validated', linkedUsername: userLink.minecraft_username };
  } catch (err) {
    console.error('Error validating Minecraft username:', err);
    return { valid: false, message: 'Error validating account' };
  }
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
