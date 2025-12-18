import { PlayerStats } from '../types';
import { calculateStats } from '../utils/helpers';

interface StatsTableProps {
  stats: PlayerStats;
  showDetailed?: boolean;
}

export default function StatsTable({ stats, showDetailed = false }: StatsTableProps) {
  const calculated = calculateStats(stats);

  return (
    <div className="mc-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-mc-darker border-b border-mc-border">
        <h3 className="font-semibold text-mc-text">Season {stats.season} Statistics</h3>
      </div>

      {/* Per Game Stats */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-mc-text-muted mb-3">Per Game Averages</h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          <StatBox label="PPG" value={calculated.ppg} highlight />
          <StatBox label="RPG" value={calculated.rpg} />
          <StatBox label="APG" value={calculated.apg} />
          <StatBox label="SPG" value={calculated.spg} />
          <StatBox label="BPG" value={calculated.bpg} />
        </div>
      </div>

      {/* Shooting Stats */}
      <div className="p-4 border-t border-mc-border">
        <h4 className="text-sm font-medium text-mc-text-muted mb-3">Shooting</h4>
        <div className="space-y-3">
          <PercentageBar 
            label="Field Goal %" 
            value={calculated.fg_pct} 
            made={stats.field_goals_made}
            attempted={stats.field_goals_attempted}
          />
          <PercentageBar 
            label="3-Point %" 
            value={calculated.three_pct} 
            made={stats.three_pointers_made}
            attempted={stats.three_pointers_attempted}
          />
          <PercentageBar 
            label="Free Throw %" 
            value={calculated.ft_pct} 
            made={stats.free_throws_made}
            attempted={stats.free_throws_attempted}
          />
        </div>
      </div>

      {/* Record */}
      <div className="p-4 border-t border-mc-border">
        <h4 className="text-sm font-medium text-mc-text-muted mb-3">Record</h4>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-green-400">{stats.games_won}</span>
            <span className="text-mc-text-muted ml-1">W</span>
          </div>
          <div className="text-mc-border">-</div>
          <div>
            <span className="text-2xl font-bold text-red-400">{stats.games_lost}</span>
            <span className="text-mc-text-muted ml-1">L</span>
          </div>
          <div className="ml-auto">
            <span className="text-lg font-semibold text-mc-text">{calculated.win_pct}%</span>
            <span className="text-mc-text-muted ml-1 text-sm">Win Rate</span>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      {showDetailed && (
        <div className="p-4 border-t border-mc-border">
          <h4 className="text-sm font-medium text-mc-text-muted mb-3">Totals</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-mc-text-muted">Games Played</p>
              <p className="text-mc-text font-medium">{stats.games_played}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Total Points</p>
              <p className="text-mc-text font-medium">{stats.points_scored}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Total Rebounds</p>
              <p className="text-mc-text font-medium">{stats.rebounds}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Total Assists</p>
              <p className="text-mc-text font-medium">{stats.assists}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Steals</p>
              <p className="text-mc-text font-medium">{stats.steals}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Blocks</p>
              <p className="text-mc-text font-medium">{stats.blocks}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Turnovers</p>
              <p className="text-mc-text font-medium">{stats.turnovers}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Fouls</p>
              <p className="text-mc-text font-medium">{stats.fouls}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">Minutes Played</p>
              <p className="text-mc-text font-medium">{stats.minutes_played}</p>
            </div>
            <div>
              <p className="text-mc-text-muted">3PT Made</p>
              <p className="text-mc-text font-medium">{stats.three_pointers_made}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`text-center p-3 rounded-lg ${highlight ? 'bg-mc-accent/20' : 'bg-mc-darker'}`}>
      <p className={`text-2xl font-bold ${highlight ? 'text-mc-accent' : 'text-mc-text'}`}>
        {value}
      </p>
      <p className="text-xs text-mc-text-muted mt-1">{label}</p>
    </div>
  );
}

function PercentageBar({ 
  label, 
  value, 
  made, 
  attempted 
}: { 
  label: string; 
  value: number; 
  made: number; 
  attempted: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-mc-text">{label}</span>
        <span className="text-sm text-mc-text font-medium">
          {value}% <span className="text-mc-text-muted">({made}/{attempted})</span>
        </span>
      </div>
      <div className="h-2 bg-mc-darker rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-mc-accent to-mc-accent-hover rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
