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

// MBA Discord Server ID - UPDATE THIS with your actual server ID
const MBA_DISCORD_SERVER_ID = '1450671860520976559';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  discordGuilds: DiscordGuild[];
  mbaServerMember: DiscordMemberInfo | null;
  mbaServerRoles: DiscordRole[];
  isInMBAServer: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string, minecraftUsername: string) => Promise<boolean>;
  fetchDiscordGuilds: () => Promise<void>;
  fetchMBAServerInfo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [discordGuilds, setDiscordGuilds] = useState<DiscordGuild[]>([]);
  const [mbaServerMember, setMbaServerMember] = useState<DiscordMemberInfo | null>(null);
  const [mbaServerRoles, setMbaServerRoles] = useState<DiscordRole[]>([]);

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
        setMbaServerMember({
          roles: memberData.roles || [],
          nick: memberData.nick,
          joined_at: memberData.joined_at,
        });
        console.log('MBA Server member info:', memberData);
      } else if (memberResponse.status === 404) {
        console.log('User is not a member of the MBA Discord server');
        setMbaServerMember(null);
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
    const initAuth = async () => {
      // Check for Supabase session
      if (isSupabaseConfigured() && supabase) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setSupabaseUser(currentSession.user);
          await loadUserFromSupabaseAuth(currentSession.user);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: Check localStorage for legacy sessions
      const storedUser = localStorage.getItem('mba_user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('mba_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // Set up auth state listener
    if (isSupabaseConfigured() && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('Auth state changed:', event, newSession?.user?.email);
          
          setSession(newSession);
          setSupabaseUser(newSession?.user || null);
          
          if (newSession?.user) {
            await loadUserFromSupabaseAuth(newSession.user);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem('mba_user');
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
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
    if (isSupabaseConfigured() && supabase && session) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    setDiscordGuilds([]);
    setMbaServerMember(null);
    setMbaServerRoles([]);
    localStorage.removeItem('mba_user');
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
