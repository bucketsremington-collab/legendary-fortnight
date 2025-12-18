import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Search, Menu, X, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchUsers } from '../data/dataService';
import { User } from '../types';
import MinecraftHead from './MinecraftHead';

export default function Navbar() {
  const { user, isAuthenticated, logout, loginWithDiscord } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers().then(setAllUsers);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const foundUser = allUsers.find(
        u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
             u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             u.minecraft_username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (foundUser) {
        navigate(`/profile/${foundUser.username}`);
        setSearchQuery('');
      }
    }
  };

  const handleDiscordConnect = async () => {
    try {
      await loginWithDiscord();
    } catch (error) {
      console.error('Discord login error:', error);
    }
  };

  return (
    <nav className="bg-mc-darker border-b-2 border-mc-border">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/mba-logo.png" alt="MBA" className="w-8 h-8" />
            <span className="text-xl font-bold text-mc-text">MBA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/home" className="text-mc-text-muted hover:text-mc-text transition-colors">
              Home
            </Link>
            <Link to="/teams" className="text-mc-text-muted hover:text-mc-text transition-colors">
              Teams
            </Link>
            <Link to="/stats" className="text-mc-text-muted hover:text-mc-text transition-colors">
              Stats
            </Link>
            <Link to="/games" className="text-mc-text-muted hover:text-mc-text transition-colors">
              Games
            </Link>
            <Link to="/free-agents" className="text-mc-text-muted hover:text-mc-text transition-colors">
              Free Agents
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 px-3 py-1.5 pr-8 bg-mc-surface border border-mc-border text-mc-text placeholder-mc-text-muted focus:outline-none focus:border-mc-accent rounded"
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-mc-text-muted" />
            </div>
          </form>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex items-center justify-center w-9 h-9 bg-mc-surface border border-mc-border text-mc-text-muted hover:text-mc-text hover:border-mc-accent rounded transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Discord Connect / User */}
          <div className="hidden md:block">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link to={`/profile/${user.username}`} className="flex items-center gap-2 hover:opacity-80">
                  <MinecraftHead username={user.minecraft_username} size={28} />
                  <span className="text-mc-text">{user.display_name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-mc-text-muted hover:text-mc-text text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleDiscordConnect}
                className="flex items-center gap-2 px-4 py-1.5 bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors rounded"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Connect
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-mc-text"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-mc-darker border-t border-mc-border">
          <div className="px-4 py-3 space-y-3">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded"
              />
            </form>
            <Link to="/home" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-mc-text">Home</Link>
            <Link to="/teams" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-mc-text">Teams</Link>
            <Link to="/stats" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-mc-text">Stats</Link>
            <Link to="/games" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-mc-text">Games</Link>
            <Link to="/free-agents" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-mc-text">Free Agents</Link>
            
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 py-2 text-mc-text"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            
            <hr className="border-mc-border" />
            {isAuthenticated ? (
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full py-2 text-left text-mc-text-muted">
                Logout
              </button>
            ) : (
              <button onClick={handleDiscordConnect} className="w-full flex items-center justify-center gap-2 py-2 bg-[#5865F2] text-white rounded">
                Connect Discord
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
