import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers, fetchPlayerStats, fetchTeams, checkSupabaseConnection } from '../data/dataService';
import { isSupabaseConfigured } from '../lib/supabase';
import { calculateStats } from '../utils/helpers';
import MinecraftHead from '../components/MinecraftHead';
import { User, PlayerStats, Team } from '../types';

type SortKey = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg';

// Available seasons (add more as needed)
const AVAILABLE_SEASONS = ['S0'];

export default function Stats() {
  const [sortBy, setSortBy] = useState<SortKey>('ppg');
  const [selectedSeason, setSelectedSeason] = useState<string>('S0');
  const [users, setUsers] = useState<User[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Load data on mount and when season changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Check connection
      if (isSupabaseConfigured()) {
        const connected = await checkSupabaseConnection();
        setIsDbConnected(connected);
      }
      
      // Fetch data (will use DB if connected, otherwise mock data)
      const [loadedUsers, loadedStats, loadedTeams] = await Promise.all([
        fetchUsers(),
        fetchPlayerStats(selectedSeason),
        fetchTeams()
      ]);
      
      setUsers(loadedUsers);
      setPlayerStats(loadedStats);
      setTeams(loadedTeams);
      setIsLoading(false);
    };
    loadData();
  }, [selectedSeason]);

  // Helper to get team by ID
  const getTeam = (teamId: string | null) => {
    if (!teamId) return null;
    return teams.find(t => t.id === teamId);
  };

  // Get all players with stats
  const playersWithStats = users
    .filter(u => u.role === 'player')
    .map(player => {
      const stats = playerStats.find(s => s.user_id === player.id);
      const team = getTeam(player.team_id);
      return {
        player,
        stats,
        calculated: stats ? calculateStats(stats) : null,
        team
      };
    })
    .filter(p => p.stats && p.calculated);

  // Sort by selected stat
  const sortedPlayers = [...playersWithStats].sort((a, b) => {
    const aVal = a.calculated?.[sortBy] || 0;
    const bVal = b.calculated?.[sortBy] || 0;
    return bVal - aVal;
  });

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'ppg', label: 'Points' },
    { key: 'rpg', label: 'Rebounds' },
    { key: 'apg', label: 'Assists' },
    { key: 'spg', label: 'Steals' },
    { key: 'bpg', label: 'Blocks' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mc-card p-6">
          <h1 className="text-2xl font-bold text-mc-text mb-2">Player Statistics</h1>
          <p className="text-mc-text-muted">Loading stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mc-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-mc-text mb-2">Player Statistics</h1>
            <p className="text-mc-text-muted">
              Season statistical leaders and rankings 
              <span className="text-xs ml-2">
                ({playerStats.length} stat records, {users.filter(u => u.role === 'player').length} players)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Season Dropdown */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              title="Select season"
              className="px-3 py-2 bg-mc-surface border border-mc-border rounded text-mc-text focus:outline-none focus:border-mc-accent"
            >
              {AVAILABLE_SEASONS.map(season => (
                <option key={season} value={season}>
                  Season {season.replace('S', '')}
                </option>
              ))}
            </select>
            <div className={`px-2 py-1 rounded text-xs font-bold ${isDbConnected ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
              {isDbConnected ? 'Live Data' : 'Demo Data'}
            </div>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex flex-wrap gap-2">
        {sortOptions.map(option => (
          <button
            key={option.key}
            onClick={() => setSortBy(option.key)}
            className={`px-4 py-2 rounded transition-colors ${
              sortBy === option.key
                ? 'bg-mc-accent text-white'
                : 'bg-mc-surface text-mc-text-muted border border-mc-border hover:border-mc-accent'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats Table */}
      <div className="mc-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-mc-darker border-b border-mc-border">
              <tr>
                <th className="text-left px-4 py-3 text-mc-text-muted">#</th>
                <th className="text-left px-4 py-3 text-mc-text-muted">Player</th>
                <th className="text-left px-4 py-3 text-mc-text-muted hidden sm:table-cell">Team</th>
                <th className="text-center px-3 py-3 text-mc-text-muted">GP</th>
                <th className={`text-center px-3 py-3 ${sortBy === 'ppg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>PPG</th>
                <th className={`text-center px-3 py-3 ${sortBy === 'rpg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>RPG</th>
                <th className={`text-center px-3 py-3 ${sortBy === 'apg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>APG</th>
                <th className={`text-center px-3 py-3 hidden md:table-cell ${sortBy === 'spg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>SPG</th>
                <th className={`text-center px-3 py-3 hidden md:table-cell ${sortBy === 'bpg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>BPG</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map(({ player, stats, calculated, team }, index) => (
                <tr key={player.id} className="border-b border-mc-border hover:bg-mc-surface-light transition-colors">
                  <td className="px-4 py-3 font-bold text-mc-text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <Link to={`/profile/${player.username}`} className="flex items-center gap-3 hover:opacity-80">
                      <MinecraftHead username={player.minecraft_username} size={32} />
                      <span className="font-bold text-mc-text">{player.minecraft_username}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-mc-text-muted hidden sm:table-cell">
                    {team ? (
                      <Link to={`/team/${team.id}`} className="hover:text-mc-accent">
                        {team.abbreviation}
                      </Link>
                    ) : 'FA'}
                  </td>
                  <td className="text-center px-3 py-3 text-mc-text">{stats?.games_played}</td>
                  <td className={`text-center px-3 py-3 ${sortBy === 'ppg' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                    {calculated?.ppg.toFixed(1)}
                  </td>
                  <td className={`text-center px-3 py-3 ${sortBy === 'rpg' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                    {calculated?.rpg.toFixed(1)}
                  </td>
                  <td className={`text-center px-3 py-3 ${sortBy === 'apg' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                    {calculated?.apg.toFixed(1)}
                  </td>
                  <td className={`text-center px-3 py-3 hidden md:table-cell ${sortBy === 'spg' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                    {calculated?.spg.toFixed(1)}
                  </td>
                  <td className={`text-center px-3 py-3 hidden md:table-cell ${sortBy === 'bpg' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                    {calculated?.bpg.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
