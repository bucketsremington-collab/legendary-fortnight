import { Team, User, PlayerStats, Accolade, Post, Game } from '../types';

// MBA Teams - 8 Official Teams
export const mockTeams: Team[] = [
  {
    id: 'team-withers',
    name: 'Washington Withers',
    abbreviation: 'WAS',
    logo_url: '/teams/washington-withers.png',
    primary_color: '#1C2541',
    secondary_color: '#C41E3A',
    description: 'The fearsome Washington Withers bring destruction to their opponents.',
    founded_date: '2024-01-01',
    home_arena: 'Nether Dome',
    wins: 12,
    losses: 4,
    championships: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-magma',
    name: 'Miami Magma Cubes',
    abbreviation: 'MIA',
    logo_url: '/teams/miami-magma-cubes.png',
    primary_color: '#C41E3A',
    secondary_color: '#FF6B35',
    description: 'The heat is on with the Miami Magma Cubes.',
    founded_date: '2024-01-01',
    home_arena: 'Lava Court',
    wins: 10,
    losses: 6,
    championships: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-creepers',
    name: 'Los Angeles Creepers',
    abbreviation: 'LAC',
    logo_url: '/teams/los-angeles-creepers.png',
    primary_color: '#6B21A8',
    secondary_color: '#EAB308',
    description: 'Explosive plays from the Los Angeles Creepers.',
    founded_date: '2024-01-01',
    home_arena: 'TNT Arena',
    wins: 14,
    losses: 2,
    championships: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-bows',
    name: 'Chicago Bows',
    abbreviation: 'CHI',
    logo_url: '/teams/chicago-bows.png',
    primary_color: '#DC2626',
    secondary_color: '#FFFFFF',
    description: 'Precision shooting from the Chicago Bows.',
    founded_date: '2024-01-01',
    home_arena: 'Arrow Stadium',
    wins: 8,
    losses: 8,
    championships: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-buckets',
    name: 'Brooklyn Buckets',
    abbreviation: 'BKN',
    logo_url: '/teams/brooklyn-buckets.png',
    primary_color: '#1F2937',
    secondary_color: '#9CA3AF',
    description: 'Nothing but buckets from Brooklyn.',
    founded_date: '2024-01-01',
    home_arena: 'Bucket Center',
    wins: 9,
    losses: 7,
    championships: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-breeze',
    name: 'Boston Breeze',
    abbreviation: 'BOS',
    logo_url: '/teams/boston-breeze.png',
    primary_color: '#166534',
    secondary_color: '#22C55E',
    description: 'The refreshing Boston Breeze sweeps opponents away.',
    founded_date: '2024-01-01',
    home_arena: 'Wind Garden',
    wins: 11,
    losses: 5,
    championships: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-64s',
    name: 'Philadelphia 64s',
    abbreviation: 'PHI',
    logo_url: '/teams/philadelphia-64s.png',
    primary_color: '#1E40AF',
    secondary_color: '#DC2626',
    description: 'Stacking up wins, 64 at a time.',
    founded_date: '2024-01-01',
    home_arena: 'Stack Arena',
    wins: 7,
    losses: 9,
    championships: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'team-allays',
    name: 'Atlanta Allays',
    abbreviation: 'ATL',
    logo_url: '/teams/atlanta-allays.png',
    primary_color: '#DC2626',
    secondary_color: '#EAB308',
    description: 'The helpful Atlanta Allays always deliver.',
    founded_date: '2024-01-01',
    home_arena: 'Allay Arena',
    wins: 6,
    losses: 10,
    championships: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// Mock Users - Test players across teams
export const mockUsers: User[] = [
  {
    id: 'user-1',
    username: 'TestPlayer',
    display_name: 'Test Player',
    avatar_url: null,
    bio: 'League MVP candidate.',
    team_id: 'team-creepers',
    role: 'player',
    minecraft_username: 'Steve',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'user-2',
    username: 'Player2',
    display_name: 'Player Two',
    avatar_url: null,
    bio: 'Defensive specialist.',
    team_id: 'team-withers',
    role: 'player',
    minecraft_username: 'Alex',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
];

// Mock Player Stats - Single test stats
export const mockPlayerStats: PlayerStats[] = [
  {
    id: 'stats-1',
    user_id: 'user-1',
    season: 'S1',
    games_played: 15,
    games_won: 10,
    games_lost: 5,
    points_scored: 300,
    assists: 75,
    rebounds: 120,
    steals: 30,
    blocks: 45,
    three_pointers_made: 20,
    three_pointers_attempted: 50,
    field_goals_made: 120,
    field_goals_attempted: 240,
    free_throws_made: 40,
    free_throws_attempted: 50,
    turnovers: 25,
    fouls: 30,
    minutes_played: 450,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-12-13T00:00:00Z',
  },
];

// Mock Accolades - Single test accolade
export const mockAccolades: Accolade[] = [
  {
    id: 'acc-1',
    user_id: 'user-1',
    type: 'championship',
    title: 'MBA Champion',
    description: 'Won the Season 1 MBA Championship',
    season: 'S1',
    awarded_date: '2024-06-15',
    icon: '🏆',
    rarity: 'legendary',
  },
];

// Mock Posts (unused but kept for compatibility)
export const mockPosts: Post[] = [];

// Mock Games - Sample games
export const mockGames: Game[] = [
  {
    id: 'game-1',
    home_team_id: 'team-creepers',
    away_team_id: 'team-withers',
    home_score: 78,
    away_score: 72,
    status: 'completed',
    scheduled_date: '2024-12-10T19:00:00Z',
    season: 'S1',
    is_playoff: false,
    arena: 'TNT Arena',
    mvp_player_id: 'user-1',
    created_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'game-2',
    home_team_id: 'team-magma',
    away_team_id: 'team-breeze',
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    scheduled_date: '2024-12-20T19:00:00Z',
    season: 'S1',
    is_playoff: false,
    arena: 'Lava Court',
    mvp_player_id: null,
    created_at: '2024-12-01T00:00:00Z',
  },
];

// Helper functions to get related data
export const getUserById = (id: string): User | undefined => mockUsers.find(u => u.id === id);
export const getTeamById = (id: string): Team | undefined => mockTeams.find(t => t.id === id);
export const getPlayerStatsByUserId = (userId: string): PlayerStats | undefined => 
  mockPlayerStats.find(s => s.user_id === userId);
export const getAccoladesByUserId = (userId: string): Accolade[] => 
  mockAccolades.filter(a => a.user_id === userId);
export const getPostsByUserId = (userId: string): Post[] => 
  mockPosts.filter(p => p.user_id === userId);
export const getTeamMembers = (teamId: string): User[] => 
  mockUsers.filter(u => u.team_id === teamId);
export const getPostsWithUsers = (): (Post & { user: User })[] => 
  mockPosts.map(post => ({
    ...post,
    user: getUserById(post.user_id)!
  })).filter(p => p.user);
export const getFreeAgents = (): User[] =>
  mockUsers.filter(u => u.role === 'player' && !u.team_id);

// News/Announcements
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: 'announcement' | 'trade' | 'game-recap' | 'free-agency' | 'event';
  author: string;
  created_at: string;
  is_pinned?: boolean;
}

export const mockNews: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Welcome to MBA Social',
    content: 'This is a test news item to demonstrate the platform. Real news and announcements will appear here.',
    category: 'announcement',
    author: 'MBA Official',
    created_at: '2024-12-10T12:00:00Z',
    is_pinned: true,
  },
];

// Free Agent Listings
export interface FreeAgentListing {
  id: string;
  user_id: string;
  positions: string[];
  description: string;
  availability: 'available' | 'in-talks' | 'signed';
  discord_tag: string;
  created_at: string;
}

export const mockFreeAgentListings: FreeAgentListing[] = [
  {
    id: 'fa-1',
    user_id: 'user-1',
    positions: ['PG'],
    description: 'Test free agent listing. Real listings will appear here when players register.',
    availability: 'available',
    discord_tag: 'testplayer#0000',
    created_at: '2024-12-05T10:00:00Z',
  },
];
