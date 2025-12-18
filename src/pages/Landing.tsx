import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTeams, fetchUsers } from '../data/dataService';
import { useAuth } from '../context/AuthContext';
import { Team, User } from '../types';

export default function Landing() {
  const { loginWithDiscord } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [_loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [teamsData, usersData] = await Promise.all([
          fetchTeams(),
          fetchUsers(),
        ]);
        setTeams(teamsData);
        setUsers(usersData);
      } catch (err) {
        console.error('Error loading landing data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDiscordLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithDiscord();
    } catch (err) {
      console.error('Discord login failed:', err);
      setIsLoggingIn(false);
    }
  };

  const playerCount = users.filter(u => u.role === 'player').length;
  const teamCount = teams.length;

  return (
    <div className="min-h-screen bg-mc-dark">
      {/* Hero Section */}
      <div className="bg-mc-darker border-b-2 border-mc-border">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <img src="/mba-logo.png" alt="MBA" className="w-20 h-20" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-mc-text mb-4">
            Minecraft Basketball Association
          </h1>
          <p className="text-xl text-mc-text-muted mb-8 max-w-2xl mx-auto">
            The official hub for MBA players, teams, and free agents. 
            Track stats, find teams, and stay updated on league news.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={handleDiscordLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 px-6 py-3 bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors rounded text-lg disabled:opacity-50"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              {isLoggingIn ? 'Connecting...' : 'Connect with Discord'}
            </button>
            <Link
              to="/teams"
              className="px-6 py-3 bg-mc-surface text-mc-text border border-mc-border hover:bg-mc-surface-light transition-colors rounded text-lg"
            >
              View Teams
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-mc-surface border-b border-mc-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-mc-accent">{teamCount}</div>
              <div className="text-mc-text-muted">Teams</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-mc-accent">{playerCount}</div>
              <div className="text-mc-text-muted">Players</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-mc-accent">S0</div>
              <div className="text-mc-text-muted">Current Season</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="mc-card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-mc-accent text-white flex items-center justify-center text-2xl rounded">
              📋
            </div>
            <h3 className="text-lg font-bold text-mc-text mb-2">Free Agency</h3>
            <p className="text-mc-text-muted">
              List yourself as a free agent and get discovered by teams.
            </p>
          </div>
          <div className="mc-card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-mc-accent text-white flex items-center justify-center text-2xl rounded">
              📊
            </div>
            <h3 className="text-lg font-bold text-mc-text mb-2">Stats Tracking</h3>
            <p className="text-mc-text-muted">
              Track your performance with detailed stats across all games.
            </p>
          </div>
          <div className="mc-card p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-mc-accent text-white flex items-center justify-center text-2xl rounded">
              🏆
            </div>
            <h3 className="text-lg font-bold text-mc-text mb-2">Team Pages</h3>
            <p className="text-mc-text-muted">
              View team rosters, stats, and records all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Teams Preview */}
      <div className="bg-mc-darker border-t border-mc-border">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-mc-text text-center mb-8">Current Teams</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {teams.slice(0, 8).map(team => {
              return (
                <Link 
                  key={team.id}
                  to={`/team/${team.id}`}
                  className="mc-card p-4 hover:border-mc-accent transition-colors text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    {team.logo_url ? (
                      <img 
                        src={team.logo_url} 
                        alt={team.name}
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded flex items-center justify-center text-white font-bold text-xl"
                        style={{ backgroundColor: team.primary_color }}
                      >
                        {team.abbreviation}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-mc-text text-sm">{team.name}</div>
                      <div className="text-xs text-mc-text-muted">{team.wins}-{team.losses}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Link to="/teams" className="text-mc-accent hover:underline font-bold">
              View All Teams →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-mc-darker border-t border-mc-border py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-mc-text-muted">© 2024 Minecraft Basketball Association</p>
          <p className="text-sm text-mc-text-muted mt-2 opacity-60">Not affiliated with Mojang or Microsoft</p>
        </div>
      </footer>
    </div>
  );
}
