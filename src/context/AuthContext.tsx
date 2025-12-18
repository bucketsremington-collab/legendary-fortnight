import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { mockUsers } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, email: string, password: string, minecraftUsername: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('mba_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('mba_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, _password: string): Promise<boolean> => {
    // Demo mode: find user by username in mock data
    const foundUser = mockUsers.find(
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mba_user');
  };

  const register = async (
    username: string, 
    _email: string, 
    _password: string, 
    minecraftUsername: string
  ): Promise<boolean> => {
    // Demo mode: create a new fan user
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
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout, 
      register 
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
