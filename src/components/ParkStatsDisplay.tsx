import { useState, useEffect } from 'react';
import { User } from '../types';
import { fetchParkStatsByUser, ParkStatsAggregated } from '../data/parkStatsService';

interface ParkStatsDisplayProps {
  user: User;
  season?: number;
  showTotals?: boolean; // Controlled from parent
}

export default function ParkStatsDisplay({ user, season = 1, showTotals = false }: ParkStatsDisplayProps) {
  const [stats, setStats] = useState<ParkStatsAggregated | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div>
        <p className="text-mc-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <p className="text-mc-text-secondary">No park stats found for Season {season}</p>
      </div>
    );
  }

  return (
    <>
      {/* Record */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-mc-text mb-3">Record</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
            <div className="text-2xl font-bold text-mc-accent">{stats.total_wins}</div>
            <div className="text-sm text-mc-text-muted">Wins</div>
          </div>
          <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
            <div className="text-2xl font-bold text-red-500">{stats.total_losses}</div>
            <div className="text-sm text-mc-text-muted">Losses</div>
          </div>
          <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
            <div className="text-2xl font-bold text-mc-text">{stats.win_percentage.toFixed(1)}%</div>
            <div className="text-sm text-mc-text-muted">Win %</div>
          </div>
        </div>
        <div className="mt-2 text-center text-mc-text-muted text-sm">
          {stats.total_games} Games Played
        </div>
      </div>

      {/* Stats */}
      <div>
        <h4 className="text-sm font-semibold text-mc-text mb-3">
          {showTotals ? 'Total Stats' : 'Averages'}
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
    </>
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
    <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
      <div className="text-lg font-bold text-mc-text">{displayValue}</div>
      <div className="text-xs text-mc-text-muted">{label}</div>
    </div>
  );
}
