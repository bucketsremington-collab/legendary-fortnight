import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { fetchUsers, createUser } from '../data/dataService';
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
export const TEAM_ROLE_TO_TEAM_ID: Record<string, string> = {
  [MBA_ROLE_IDS.WIZARDS]: 'team-wizards',
  [MBA_ROLE_IDS.BOWS]: 'team-bows',
  [MBA_ROLE_IDS.SIXTY_FOURS]: 'team-64s',
  [MBA_ROLE_IDS.BUCKETS]: 'team-buckets',
  [MBA_ROLE_IDS.MAGMA_CUBES]: 'team-magma-cubes',
  [MBA_ROLE_IDS.CREEPERS]: 'team-creepers',
  [MBA_ROLE_IDS.ALLAYS]: 'team-allays',
  [MBA_ROLE_IDS.BREEZE]: 'team-breeze',
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
  
  return {
    isOwner: roleIds.includes(MBA_ROLE_IDS.OWNER),
    isDeveloper: roleIds.includes(MBA_ROLE_IDS.DEVELOPER),
    isModerator: roleIds.includes(MBA_ROLE_IDS.MODERATOR),
    isStaff: roleIds.includes(MBA_ROLE_IDS.OWNER) || 
             roleIds.includes(MBA_ROLE_IDS.DEVELOPER) || 
             roleIds.includes(MBA_ROLE_IDS.MODERATOR),
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
  fetchDiscordGuilds: () => Promise<void>;
  fetchMBAServerInfo: () => Promise<void>;
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

  // Fetch user's Discord guilds
  const fetchDiscordGuilds = async () => {
    if (!session?.provider_token) {
      console.log('No provider token available');
      return;
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
      } else {
        console.error('Failed to fetch guilds:', response.status);
      }
    } catch (error) {
      console.error('Error fetching Discord guilds:', error);
    }
  };

  // Fetch MBA server member info (roles, nickname, etc.)
  const fetchMBAServerInfo = async () => {
    if (!session?.provider_token) {
      console.log('No provider token available');
      return;
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
        
        setMbaServerMember({
          roles,
          nick: memberData.nick,
          joined_at: memberData.joined_at,
        });
        
        // Parse and set MBA roles
        const parsedRoles = parseMBARoles(roles);
        setMbaRoles(parsedRoles);
        
        console.log('MBA Server member info:', memberData);
        console.log('Parsed MBA roles:', parsedRoles);
      } else if (memberResponse.status === 404) {
        console.log('User is not a member of the MBA Discord server');
        setMbaServerMember(null);
        setMbaRoles(defaultMBARoles);
      } else {
        console.error('Failed to fetch member info:', memberResponse.status);
      }
    } catch (error) {
      console.error('Error fetching MBA server info:', error);
    }
  };

  // Load user from Supabase auth data
  const loadUserFromSupabaseAuth = async (authUser: SupabaseUser) => {
    const users = await fetchUsers();
    
    // Look for a user that matches by Discord ID or email
    const discordId = authUser.user_metadata?.provider_id || authUser.user_metadata?.sub;
    const email = authUser.email;
    
    let matchedUser = users.find(u => 
      (u.id === `discord-${discordId}`) ||
      (email && u.username.toLowerCase() === email.toLowerCase())
    );

    if (matchedUser) {
      setUser(matchedUser);
      localStorage.setItem('mba_user', JSON.stringify(matchedUser));
    } else {
      // Create a new user from Discord data
      const discordUsername = authUser.user_metadata?.full_name || 
                             authUser.user_metadata?.name ||
                             authUser.email?.split('@')[0] ||
                             'NewPlayer';
      const avatarUrl = authUser.user_metadata?.avatar_url || null;
      
      const newUser: Omit<User, 'created_at' | 'updated_at'> = {
        id: `discord-${discordId || Date.now()}`,
        username: discordUsername,
        display_name: discordUsername,
        avatar_url: avatarUrl,
        bio: 'New MBA player! Connected via Discord.',
        team_id: null,
        role: 'fan',
        minecraft_username: discordUsername,
      };

      const createdUser = await createUser(newUser);
      if (createdUser) {
        setUser(createdUser);
        localStorage.setItem('mba_user', JSON.stringify(createdUser));
      }
    }
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      try {
        // Check for Supabase session
        if (isSupabaseConfigured() && supabase) {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error);
          }
          
          if (currentSession && isMounted) {
            setSession(currentSession);
            setSupabaseUser(currentSession.user);
            await loadUserFromSupabaseAuth(currentSession.user);
            setIsLoading(false);
            return;
          }
        }

        // Fallback: Check localStorage for legacy sessions
        const storedUser = localStorage.getItem('mba_user');
        if (storedUser && isMounted) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            localStorage.removeItem('mba_user');
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 5000);

    initAuth();

    // Set up auth state listener
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('Auth state changed:', event, newSession?.user?.email);
          
          if (isMounted) {
            setSession(newSession);
            setSupabaseUser(newSession?.user || null);
            
            if (newSession?.user) {
              await loadUserFromSupabaseAuth(newSession.user);
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              localStorage.removeItem('mba_user');
            }
          }
        }
      );
      subscription = data.subscription;
    }
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
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
      localStorage.removeItem('mba_user');
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
