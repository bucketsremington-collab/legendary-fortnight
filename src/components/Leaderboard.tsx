import { useState } from 'react';
import { useLeaderboard, StatCategory } from '@/hooks/useGameStats';

const STAT_OPTIONS: { value: StatCategory; label: string; fullName: string }[] = [
  { value: 'ppg', label: 'PPG', fullName: 'Points Per Game' },
  { value: 'rpg', label: 'RPG', fullName: 'Rebounds Per Game' },
  { value: 'apg', label: 'APG', fullName: 'Assists Per Game' },
  { value: 'spg', label: 'SPG', fullName: 'Steals Per Game' },
  { value: 'bpg', label: 'BPG', fullName: 'Blocks Per Game' },
];

export function Leaderboard() {
  const [selectedStat, setSelectedStat] = useState<StatCategory>('ppg');
  const { data: leaders, isLoading, error } = useLeaderboard(selectedStat);

  const currentStatOption = STAT_OPTIONS.find(s => s.value === selectedStat);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">🏆 Leaderboard</h2>
        
        {/* Stat Selector */}
        <div className="flex gap-2">
          {STAT_OPTIONS.map((stat) => (
            <button
              key={stat.value}
              onClick={() => setSelectedStat(stat.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedStat === stat.value
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {stat.label}
            </button>
          ))}
        </div>
      </div>

      <h3 className="text-lg text-gray-400 mb-4">{currentStatOption?.fullName}</h3>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-400 text-center py-8">Failed to load leaderboard</div>
      ) : !leaders || leaders.length === 0 ? (
        <div className="text-gray-400 text-center py-8">No stats recorded yet</div>
      ) : (
        <div className="space-y-2">
          {leaders.map((leader: any, index: number) => (
            <div
              key={`${leader.discord_id}-${leader.rank}`}
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0
                  ? 'bg-yellow-500/20 border border-yellow-500/30'
                  : index === 1
                  ? 'bg-gray-400/20 border border-gray-400/30'
                  : index === 2
                  ? 'bg-orange-700/20 border border-orange-700/30'
                  : 'bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span className={`text-xl font-bold w-8 ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-300' :
                  index === 2 ? 'text-orange-600' :
                  'text-gray-500'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${leader.rank}.`}
                </span>
                
                {/* Player Info */}
                <div>
                  <p className="font-semibold text-white">
                    {leader.minecraft_name || `Player ${leader.discord_id.slice(-4)}`}
                  </p>
                  <p className="text-xs text-gray-400">{leader.games_played} games</p>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right">
                <p className="text-xl font-bold text-orange-400">{leader.average}</p>
                <p className="text-xs text-gray-400">{leader.total} total</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;
