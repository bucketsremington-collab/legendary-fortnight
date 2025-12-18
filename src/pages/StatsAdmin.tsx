import { useState, useEffect } from 'react';
import { mockUsers, mockTeams, mockPlayerStats } from '../data/mockData';
import { upsertPlayerStats, fetchPlayerStatsByUserIdAndSeason, checkSupabaseConnection } from '../data/dataService';
import { isSupabaseConfigured } from '../lib/supabase';
import { calculateStats } from '../utils/helpers';
import MinecraftHead from '../components/MinecraftHead';

interface PlayerStatInput {
  user_id: string;
  season: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  points_scored: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  three_pointers_made: number;
  three_pointers_attempted: number;
  field_goals_made: number;
  field_goals_attempted: number;
  free_throws_made: number;
  free_throws_attempted: number;
  turnovers: number;
  fouls: number;
  minutes_played: number;
}

const defaultStats: Omit<PlayerStatInput, 'user_id' | 'season'> = {
  games_played: 0,
  games_won: 0,
  games_lost: 0,
  points_scored: 0,
  assists: 0,
  rebounds: 0,
  steals: 0,
  blocks: 0,
  three_pointers_made: 0,
  three_pointers_attempted: 0,
  field_goals_made: 0,
  field_goals_attempted: 0,
  free_throws_made: 0,
  free_throws_attempted: 0,
  turnovers: 0,
  fouls: 0,
  minutes_played: 0,
};

export default function StatsAdmin() {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [season, setSeason] = useState<string>('S1');
  const [stats, setStats] = useState<PlayerStatInput>({ ...defaultStats, user_id: '', season: 'S1' });
  const [calculatedStats, setCalculatedStats] = useState<ReturnType<typeof calculateStats> | null>(null);
  const [savedStats, setSavedStats] = useState<PlayerStatInput[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Check Supabase connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (isSupabaseConfigured()) {
        const connected = await checkSupabaseConnection();
        setIsSupabaseConnected(connected);
      }
    };
    checkConnection();
  }, []);

  // Load saved stats from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mba-stats');
    if (saved) {
      setSavedStats(JSON.parse(saved));
    }
  }, []);

  // Calculate stats whenever input changes
  useEffect(() => {
    if (stats.games_played > 0) {
      const calculated = calculateStats({
        id: 'temp',
        ...stats,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setCalculatedStats(calculated);
    } else {
      setCalculatedStats(null);
    }
  }, [stats]);

  // Update stats when player selection changes
  useEffect(() => {
    const loadStats = async () => {
      if (selectedPlayer) {
        // First check if we have saved stats in localStorage for this player/season
        const existingStats = savedStats.find(
          s => s.user_id === selectedPlayer && s.season === season
        );
        
        if (existingStats) {
          setStats(existingStats);
          return;
        }

        // If Supabase is connected, try to fetch from there
        if (isSupabaseConnected) {
          const dbStats = await fetchPlayerStatsByUserIdAndSeason(selectedPlayer, season);
          if (dbStats) {
            setStats({
              user_id: dbStats.user_id,
              season: dbStats.season,
              games_played: dbStats.games_played,
              games_won: dbStats.games_won,
              games_lost: dbStats.games_lost,
              points_scored: dbStats.points_scored,
              assists: dbStats.assists,
              rebounds: dbStats.rebounds,
              steals: dbStats.steals,
              blocks: dbStats.blocks,
              three_pointers_made: dbStats.three_pointers_made,
              three_pointers_attempted: dbStats.three_pointers_attempted,
              field_goals_made: dbStats.field_goals_made,
              field_goals_attempted: dbStats.field_goals_attempted,
              free_throws_made: dbStats.free_throws_made,
              free_throws_attempted: dbStats.free_throws_attempted,
              turnovers: dbStats.turnovers,
              fouls: dbStats.fouls,
              minutes_played: dbStats.minutes_played,
            });
            return;
          }
        }

        // Check mockData for existing stats
        const mockStat = mockPlayerStats.find(
          s => s.user_id === selectedPlayer && s.season === season
        );
        
        if (mockStat) {
          setStats({
            user_id: mockStat.user_id,
            season: mockStat.season,
            games_played: mockStat.games_played,
            games_won: mockStat.games_won,
            games_lost: mockStat.games_lost,
            points_scored: mockStat.points_scored,
            assists: mockStat.assists,
            rebounds: mockStat.rebounds,
            steals: mockStat.steals,
            blocks: mockStat.blocks,
            three_pointers_made: mockStat.three_pointers_made,
            three_pointers_attempted: mockStat.three_pointers_attempted,
            field_goals_made: mockStat.field_goals_made,
            field_goals_attempted: mockStat.field_goals_attempted,
            free_throws_made: mockStat.free_throws_made,
            free_throws_attempted: mockStat.free_throws_attempted,
            turnovers: mockStat.turnovers,
            fouls: mockStat.fouls,
            minutes_played: mockStat.minutes_played,
          });
        } else {
          setStats({ ...defaultStats, user_id: selectedPlayer, season });
        }
      }
    };
    loadStats();
  }, [selectedPlayer, season, savedStats, isSupabaseConnected]);

  const handleInputChange = (field: keyof PlayerStatInput, value: number) => {
    setStats(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedPlayer) {
      alert('Please select a player first');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    const newStats = { ...stats, user_id: selectedPlayer, season };

    // Save to localStorage first (always works)
    const existingIndex = savedStats.findIndex(
      s => s.user_id === selectedPlayer && s.season === season
    );

    let updated: PlayerStatInput[];
    if (existingIndex >= 0) {
      updated = [...savedStats];
      updated[existingIndex] = newStats;
    } else {
      updated = [...savedStats, newStats];
    }

    setSavedStats(updated);
    localStorage.setItem('mba-stats', JSON.stringify(updated));

    // If Supabase is connected, also save there
    if (isSupabaseConnected) {
      const result = await upsertPlayerStats(newStats);
      if (result) {
        setSaveMessage('Stats saved to database and locally!');
      } else {
        setSaveMessage('Stats saved locally (database save failed)');
      }
    } else {
      setSaveMessage('Stats saved locally (database not connected)');
    }

    setIsSaving(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(savedStats, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'mba-player-stats.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const selectedUser = mockUsers.find(u => u.id === selectedPlayer);
  const selectedTeam = selectedUser?.team_id ? mockTeams.find(t => t.id === selectedUser.team_id) : null;

  return (
    <div className="space-y-6">
      <div className="mc-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-mc-text mb-2">Stats Admin</h1>
            <p className="text-mc-text-muted">
              Manage player statistics. {isSupabaseConnected ? 'Data saves to Supabase database.' : 'Data saves to local storage.'}
            </p>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-bold ${isSupabaseConnected ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
            {isSupabaseConnected ? '● Database Connected' : '○ Local Storage Mode'}
          </div>
        </div>
      </div>

      {/* Player Selection */}
      <div className="mc-card p-6">
        <h2 className="text-lg font-bold text-mc-text mb-4">Select Player</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-mc-text-muted mb-2">Player</label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
            >
              <option value="">-- Select Player --</option>
              {mockUsers.filter(u => u.role === 'player').map(user => (
                <option key={user.id} value={user.id}>
                  {user.minecraft_username} (@{user.username})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-mc-text-muted mb-2">Season</label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
            >
              <option value="S1">Season 1</option>
              <option value="S2">Season 2</option>
              <option value="S3">Season 3</option>
            </select>
          </div>
        </div>

        {selectedUser && (
          <div className="mt-4 p-4 bg-mc-darker rounded border border-mc-border flex items-center gap-4">
            <MinecraftHead username={selectedUser.minecraft_username} size={48} />
            <div>
              <div className="font-bold text-mc-text">{selectedUser.minecraft_username}</div>
              {selectedTeam && (
                <div className="text-sm text-mc-text-muted">{selectedTeam.name}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Input */}
      {selectedPlayer && (
        <div className="mc-card p-6">
          <h2 className="text-lg font-bold text-mc-text mb-4">Enter Stats (Totals)</h2>
          
          {/* Game Record */}
          <div className="mb-6">
            <h3 className="text-mc-text-muted font-bold mb-3">Game Record</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Games Played</label>
                <input
                  type="number"
                  min="0"
                  value={stats.games_played}
                  onChange={(e) => handleInputChange('games_played', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Wins</label>
                <input
                  type="number"
                  min="0"
                  value={stats.games_won}
                  onChange={(e) => handleInputChange('games_won', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Losses</label>
                <input
                  type="number"
                  min="0"
                  value={stats.games_lost}
                  onChange={(e) => handleInputChange('games_lost', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
            </div>
          </div>

          {/* Scoring */}
          <div className="mb-6">
            <h3 className="text-mc-text-muted font-bold mb-3">Scoring</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Total Points</label>
                <input
                  type="number"
                  min="0"
                  value={stats.points_scored}
                  onChange={(e) => handleInputChange('points_scored', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">FG Made</label>
                <input
                  type="number"
                  min="0"
                  value={stats.field_goals_made}
                  onChange={(e) => handleInputChange('field_goals_made', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">FG Attempted</label>
                <input
                  type="number"
                  min="0"
                  value={stats.field_goals_attempted}
                  onChange={(e) => handleInputChange('field_goals_attempted', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">3PT Made</label>
                <input
                  type="number"
                  min="0"
                  value={stats.three_pointers_made}
                  onChange={(e) => handleInputChange('three_pointers_made', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">3PT Attempted</label>
                <input
                  type="number"
                  min="0"
                  value={stats.three_pointers_attempted}
                  onChange={(e) => handleInputChange('three_pointers_attempted', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">FT Made</label>
                <input
                  type="number"
                  min="0"
                  value={stats.free_throws_made}
                  onChange={(e) => handleInputChange('free_throws_made', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">FT Attempted</label>
                <input
                  type="number"
                  min="0"
                  value={stats.free_throws_attempted}
                  onChange={(e) => handleInputChange('free_throws_attempted', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
            </div>
          </div>

          {/* Other Stats */}
          <div className="mb-6">
            <h3 className="text-mc-text-muted font-bold mb-3">Other Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Rebounds</label>
                <input
                  type="number"
                  min="0"
                  value={stats.rebounds}
                  onChange={(e) => handleInputChange('rebounds', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Assists</label>
                <input
                  type="number"
                  min="0"
                  value={stats.assists}
                  onChange={(e) => handleInputChange('assists', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Steals</label>
                <input
                  type="number"
                  min="0"
                  value={stats.steals}
                  onChange={(e) => handleInputChange('steals', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Blocks</label>
                <input
                  type="number"
                  min="0"
                  value={stats.blocks}
                  onChange={(e) => handleInputChange('blocks', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Turnovers</label>
                <input
                  type="number"
                  min="0"
                  value={stats.turnovers}
                  onChange={(e) => handleInputChange('turnovers', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Fouls</label>
                <input
                  type="number"
                  min="0"
                  value={stats.fouls}
                  onChange={(e) => handleInputChange('fouls', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-mc-text-muted mb-1">Minutes Played</label>
                <input
                  type="number"
                  min="0"
                  value={stats.minutes_played}
                  onChange={(e) => handleInputChange('minutes_played', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-mc-accent text-white font-bold rounded hover:bg-mc-accent-hover transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Stats'}
              </button>
              <button
                onClick={handleExport}
                className="px-6 py-2 bg-mc-surface border border-mc-border text-mc-text font-bold rounded hover:bg-mc-surface-light transition-colors"
              >
                Export All Stats
              </button>
            </div>
            {saveMessage && (
              <div className={`text-sm ${saveMessage.includes('database') && saveMessage.includes('locally!') ? 'text-green-500' : 'text-yellow-500'}`}>
                {saveMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculated Averages */}
      {calculatedStats && (
        <div className="mc-card p-6">
          <h2 className="text-lg font-bold text-mc-text mb-4">Auto-Calculated Averages</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-2xl font-bold text-mc-accent">{calculatedStats.ppg}</div>
              <div className="text-sm text-mc-text-muted">PPG</div>
            </div>
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-2xl font-bold text-mc-text">{calculatedStats.rpg}</div>
              <div className="text-sm text-mc-text-muted">RPG</div>
            </div>
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-2xl font-bold text-mc-text">{calculatedStats.apg}</div>
              <div className="text-sm text-mc-text-muted">APG</div>
            </div>
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-2xl font-bold text-mc-text">{calculatedStats.spg}</div>
              <div className="text-sm text-mc-text-muted">SPG</div>
            </div>
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-2xl font-bold text-mc-text">{calculatedStats.bpg}</div>
              <div className="text-sm text-mc-text-muted">BPG</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-xl font-bold text-mc-text">{calculatedStats.fg_pct}%</div>
              <div className="text-sm text-mc-text-muted">FG%</div>
            </div>
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-xl font-bold text-mc-text">{calculatedStats.three_pct}%</div>
              <div className="text-sm text-mc-text-muted">3P%</div>
            </div>
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-xl font-bold text-mc-text">{calculatedStats.ft_pct}%</div>
              <div className="text-sm text-mc-text-muted">FT%</div>
            </div>
            <div className="text-center p-4 bg-mc-darker rounded">
              <div className="text-xl font-bold text-mc-text">{calculatedStats.win_pct}%</div>
              <div className="text-sm text-mc-text-muted">Win%</div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Stats Summary */}
      {savedStats.length > 0 && (
        <div className="mc-card p-6">
          <h2 className="text-lg font-bold text-mc-text mb-4">Saved Stats ({savedStats.length})</h2>
          <div className="space-y-2">
            {savedStats.map((s, i) => {
              const user = mockUsers.find(u => u.id === s.user_id);
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-mc-darker rounded">
                  <div className="flex items-center gap-3">
                    {user && <MinecraftHead username={user.minecraft_username} size={32} />}
                    <div>
                      <div className="font-bold text-mc-text">{user?.minecraft_username || 'Unknown'}</div>
                      <div className="text-sm text-mc-text-muted">{s.season} • {s.games_played} games</div>
                    </div>
                  </div>
                  <div className="text-mc-text-muted">
                    {s.points_scored} pts • {s.rebounds} reb • {s.assists} ast
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
