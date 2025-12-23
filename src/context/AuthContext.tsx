import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { fetchUsers, createUser, updateUser, fetchTeamByRoleId } from '../data/dataService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

// Discord types
interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

interface DiscordMemberInfo {
  roles: string[];
  nick: string | null;
  joined_at: string;
}

// MBA Discord Role IDs
export const MBA_ROLE_IDS = {
  // Staff roles
  OWNER: '1450671860869238884',
  DEVELOPER: '1450671860869238883',
  MODERATOR: '1450671860869238882',
  
  // Team roles
  WIZARDS: '1450671860869238879',
  BOWS: '1450671860869238878',
  SIXTY_FOURS: '1450671860869238877',
  BUCKETS: '1450671860869238876',
  MAGMA_CUBES: '1450671860869238875',
  CREEPERS: '1450671860856524941',
  ALLAYS: '1450671860856524940',
  BREEZE: '1450671860856524939',
  
  // Position roles
  FRANCHISE_OWNER: '1450671860856524938',
  GENERAL_MANAGER: '1450671860856524937',
  HEAD_COACH: '1450671860856524936',
  ASSISTANT_COACH: '1450671860856524935',
  FREE_AGENT: '1450671860856524934',
} as const;

// Map team role IDs to team IDs in the database
// Team IDs must match the actual teams in the database
export const TEAM_ROLE_TO_TEAM_ID: Record<string, string> = {
  [MBA_ROLE_IDS.WIZARDS]: 'team-withers',      // Washington Withers (Wizards role)
  [MBA_ROLE_IDS.BOWS]: 'team-bows',            // Chicago Bows
  [MBA_ROLE_IDS.SIXTY_FOURS]: 'team-64s',      // Philadelphia 64s
  [MBA_ROLE_IDS.BUCKETS]: 'team-buckets',      // Brooklyn Buckets
  [MBA_ROLE_IDS.MAGMA_CUBES]: 'team-magma',    // Miami Magma Cubes
  [MBA_ROLE_IDS.CREEPERS]: 'team-creepers',    // Los Angeles Creepers
  [MBA_ROLE_IDS.ALLAYS]: 'team-allays',        // Atlanta Allays
  [MBA_ROLE_IDS.BREEZE]: 'team-breeze',        // Boston Breeze
};

// Helper to get user's MBA roles from role IDs
export interface MBARoles {
  isOwner: boolean;
  isDeveloper: boolean;
  isModerator: boolean;
  isStaff: boolean;
  isFranchiseOwner: boolean;
  isGeneralManager: boolean;
  isHeadCoach: boolean;
  isAssistantCoach: boolean;
  isFreeAgent: boolean;
  teamRoleId: string | null;
  teamId: string | null;
}

// MBA Discord Server ID from environment variable
const MBA_DISCORD_SERVER_ID = import.meta.env.VITE_MBA_DISCORD_SERVER_ID || '';

// Helper function to parse MBA roles from Discord role IDs
function parseMBARoles(roleIds: string[]): MBARoles {
  const userTeamRoleId = Object.keys(TEAM_ROLE_TO_TEAM_ID).find(roleId => roleIds.includes(roleId)) || null;
  
  // Check for admin roles (Owner or Developer)
  const isAdmin = roleIds.includes(MBA_ROLE_IDS.OWNER) || roleIds.includes(MBA_ROLE_IDS.DEVELOPER);
  
  return {
    isOwner: roleIds.includes(MBA_ROLE_IDS.OWNER),
    isDeveloper: roleIds.includes(MBA_ROLE_IDS.DEVELOPER),
    isModerator: roleIds.includes(MBA_ROLE_IDS.MODERATOR),
    isStaff: isAdmin || roleIds.includes(MBA_ROLE_IDS.MODERATOR),
    isFranchiseOwner: roleIds.includes(MBA_ROLE_IDS.FRANCHISE_OWNER),
    isGeneralManager: roleIds.includes(MBA_ROLE_IDS.GENERAL_MANAGER),
    isHeadCoach: roleIds.includes(MBA_ROLE_IDS.HEAD_COACH),
    isAssistantCoach: roleIds.includes(MBA_ROLE_IDS.ASSISTANT_COACH),
    isFreeAgent: roleIds.includes(MBA_ROLE_IDS.FREE_AGENT),
    teamRoleId: userTeamRoleId,
    teamId: userTeamRoleId ? TEAM_ROLE_TO_TEAM_ID[userTeamRoleId] : null,
  };
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  discordGuilds: DiscordGuild[];
  mbaServerMember: DiscordMemberInfo | null;
  mbaServerRoles: DiscordRole[];
  mbaRoles: MBARoles;
  isInMBAServer: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string, minecraftUsername: string) => Promise<boolean>;
  fetchDiscordGuilds: (forceRefresh?: boolean) => Promise<void>;
  fetchMBAServerInfo: (forceRefresh?: boolean) => Promise<{ memberInfo: DiscordMemberInfo | null; parsedRoles: MBARoles } | null>;
  syncRolesToDatabase: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default empty roles
const defaultMBARoles: MBARoles = {
  isOwner: false,
  isDeveloper: false,
  isModerator: false,
  isStaff: false,
  isFranchiseOwner: false,
  isGeneralManager: false,
  isHeadCoach: false,
  isAssistantCoach: false,
  isFreeAgent: false,
  teamRoleId: null,
  teamId: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discordGuilds, setDiscordGuilds] = useState<DiscordGuild[]>([]);
  const [mbaServerMember, setMbaServerMember] = useState<DiscordMemberInfo | null>(null);
  const [mbaServerRoles, setMbaServerRoles] = useState<DiscordRole[]>([]);
  const [mbaRoles, setMbaRoles] = useState<MBARoles>(defaultMBARoles);

  // Check if user is in MBA Discord server
  const isInMBAServer = discordGuilds.some(g => g.id === MBA_DISCORD_SERVER_ID);

  // Cache keys and duration (5 minutes)
  const DISCORD_CACHE_KEY = 'mba_discord_cache';
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes in milliseconds (reduced for fresher role data)
  const RATE_LIMITED_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes when rate limited to avoid hammering API

  // Get cached Discord data if still fresh
  // acceptStale: allow older cache when rate limited (up to 10 minutes)
  const getCachedDiscordData = (acceptStale = false) => {
    try {
      const cached = localStorage.getItem(DISCORD_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        const maxAge = acceptStale ? RATE_LIMITED_CACHE_DURATION : CACHE_DURATION;
        if (age < maxAge) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Failed to load Discord cache:', e);
    }
    return null;
  };

  // Save Discord data to cache
  const setCachedDiscordData = (guilds: DiscordGuild[], memberInfo: DiscordMemberInfo | null, roles: MBARoles) => {
    try {
      localStorage.setItem(DISCORD_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        guilds,
        memberInfo,
        roles
      }));
    } catch (e) {
      console.warn('Failed to save Discord cache:', e);
    }
  };

  // Fetch user's Discord guilds (with caching)
  const fetchDiscordGuilds = async (forceRefresh = false) => {
    if (!session?.provider_token) {
      console.log('No provider token available');
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedDiscordData();
      if (cached) {
        console.log('Using cached Discord data (age:', Math.round((Date.now() - cached.timestamp) / 1000), 'seconds)');
        setDiscordGuilds(cached.guilds || []);
        if (cached.memberInfo) {
          setMbaServerMember(cached.memberInfo);
        }
        if (cached.roles) {
          setMbaRoles(cached.roles);
        }
        return;
      }
    }

    try {
      const response = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
        },
      });

      if (response.ok) {
        const guilds: DiscordGuild[] = await response.json();
        setDiscordGuilds(guilds);
        console.log('User guilds:', guilds.map(g => g.name));
      } else if (response.status === 429) {
        console.warn('Rate limited by Discord API, using stale cached data if available');
        const cached = getCachedDiscordData(true); // Accept stale cache when rate limited
        if (cached?.guilds) {
          setDiscordGuilds(cached.guilds);
          console.log('Using stale cache (age:', Math.round((Date.now() - cached.timestamp) / 1000), 'seconds) due to rate limit');
        }
      } else {
        console.error('Failed to fetch guilds:', response.status);
      }
    } catch (error) {
      console.error('Error fetching Discord guilds:', error);
    }
  };

  // Fetch MBA server member info (roles, nickname, etc.) - with caching
  // Returns the member info and parsed roles for immediate use
  const fetchMBAServerInfo = async (forceRefresh = false): Promise<{ memberInfo: DiscordMemberInfo | null; parsedRoles: MBARoles } | null> => {
    if (!session?.provider_token) {
      console.log('No provider token available');
      return null;
    }

    if (!MBA_DISCORD_SERVER_ID) {
      console.log('MBA Discord server ID not configured');
      return null;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedDiscordData();
      if (cached?.memberInfo) {
        console.log('Using cached member info');
        setMbaServerMember(cached.memberInfo);
        if (cached.roles) {
          setMbaRoles(cached.roles);
        }
        return { memberInfo: cached.memberInfo, parsedRoles: cached.roles || defaultMBARoles };
      }
    }

    try {
      // Get member info for the MBA server
      const memberResponse = await fetch(
        `https://discord.com/api/v10/users/@me/guilds/${MBA_DISCORD_SERVER_ID}/member`,
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      );

      if (memberResponse.ok) {
        const memberData = await memberResponse.json();
        const roles = memberData.roles || [];
        
        const memberInfo: DiscordMemberInfo = {
          roles,
          nick: memberData.nick,
          joined_at: memberData.joined_at,
        };
        
        setMbaServerMember(memberInfo);
        
        // Parse and set MBA roles
        const parsedRoles = parseMBARoles(roles);
        setMbaRoles(parsedRoles);
        
        // Update cache with new data
        setCachedDiscordData(discordGuilds, memberInfo, parsedRoles);
        
        console.log('MBA Server member info:', memberData);
        console.log('Raw Discord role IDs:', roles);
        console.log('Parsed MBA roles:', parsedRoles);
        
        return { memberInfo, parsedRoles };
      } else if (memberResponse.status === 404) {
        console.log('User is not a member of the MBA Discord server');
        setMbaServerMember(null);
        setMbaRoles(defaultMBARoles);
        return { memberInfo: null, parsedRoles: defaultMBARoles };
      } else if (memberResponse.status === 429) {
        console.warn('Rate limited by Discord API for member info, using stale cached data');
        const cached = getCachedDiscordData(true); // Accept stale cache when rate limited
        if (cached?.memberInfo) {
          setMbaServerMember(cached.memberInfo);
          if (cached.roles) {
            setMbaRoles(cached.roles);
          }
          console.log('Using stale cache (age:', Math.round((Date.now() - cached.timestamp) / 1000), 'seconds) due to rate limit');
          return { memberInfo: cached.memberInfo, parsedRoles: cached.roles || defaultMBARoles };
        }
        console.warn('No cached data available during rate limit - roles may not display');
      } else {
        console.error('Failed to fetch member info:', memberResponse.status);
      }
    } catch (error) {
      console.error('Error fetching MBA server info:', error);
    }
    return null;
  };

  // Sync Discord roles to database (updates team_id, role, and discord_roles based on Discord roles)
  const syncRolesToDatabase = async (forceRefresh = true): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Not logged in' };
    }

    // Declare variables for Discord role data
    let freshMemberInfo: DiscordMemberInfo | null = mbaServerMember;
    let freshParsedRoles: MBARoles = mbaRoles;
    let wasRateLimited = false;

    // Check if session token expired and try to refresh
    let currentSession = session;
    if (!currentSession?.provider_token) {
      console.log('No provider token - attempting session refresh...');
      
      const { data: { session: refreshedSession }, error: refreshError } = await supabase!.auth.refreshSession();
      
      if (refreshError) {
        console.warn('Session refresh returned an error:', refreshError);
      }
      
      if (!refreshedSession?.provider_token) {
        console.warn('Session refresh did not return a provider token');
        return { 
          success: false, 
          message: 'Discord connection expired (typically after 7 days). Please log out and log back in to reconnect with Discord and sync your roles.' 
        };
      }
      
      // Update the session and use the refreshed session
      setSession(refreshedSession);
      currentSession = refreshedSession;
      console.log('Session and provider token refreshed successfully');
    }

    // Force refresh Discord roles and get the fresh data immediately
    if (forceRefresh) {
      const result = await fetchMBAServerInfo(true);
      if (result) {
        freshMemberInfo = result.memberInfo;
        freshParsedRoles = result.parsedRoles;
      } else {
        // Check if we're using stale cached data due to rate limiting
        const cached = getCachedDiscordData(true);
        if (cached && cached.timestamp < Date.now() - CACHE_DURATION) {
          wasRateLimited = true;
          console.log('Using stale cached roles due to rate limiting');
          // Use cached member info if available
          if (cached.memberInfo) {
            freshMemberInfo = cached.memberInfo;
            freshParsedRoles = cached.roles || mbaRoles;
          }
        }
      }
    }

    // If we have no member info at all, user is not in MBA server
    if (!freshMemberInfo) {
      return { 
        success: false, 
        message: wasRateLimited 
          ? 'Discord API rate limit - using cached roles' 
          : 'Not a member of the MBA Discord server'
      };
    }

    // Get all Discord role IDs from the FRESH member info
    const allDiscordRoleIds = freshMemberInfo?.roles || [];
    
    console.log('Syncing roles - All Discord role IDs:', allDiscordRoleIds);
    console.log('Syncing roles - Parsed roles:', freshParsedRoles);

    // Determine updates based on roles
    const updates: Partial<User> = {};
    let changes: string[] = [];

    // Always store ALL Discord role IDs
    const currentRoles = user.discord_roles || [];
    const rolesChanged = JSON.stringify(currentRoles.sort()) !== JSON.stringify([...allDiscordRoleIds].sort());
    if (rolesChanged) {
      updates.discord_roles = allDiscordRoleIds;
      changes.push(`Discord roles updated (${allDiscordRoleIds.length} roles)`);
    }

    // Update team_id based on team role
    if (freshParsedRoles.teamRoleId) {
      // User has a team role - look up the team by role ID in database
      const teamFromRole = await fetchTeamByRoleId(freshParsedRoles.teamRoleId);
      if (teamFromRole) {
        // Update team if different
        if (user.team_id !== teamFromRole.id) {
          updates.team_id = teamFromRole.id;
          changes.push(`Team updated to ${teamFromRole.name || (teamFromRole as any).team_name}`);
        }
      } else {
        console.warn(`Team with role ID ${freshParsedRoles.teamRoleId} not found in database`);
        return { success: false, message: `Team not linked in database. Ask an admin to use /linkteam.` };
      }
    } else if (freshParsedRoles.isFreeAgent) {
      // User has the Free Agent role - remove from team
      if (user.team_id !== null) {
        updates.team_id = null;
        changes.push(`Set as Free Agent (removed from team)`);
      }
    } else if (user.team_id !== null) {
      // User has no team role AND no free agent role, but is on a team
      // This means they lost their team role - remove them from the team
      updates.team_id = null;
      changes.push(`Removed from team (no team role found)`);
    }

    // Update role based on position roles
    // Logic: Admin if Owner/Developer, otherwise everyone is a Player by default
    let newRole: User['role'] = 'player'; // Default role is player
    
    if (freshParsedRoles.isOwner || freshParsedRoles.isDeveloper) {
      // Only Owner and Developer roles get admin
      newRole = 'admin';
    } else if (freshParsedRoles.isFranchiseOwner || freshParsedRoles.isGeneralManager || freshParsedRoles.isHeadCoach || freshParsedRoles.isAssistantCoach) {
      // Franchise Owner, GM, coaches get coach role
      newRole = 'coach';
    }
    // Everyone else stays as 'player' (the default)

    if (newRole !== user.role) {
      updates.role = newRole;
      changes.push(`Role updated to ${newRole}`);
    }

    // If no changes needed
    if (Object.keys(updates).length === 0) {
      return { success: true, message: 'Already synced - no changes needed' };
    }

    // Apply updates
    const result = await updateUser(user.id, updates);
    if (result) {
      // Update local user state
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('mba_user', JSON.stringify(updatedUser));
      return { success: true, message: changes.join(', ') };
    } else {
      return { success: false, message: 'Failed to update database' };
    }
  };

  // Load user from Supabase auth data
  const loadUserFromSupabaseAuth = async (authUser: SupabaseUser, isNewLogin = false) => {
    try {
      // First check localStorage for cached user
      const storedUser = localStorage.getItem('mba_user');
      if (storedUser && !isNewLogin) {
        try {
          const cached = JSON.parse(storedUser);
          // Verify the cached user matches the auth user
          const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub;
          if (cached.id === `discord-${discordId}`) {
            setUser(cached);
            return false; // Use cached user, don't hit database. Return false = not new user
          }
        } catch {
          // Invalid cached data, continue to fetch
        }
      }

      // Get Discord ID first
      const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub;
      const expectedUserId = `discord-${discordId}`;
      
      // Check if user exists in database by their specific ID (fast query)
      let matchedUser: User | null = null;
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', expectedUserId)
            .maybeSingle();
          
          if (!error && data) {
            matchedUser = data as User;
          }
        } catch (e) {
          console.warn('Failed to fetch user from database:', e);
        }
      }

      if (matchedUser) {
        setUser(matchedUser);
        localStorage.setItem('mba_user', JSON.stringify(matchedUser));
        return false; // Existing user
      } else {
        // Create a new user from Discord data - default to 'player' role
        const discordUsername = authUser.user_metadata?.full_name || 
                               authUser.user_metadata?.name ||
                               authUser.email?.split('@')[0] ||
                               'NewPlayer';
        const avatarUrl = authUser.user_metadata?.avatar_url || null;
        
        const newUser: User = {
          id: `discord-${discordId || Date.now()}`,
          username: discordUsername,
          display_name: discordUsername,
          avatar_url: avatarUrl,
          bio: 'New MBA player! Connected via Discord.',
          team_id: null,
          role: 'player', // Default role is player (not fan)
          minecraft_username: discordUsername,
          discord_roles: [], // Will be populated by auto-sync
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Set user immediately (don't wait for database)
        setUser(newUser);
        localStorage.setItem('mba_user', JSON.stringify(newUser));

        // Try to create in database in background
        createUser(newUser).catch(err => {
          console.warn('Failed to create user in database:', err);
        });
        
        return true; // New user - needs role sync
      }
    } catch (error) {
      console.error('Error in loadUserFromSupabaseAuth:', error);
      // Create minimal user from auth data as fallback
      const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub;
      const discordUsername = authUser.user_metadata?.full_name || 
                             authUser.user_metadata?.name ||
                             authUser.email?.split('@')[0] ||
                             'NewPlayer';
      
      const fallbackUser: User = {
        id: `discord-${discordId || Date.now()}`,
        username: discordUsername,
        display_name: discordUsername,
        avatar_url: authUser.user_metadata?.avatar_url || null,
        bio: null,
        team_id: null,
        role: 'player', // Default role is player
        minecraft_username: discordUsername,
        discord_roles: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      setUser(fallbackUser);
      localStorage.setItem('mba_user', JSON.stringify(fallbackUser));
      return true; // New user
    }
  };

  // Track if we need to auto-sync after login
  const [needsAutoSync, setNeedsAutoSync] = useState(false);

  // Auto-sync roles when Discord data is ready
  useEffect(() => {
    if (needsAutoSync && mbaServerMember && mbaServerMember.roles.length > 0) {
      console.log('Discord data loaded, performing auto role sync...');
      syncRolesToDatabase(false).then(result => {
        console.log('Auto sync result:', result);
        setNeedsAutoSync(false);
      });
    }
  }, [needsAutoSync, mbaServerMember]);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    let isInitializing = true; // Flag to prevent SIGNED_IN from triggering during init
    
    const initAuth = async () => {
      console.log('Initializing auth...');
      
      try {
        // Check for cache version and clear old/corrupted cache
        const CACHE_VERSION = '1.0';
        const cacheVersion = localStorage.getItem('mba_cache_version');
        
        if (cacheVersion !== CACHE_VERSION) {
          console.log('Cache version mismatch, clearing old cache');
          localStorage.removeItem('mba_user');
          localStorage.removeItem('mba_home_data');
          localStorage.setItem('mba_cache_version', CACHE_VERSION);
        }
        
        // First, check localStorage for cached user (instant)
        const storedUser = localStorage.getItem('mba_user');
        if (storedUser && isMounted) {
          try {
            const cached = JSON.parse(storedUser);
            
            // Validate cached data structure
            if (!cached.id || !cached.username) {
              console.warn('Invalid cached user data, clearing cache');
              localStorage.removeItem('mba_user');
              setIsLoading(true);
            } else {
              setUser(cached);
              console.log('Loaded cached user:', cached.username);
              // Set loading to false immediately - we have data to show
              setIsLoading(false);
            }
          } catch (err) {
            console.error('Failed to parse cached user:', err);
            localStorage.removeItem('mba_user');
            setIsLoading(true); // Need to load from database
          }
        } else {
          // No cached user - need to fetch from database
          setIsLoading(true);
        }

        // Then check for Supabase session in background
        if (isSupabaseConfigured() && supabase) {
          console.log('Checking for Supabase session...');
          
          try {
            // Add timeout to prevent hanging
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Session check timeout')), 3000)
            );
            
            const { data: { session: currentSession }, error } = await Promise.race([
              sessionPromise,
              timeoutPromise
            ]) as any;
            
            if (error) {
              console.error('Error getting session:', error);
              
              // If session validation fails with specific errors, clear corrupted cache
              if (error.message?.includes('invalid') || error.message?.includes('expired')) {
                console.warn('Invalid/expired session detected, clearing cache');
                localStorage.removeItem('mba_user');
                localStorage.removeItem('mba_home_data');
                await supabase?.auth.signOut();
              }
              
              setIsLoading(false);
              isInitializing = false;
              return;
            }
            
            if (currentSession && isMounted) {
              console.log('Found Supabase session');
              setSession(currentSession);
              setSupabaseUser(currentSession.user);
              
              // Load fresh user data from database (updates in background)
              await loadUserFromSupabaseAuth(currentSession.user);
              setIsLoading(false); // Done loading
            } else if (!currentSession && !storedUser) {
              // No session and no cache - user is not logged in
              console.log('No session found, not logged in');
              setIsLoading(false);
            } else if (!currentSession && storedUser) {
              // Have cache but no session - session may have expired
              console.log('Session expired, clearing old cache');
              localStorage.removeItem('mba_user');
              setUser(null);
              setIsLoading(false);
            }
          } catch (err) {
            console.warn('Session check failed or timed out:', err);
            // If we have cached user, continue using it
            if (storedUser) {
              console.log('Using cached user after session check failure');
            }
            setIsLoading(false);
            isInitializing = false;
          }
        } else if (!storedUser) {
          // No supabase and no cache
          console.log('No Supabase configured');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsLoading(false);
      } finally {
        // Mark initialization as complete
        isInitializing = false;
      }
    };

    initAuth();

    // Set up auth state listener
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('Auth state changed:', event);
          
          // Ignore events during initialization to prevent double-loading
          if (isInitializing) {
            console.log('Ignoring event during initialization:', event);
            return;
          }
          
          if (isMounted) {
            setSession(newSession);
            setSupabaseUser(newSession?.user || null);
            
            if (newSession?.user) {
              // Only reload user on actual new sign-in, not on initial page load
              if (event === 'SIGNED_IN') {
                await loadUserFromSupabaseAuth(newSession.user, true);
                
                // Always trigger auto-sync on fresh login to ensure roles are up-to-date
                console.log('Sign-in detected, will auto-sync roles when Discord data loads...');
                setNeedsAutoSync(true);
              }
              // INITIAL_SESSION and TOKEN_REFRESHED are ignored - we use cached data
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setMbaRoles(defaultMBARoles);
              setDiscordGuilds([]);
              setMbaServerMember(null);
              localStorage.removeItem('mba_user');
            }
          }
        }
      );
      subscription = data.subscription;
    }
    
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Fetch Discord data when session is available
  useEffect(() => {
    if (session?.provider_token) {
      console.log('Session has provider token, fetching Discord data...');
      fetchDiscordGuilds();
      fetchMBAServerInfo();
    }
  }, [session?.provider_token]);

  // Keep session alive by refreshing it periodically
  useEffect(() => {
    if (!session || !supabase) return;

    // Refresh session every 2 minutes to keep connection active and check provider token
    const refreshInterval = setInterval(async () => {
      try {
        console.log('Refreshing session to keep it alive...');
        const { data, error } = await supabase!.auth.refreshSession();
        if (error) {
          console.error('Session refresh error:', error);
        } else if (data.session) {
          // Check if provider token is missing or will expire soon
          if (!data.session.provider_token) {
            console.warn('Provider token is missing after refresh - Discord connection may need re-authentication');
            console.warn('User will need to log out and log back in to restore Discord sync functionality');
          }
          setSession(data.session);
          console.log('Session refreshed successfully', data.session.provider_token ? '(provider token OK)' : '(provider token MISSING)');
        }
      } catch (err) {
        console.error('Failed to refresh session:', err);
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(refreshInterval);
  }, [session]);

  // Login with Discord OAuth
  const loginWithDiscord = async () => {
    if (!isSupabaseConfigured() || !supabase) {
      console.error('Supabase not configured');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Request guild and member read scopes to see servers and roles
        scopes: 'identify email guilds guilds.members.read',
      },
    });

    if (error) {
      console.error('Discord login error:', error);
      throw error;
    }
  };

  // Legacy login with username/password
  const login = async (username: string, _password: string): Promise<boolean> => {
    const users = await fetchUsers();
    
    const foundUser = users.find(
      u => u.username.toLowerCase() === username.toLowerCase() || 
           u.minecraft_username.toLowerCase() === username.toLowerCase()
    );

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('mba_user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  // Logout
  const logout = async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state regardless of Supabase logout success
      setUser(null);
      setSupabaseUser(null);
      setSession(null);
      setDiscordGuilds([]);
      setMbaServerMember(null);
      setMbaServerRoles([]);
      setMbaRoles(defaultMBARoles);
      // Clear ALL cached data
      localStorage.removeItem('mba_user');
      localStorage.removeItem(DISCORD_CACHE_KEY);
    }
  };

  // Register new user
  const register = async (
    username: string, 
    _email: string, 
    _password: string, 
    minecraftUsername: string
  ): Promise<boolean> => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      display_name: username,
      avatar_url: null,
      bio: 'New MBA fan!',
      team_id: null,
      role: 'fan',
      minecraft_username: minecraftUsername,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem('mba_user', JSON.stringify(newUser));
    return true;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      supabaseUser,
      session,
      isAuthenticated: !!user, 
      isLoading, 
      discordGuilds,
      mbaServerMember,
      mbaServerRoles,
      mbaRoles,
      isInMBAServer,
      login, 
      loginWithDiscord,
      logout, 
      register,
      fetchDiscordGuilds,
      fetchMBAServerInfo,
      syncRolesToDatabase,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
