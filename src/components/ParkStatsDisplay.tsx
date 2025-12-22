import { useState, useEffect } from 'react';
import { User } from '../types';
import { fetchParkStatsByUser, ParkStatsAggregated } from '../data/parkStatsService';

interface ParkStatsDisplayProps {
  user: User;
  season?: number;
}

export default function ParkStatsDisplay({ user, season = 1 }: ParkStatsDisplayProps) {
  const [stats, setStats] = useState<ParkStatsAggregated | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTotals, setShowTotals] = useState(false); // Toggle between averages and totals

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const data = await fetchParkStatsByUser(user, season);
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, [user, season]);

  if (loading) {
    return (
      <div className="bg-mc-surface border-2 border-mc-border p-6 rounded-lg">
        <h3 className="text-xl font-bold text-mc-text mb-4">Park Stats (Rec Games)</h3>
        <p className="text-mc-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-mc-surface border-2 border-mc-border p-6 rounded-lg">
        <h3 className="text-xl font-bold text-mc-text mb-4">Park Stats (Rec Games)</h3>
        <p className="text-mc-text-secondary">No park stats found for Season {season}</p>
      </div>
    );
  }

  return (
    <div className="bg-mc-surface border-2 border-mc-border p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-mc-text">Park Stats (Rec Games)</h3>
        
        {/* Toggle between Averages and Totals */}
        <div className="flex gap-2 bg-mc-surface-light rounded-lg p-1">
          <button
            onClick={() => setShowTotals(false)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              !showTotals 
                ? 'bg-mc-accent text-white' 
                : 'text-mc-text-secondary hover:text-mc-text'
            }`}
          >
            Averages
          </button>
          <button
            onClick={() => setShowTotals(true)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              showTotals 
                ? 'bg-mc-accent text-white' 
                : 'text-mc-text-secondary hover:text-mc-text'
            }`}
          >
            Totals
          </button>
        </div>
      </div>

      {/* Record */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-mc-text mb-3">Record</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-mc-surface-light p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-mc-accent">{stats.total_wins}</div>
            <div className="text-sm text-mc-text-secondary">Wins</div>
          </div>
          <div className="bg-mc-surface-light p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-500">{stats.total_losses}</div>
            <div className="text-sm text-mc-text-secondary">Losses</div>
          </div>
          <div className="bg-mc-surface-light p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-mc-text">{stats.win_percentage.toFixed(1)}%</div>
            <div className="text-sm text-mc-text-secondary">Win %</div>
          </div>
        </div>
        <div className="mt-2 text-center text-mc-text-secondary text-sm">
          {stats.total_games} Games Played
        </div>
      </div>

      {/* Stats */}
      <div>
        <h4 className="text-lg font-semibold text-mc-text mb-3">
          {showTotals ? 'Total Stats' : 'Per Game Averages'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            label="PTS" 
            value={showTotals ? stats.total_points : stats.ppg}
            showTotals={showTotals}
          />
          <StatCard 
            label="AST" 
            value={showTotals ? stats.total_assists : stats.apg}
            showTotals={showTotals}
          />
          <StatCard 
            label="REB" 
            value={showTotals ? stats.total_rebounds : stats.rpg}
            showTotals={showTotals}
          />
          <StatCard 
            label="STL" 
            value={showTotals ? stats.total_steals : stats.spg}
            showTotals={showTotals}
          />
          <StatCard 
            label="BLK" 
            value={showTotals ? stats.total_blocks : stats.bpg}
            showTotals={showTotals}
          />
          <StatCard 
            label="TO" 
            value={showTotals ? stats.total_turnovers : stats.tpg}
            showTotals={showTotals}
          />
          <StatCard 
            label="FG%" 
            value={stats.fg_percentage}
            isPercentage
          />
          <StatCard 
            label="3P%" 
            value={stats.three_pt_percentage}
            isPercentage
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  showTotals?: boolean;
  isPercentage?: boolean;
}

function StatCard({ label, value, showTotals = false, isPercentage = false }: StatCardProps) {
  const displayValue = isPercentage 
    ? `${value.toFixed(1)}%`
    : showTotals 
      ? Math.round(value).toString()
      : value.toFixed(1);

  return (
    <div className="bg-mc-surface-light p-3 rounded-lg">
      <div className="text-lg font-bold text-mc-text">{displayValue}</div>
      <div className="text-xs text-mc-text-secondary">{label}</div>
    </div>
  );
}
