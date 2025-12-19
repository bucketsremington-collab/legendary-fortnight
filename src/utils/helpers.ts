import { PlayerStats, CalculatedStats } from '../types';

export function calculateStats(stats: PlayerStats): CalculatedStats {
  const gp = stats.games_played || 1;
  
  return {
    ppg: Number((stats.points_scored / gp).toFixed(1)),
    apg: Number((stats.assists / gp).toFixed(1)),
    rpg: Number((stats.rebounds / gp).toFixed(1)),
    spg: Number((stats.steals / gp).toFixed(1)),
    bpg: Number((stats.blocks / gp).toFixed(1)),
    tpg: Number((stats.turnovers / gp).toFixed(1)),
    fg_pct: stats.field_goals_attempted > 0 
      ? Number(((stats.field_goals_made / stats.field_goals_attempted) * 100).toFixed(1))
      : 0,
    three_pct: stats.three_pointers_attempted > 0
      ? Number(((stats.three_pointers_made / stats.three_pointers_attempted) * 100).toFixed(1))
      : 0,
    ft_pct: stats.free_throws_attempted > 0
      ? Number(((stats.free_throws_made / stats.free_throws_attempted) * 100).toFixed(1))
      : 0,
    win_pct: stats.games_played > 0
      ? Number(((stats.games_won / stats.games_played) * 100).toFixed(1))
      : 0,
  };
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'w', seconds: 604800 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count}${interval.label}`;
    }
  }

  return 'now';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#9CA3AF',
    uncommon: '#22C55E',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
  };
  return colors[rarity] || colors.common;
}

export function getRarityGradient(rarity: string): string {
  const gradients: Record<string, string> = {
    common: 'from-gray-400 to-gray-600',
    uncommon: 'from-green-400 to-green-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-orange-500',
  };
  return gradients[rarity] || gradients.common;
}
