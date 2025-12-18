import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockUsers, mockPlayerStats, getTeamById } from '../data/mockData';
import { calculateStats } from '../utils/helpers';
import MinecraftHead from '../components/MinecraftHead';

type SortKey = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg';

export default function Stats() {
  const [sortBy, setSortBy] = useState<SortKey>('ppg');

  // Get all players with stats
  const playersWithStats = mockUsers
    .filter(u => u.role === 'player')
    .map(player => {
      const stats = mockPlayerStats.find(s => s.user_id === player.id);
      const team = player.team_id ? getTeamById(player.team_id) : null;
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

  return (
    <div className="space-y-6">
      <div className="mc-card p-6">
        <h1 className="text-2xl font-bold text-mc-text mb-2">Player Statistics</h1>
        <p className="text-mc-text-muted">Season statistical leaders and rankings</p>
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
