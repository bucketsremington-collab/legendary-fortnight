import { Link } from 'react-router-dom';
import { Team } from '../types';
import { Trophy, Users, TrendingUp } from 'lucide-react';

interface TeamCardProps {
  team: Team;
  memberCount?: number;
  rank?: number;
}

export default function TeamCard({ team, memberCount = 0, rank }: TeamCardProps) {
  const winPct = team.wins + team.losses > 0 
    ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1) 
    : '0.0';

  return (
    <Link 
      to={`/team/${team.id}`}
      className="block mc-card hover:border-mc-accent transition-all duration-200 overflow-hidden group"
    >
      {/* Team banner with pattern */}
      <div 
        className="h-24 relative"
        style={{ 
          background: `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`
        }}
      >
        {/* Rank badge */}
        {rank && (
          <div className="absolute top-3 left-3 w-8 h-8 bg-black/50 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">#{rank}</span>
          </div>
        )}

        {/* Championship trophies */}
        {team.championships > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-white text-sm font-medium">{team.championships}</span>
          </div>
        )}

        {/* Team abbreviation */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold border-4 border-mc-surface shadow-lg group-hover:scale-105 transition-transform"
            style={{ backgroundColor: team.primary_color }}
          >
            {team.abbreviation}
          </div>
        </div>
      </div>

      <div className="px-4 pt-10 pb-4">
        {/* Team Name */}
        <div className="text-center">
          <h3 className="font-bold text-lg text-mc-text group-hover:text-mc-accent transition-colors">
            {team.name}
          </h3>
          {team.home_arena && (
            <p className="text-sm text-mc-text-muted mt-1">{team.home_arena}</p>
          )}
        </div>

        {/* Record */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{team.wins}</p>
            <p className="text-xs text-mc-text-muted">Wins</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{team.losses}</p>
            <p className="text-xs text-mc-text-muted">Losses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mc-text">{winPct}%</p>
            <p className="text-xs text-mc-text-muted">Win %</p>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-4 border-t border-mc-border flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-mc-text-muted">
            <Users className="w-4 h-4" />
            <span>{memberCount} players</span>
          </div>
          <div className="flex items-center gap-2 text-mc-text-muted">
            <TrendingUp className="w-4 h-4" />
            <span>{team.wins - team.losses > 0 ? '+' : ''}{team.wins - team.losses}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
