import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchUsers, fetchPlayerStats, fetchTeams, checkSupabaseConnection } from '../data/dataService';
import { isSupabaseConfigured } from '../lib/supabase';
import { calculateStats } from '../utils/helpers';
import MinecraftHead from '../components/MinecraftHead';
import { User, PlayerStats, Team } from '../types';
import { fetchAllParkStats, ParkGameStats } from '../data/parkStatsService';

type SortKey = 'ppg' | 'rpg' | 'apg' | 'spg' | 'bpg' | 'tpg';
type TotalSortKey = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'tov';

// Available seasons (add more as needed)
const AVAILABLE_SEASONS = ['S0'];

export default function Stats() {
  const [sortBy, setSortBy] = useState<SortKey>('ppg');
  const [totalSortBy, setTotalSortBy] = useState<TotalSortKey>('pts');
  const [showAverages, setShowAverages] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>('S0');
  const [statsType, setStatsType] = useState<'season' | 'park'>('season');
  const [users, setUsers] = useState<User[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [parkStats, setParkStats] = useState<ParkGameStats[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [lastDataLoad, setLastDataLoad] = useState<number>(0);

  // Track component lifecycle
  useEffect(() => {
    console.log('[Stats] Component mounted');
    return () => {
      console.log('[Stats] Component unmounting - cleaning up');
    };
  }, []);

  // Load initial data on mount (users, teams, connection check)
  useEffect(() => {
    const loadInitialData = async () => {
      // Check if we have recent cached data (less than 5 minutes old)
      const cachedTimestamp = localStorage.getItem('mba_stats_timestamp');
      if (cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp);
        if (age < 5 * 60 * 1000) { // 5 minutes
          console.log('[Stats] Using recent data, skipping initial load (age:', Math.floor(age/1000), 'seconds)');
          setIsLoading(false);
          return;
        }
      }
      
      console.log('[Stats] Starting initial data load...');
      setIsLoading(true);
      
      try {
        // Check connection
        if (isSupabaseConfigured()) {
          const connected = await checkSupabaseConnection();
          setIsDbConnected(connected);
        }
        
        // Load users and teams once
        const [loadedUsers, loadedTeams] = await Promise.all([
          fetchUsers(),
          fetchTeams()
        ]);

        console.log('[Stats] Loaded', loadedUsers.length, 'users and', loadedTeams.length, 'teams');
        setUsers(loadedUsers);
        setTeams(loadedTeams);
        
        // Cache timestamp
        localStorage.setItem('mba_stats_timestamp', Date.now().toString());
        
        setIsLoading(false);
        console.log('[Stats] Initial data load complete');
      } catch (error) {
        console.error('[Stats] Error loading initial data:', error);
        setIsLoading(false);
        // Still show page with whatever data we have
      }
    };
    loadInitialData();
  }, []);
  // Load stats data when season or statsType changes (smooth reload)
  useEffect(() => {
    const loadStatsData = async () => {
      if (isLoading) {
        console.log('[Stats] Skipping stats load - initial load not complete');
        return;
      }
      
      // Check if we loaded this data recently
      const now = Date.now();
      if (lastDataLoad > 0 && (now - lastDataLoad) < 30 * 1000) { // 30 seconds
        console.log('[Stats] Skipping stats reload - data is fresh (age:', Math.floor((now - lastDataLoad)/1000), 'seconds)');
        return;
      }
      
      console.log('[Stats] Loading stats data - Type:', statsType, 'Season:', selectedSeason);
      setIsDataLoading(true);
      
      try {
        if (statsType === 'park') {
          console.log('[Stats] Fetching park stats...');
          const loadedParkStats = await fetchAllParkStats(1);
          console.log('[Stats] Park stats loaded:', loadedParkStats.length, 'entries');
          setParkStats(loadedParkStats);
        } else {
          console.log('[Stats] Fetching player stats for season', selectedSeason);
          const loadedStats = await fetchPlayerStats(selectedSeason);
          console.log('[Stats] Player stats loaded:', loadedStats.length, 'entries');
          setPlayerStats(loadedStats);
        }
        setLastDataLoad(Date.now());
        console.log('[Stats] Stats data load complete');
      } catch (error) {
        console.error('[Stats] Error loading stats data:', error);
        // Keep existing data on error
      } finally {
        setIsDataLoading(false);
        console.log('[Stats] Stats loading finished (isDataLoading=false)');
      }
    };
    loadStatsData();
    
    // Reload stats data every 2 minutes to keep it fresh
    console.log('[Stats] Setting up 2-minute reload interval');
    const reloadInterval = setInterval(() => {
      console.log('[Stats] 2-minute interval triggered - reloading stats data');
      loadStatsData();
    }, 2 * 60 * 1000); // 2 minutes
    
    return () => {
      console.log('[Stats] Clearing reload interval');
      clearInterval(reloadInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason, statsType, isLoading, lastDataLoad]);

  // Force reload when tab becomes visible after being hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Stats] Tab became visible - checking if reload needed');
        const now = Date.now();
        if (lastDataLoad > 0 && (now - lastDataLoad) > 60 * 1000) { // More than 1 minute old
          console.log('[Stats] Data is stale, forcing reload');
          setLastDataLoad(0); // Reset to force reload
        }
      } else {
        console.log('[Stats] Tab became hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastDataLoad]);

  // Helper to get team by ID
  const getTeam = (teamId: string | null) => {
    if (!teamId) return null;
    return teams.find(t => t.id === teamId);
  };

  // Get all users with stats - ONLY INCLUDE USERS WHO ARE LOGGED IN (have user account)
  const playersWithStats = statsType === 'park'
    ? parkStats.map(ps => {
        const user = users.find(u => u.minecraft_username.toLowerCase() === ps.player_name.toLowerCase());
        // Skip if no user account found (not logged in)
        if (!user) {
          console.log('[Stats] No user found for park player:', ps.player_name);
          return null;
        }
        
        const team = getTeam(user?.team_id || null);
        return {
          player: {
            id: user.id,
            username: user.username,
            minecraft_username: ps.player_name,
            minecraft_uuid: ps.player_uuid,
            team_id: user.team_id,
          },
          stats: {
            id: '',
            user_id: user.id,
            season: 'S1',
            games_played: ps.games_played,
            games_won: ps.wins,
            games_lost: ps.losses,
            points_scored: ps.points,
            assists: ps.assists,
            rebounds: ps.rebounds,
            steals: ps.steals,
            blocks: ps.blocks,
            turnovers: ps.turnovers,
            three_pointers_made: ps.three_fg_made,
            three_pointers_attempted: ps.three_fg_attempted,
            field_goals_made: ps.fg_made,
            field_goals_attempted: ps.fg_attempted,
            free_throws_made: 0,
            free_throws_attempted: 0,
            fouls: 0,
            minutes_played: 0,
            created_at: '',
            updated_at: '',
          } as PlayerStats,
          calculated: {
            ppg: ps.games_played > 0 ? ps.points / ps.games_played : 0,
            apg: ps.games_played > 0 ? ps.assists / ps.games_played : 0,
            rpg: ps.games_played > 0 ? ps.rebounds / ps.games_played : 0,
            spg: ps.games_played > 0 ? ps.steals / ps.games_played : 0,
            bpg: ps.games_played > 0 ? ps.blocks / ps.games_played : 0,
            tpg: ps.games_played > 0 ? ps.turnovers / ps.games_played : 0,
            fg_pct: ps.fg_attempted > 0 ? (ps.fg_made / ps.fg_attempted) * 100 : 0,
            three_pct: ps.three_fg_attempted > 0 ? (ps.three_fg_made / ps.three_fg_attempted) * 100 : 0,
          },
          team
        };
      }).filter((p): p is NonNullable<typeof p> => p !== null && p.stats.games_played > 0)
    : users
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

  // Log the results
  console.log('[Stats] Players with stats:', playersWithStats.length, 'Stats type:', statsType, 'Users:', users.length, 'Park stats:', parkStats.length, 'Player stats:', playerStats.length);

  // Sort by selected stat
  const sortedPlayers = [...playersWithStats].sort((a, b) => {
    if (showAverages) {
      const aVal = a.calculated?.[sortBy] || 0;
      const bVal = b.calculated?.[sortBy] || 0;
      return bVal - aVal;
    } else {
      // Sort by totals
      const totalKeyMap: Record<TotalSortKey, keyof PlayerStats> = {
        pts: 'points_scored',
        reb: 'rebounds',
        ast: 'assists',
        stl: 'steals',
        blk: 'blocks',
        tov: 'turnovers'
      };
      const aVal = (a.stats?.[totalKeyMap[totalSortBy]] as number) || 0;
      const bVal = (b.stats?.[totalKeyMap[totalSortBy]] as number) || 0;
      return bVal - aVal;
    }
  });

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'ppg', label: 'Points' },
    { key: 'rpg', label: 'Rebounds' },
    { key: 'apg', label: 'Assists' },
    { key: 'spg', label: 'Steals' },
    { key: 'bpg', label: 'Blocks' },
    { key: 'tpg', label: 'Turnovers' },
  ];

  const totalSortOptions: { key: TotalSortKey; label: string }[] = [
    { key: 'pts', label: 'Points' },
    { key: 'reb', label: 'Rebounds' },
    { key: 'ast', label: 'Assists' },
    { key: 'stl', label: 'Steals' },
    { key: 'blk', label: 'Blocks' },
    { key: 'tov', label: 'Turnovers' },
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
              {statsType === 'season' ? 'Season' : 'Park/Rec'} statistical leaders and rankings 
              <span className="text-xs ml-2">
                ({playersWithStats.length} Players)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Season/Park Toggle */}
            <div className="inline-flex rounded-md overflow-hidden">
              <button
                onClick={() => setStatsType('season')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border focus:outline-none ${
                  statsType === 'season'
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-l-md border-r-0`}
              >
                Season
              </button>
              <button
                onClick={() => setStatsType('park')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border focus:outline-none ${
                  statsType === 'park'
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-r-md`}
              >
                Park/Rec
              </button>
            </div>
            {/* Averages/Totals Toggle */}
            <div className="inline-flex rounded-md overflow-hidden">
              <button
                onClick={() => setShowAverages(true)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border focus:outline-none ${
                  showAverages 
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-l-md border-r-0`}
              >
                Averages
              </button>
              <button
                onClick={() => setShowAverages(false)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border focus:outline-none ${
                  !showAverages 
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-r-md`}
              >
                Totals
              </button>
            </div>
            {/* Season Dropdown - always available for both season and park */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              title="Select season"
              className="px-2 py-1.5 bg-mc-surface border border-mc-border rounded text-mc-text text-sm focus:outline-none focus:border-mc-accent"
            >
              {AVAILABLE_SEASONS.map(season => (
                <option key={season} value={season}>
                  Season {season.replace('S', '')}
                </option>
              ))}
            </select>
            <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${isDbConnected ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'}`}>
              {isDbConnected ? 'Live' : 'Demo'}
            </div>
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="flex flex-wrap gap-2">
        {showAverages ? (
          sortOptions.map(option => (
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
          ))
        ) : (
          totalSortOptions.map(option => (
            <button
              key={option.key}
              onClick={() => setTotalSortBy(option.key)}
              className={`px-4 py-2 rounded transition-colors ${
                totalSortBy === option.key
                  ? 'bg-mc-accent text-white'
                  : 'bg-mc-surface text-mc-text-muted border border-mc-border hover:border-mc-accent'
              }`}
            >
              {option.label}
            </button>
          ))
        )}
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
                {showAverages ? (
                  <>
                    <th className={`text-center px-3 py-3 ${sortBy === 'ppg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>PPG</th>
                    <th className={`text-center px-3 py-3 ${sortBy === 'rpg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>RPG</th>
                    <th className={`text-center px-3 py-3 ${sortBy === 'apg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>APG</th>
                    <th className={`text-center px-3 py-3 hidden md:table-cell ${sortBy === 'spg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>SPG</th>
                    <th className={`text-center px-3 py-3 hidden md:table-cell ${sortBy === 'bpg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>BPG</th>
                    <th className={`text-center px-3 py-3 hidden lg:table-cell ${sortBy === 'tpg' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>TPG</th>
                  </>
                ) : (
                  <>
                    <th className={`text-center px-3 py-3 ${totalSortBy === 'pts' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>PTS</th>
                    <th className={`text-center px-3 py-3 ${totalSortBy === 'reb' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>REB</th>
                    <th className={`text-center px-3 py-3 ${totalSortBy === 'ast' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>AST</th>
                    <th className={`text-center px-3 py-3 hidden md:table-cell ${totalSortBy === 'stl' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>STL</th>
                    <th className={`text-center px-3 py-3 hidden md:table-cell ${totalSortBy === 'blk' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>BLK</th>
                    <th className={`text-center px-3 py-3 hidden lg:table-cell ${totalSortBy === 'tov' ? 'text-mc-accent' : 'text-mc-text-muted'}`}>TOV</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className={`transition-opacity duration-300 ${isDataLoading ? 'opacity-50' : 'opacity-100'}`}>
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
                  {showAverages ? (
                    <>
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
                      <td className={`text-center px-3 py-3 hidden lg:table-cell ${sortBy === 'tpg' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                        {calculated?.tpg.toFixed(1)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`text-center px-3 py-3 ${totalSortBy === 'pts' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                        {stats?.points_scored}
                      </td>
                      <td className={`text-center px-3 py-3 ${totalSortBy === 'reb' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                        {stats?.rebounds}
                      </td>
                      <td className={`text-center px-3 py-3 ${totalSortBy === 'ast' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                        {stats?.assists}
                      </td>
                      <td className={`text-center px-3 py-3 hidden md:table-cell ${totalSortBy === 'stl' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                        {stats?.steals}
                      </td>
                      <td className={`text-center px-3 py-3 hidden md:table-cell ${totalSortBy === 'blk' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                        {stats?.blocks}
                      </td>
                      <td className={`text-center px-3 py-3 hidden lg:table-cell ${totalSortBy === 'tov' ? 'text-mc-accent font-bold' : 'text-mc-text'}`}>
                        {stats?.turnovers}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
