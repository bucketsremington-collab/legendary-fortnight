"""
Database module for MBA Bot - Supabase Version

Uses Supabase (PostgreSQL) as the database backend.
This allows both the Discord bot and website to share the same data.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')  # Use service role key for bot

_supabase_client: Client = None

def get_supabase() -> Client:
    """Get the Supabase client (singleton pattern)"""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

def init_database():
    """
    Initialize database tables in Supabase.
    Note: Tables should be created via Supabase Dashboard or migrations.
    This function verifies connectivity.
    """
    try:
        client = get_supabase()
        # Test connection by querying server_config
        result = client.table('server_config').select('guild_id').limit(1).execute()
        print("✅ Connected to Supabase successfully!")
        return True
    except Exception as e:
        print(f"❌ Supabase connection error: {e}")
        print("Make sure you've run the SQL migrations in Supabase Dashboard")
        return False


# ============================================
# Helper functions that mirror the old MySQL interface
# These make it easier to convert existing cog code
# ============================================

class SupabaseConnection:
    """
    A wrapper class that provides a cursor-like interface for Supabase.
    This makes it easier to migrate from MySQL without rewriting everything.
    """
    def __init__(self):
        self.client = get_supabase()
        self._last_result = None
        self._last_insert_id = None
    
    def execute(self, query: str, params: tuple = None):
        """
        Execute a query. This is a simplified interface - 
        for complex queries, use the Supabase client directly.
        """
        # This is a compatibility layer - most queries will be rewritten
        # to use Supabase's Python client directly
        pass
    
    def fetchone(self):
        """Fetch one result"""
        if self._last_result and len(self._last_result) > 0:
            return self._last_result[0]
        return None
    
    def fetchall(self):
        """Fetch all results"""
        return self._last_result or []
    
    @property
    def lastrowid(self):
        """Get the last inserted row ID"""
        return self._last_insert_id
    
    def close(self):
        """No-op for compatibility"""
        pass
    
    def commit(self):
        """No-op for compatibility - Supabase auto-commits"""
        pass


def get_connection():
    """
    Get a Supabase connection wrapper.
    For compatibility with existing code structure.
    """
    return get_supabase()


# ============================================
# Server Config Functions
# ============================================

def get_server_config(guild_id: int) -> dict:
    """Get server configuration"""
    client = get_supabase()
    result = client.table('server_config').select('*').eq('guild_id', str(guild_id)).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def ensure_server_config(guild_id: int) -> dict:
    """Ensure server config exists, create if not"""
    client = get_supabase()
    config = get_server_config(guild_id)
    if not config:
        result = client.table('server_config').insert({
            'guild_id': str(guild_id)
        }).execute()
        return result.data[0] if result.data else None
    return config

def update_server_config(guild_id: int, **kwargs) -> bool:
    """Update server configuration"""
    client = get_supabase()
    # Convert any int IDs to strings for Supabase
    data = {k: str(v) if isinstance(v, int) and k.endswith('_id') else v for k, v in kwargs.items()}
    result = client.table('server_config').update(data).eq('guild_id', str(guild_id)).execute()
    return len(result.data) > 0 if result.data else False


# ============================================
# Team Functions
# ============================================

def get_team_by_role(guild_id: int, role_id: int) -> dict:
    """Get team by role ID"""
    client = get_supabase()
    result = client.table('teams').select('*').eq('guild_id', str(guild_id)).eq('team_role_id', str(role_id)).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def get_team_by_id(team_id: int) -> dict:
    """Get team by ID"""
    client = get_supabase()
    result = client.table('teams').select('*').eq('id', team_id).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def get_all_teams(guild_id: int) -> list:
    """Get all teams for a guild"""
    client = get_supabase()
    result = client.table('teams').select('*').eq('guild_id', str(guild_id)).execute()
    return result.data or []

def create_team(guild_id: int, team_name: str, team_role_id: int, conference: str) -> dict:
    """Create a new team"""
    client = get_supabase()
    result = client.table('teams').insert({
        'guild_id': str(guild_id),
        'team_name': team_name,
        'team_role_id': str(team_role_id),
        'conference': conference
    }).execute()
    return result.data[0] if result.data else None

def delete_team(guild_id: int, team_role_id: int) -> bool:
    """Delete a team"""
    client = get_supabase()
    result = client.table('teams').delete().eq('guild_id', str(guild_id)).eq('team_role_id', str(team_role_id)).execute()
    return len(result.data) > 0 if result.data else False

def update_team_logo(team_id: int, logo_emoji: str) -> bool:
    """Update team logo"""
    client = get_supabase()
    result = client.table('teams').update({'team_logo_emoji': logo_emoji}).eq('id', team_id).execute()
    return len(result.data) > 0 if result.data else False


# ============================================
# Player/Roster Functions
# Uses the 'users' table like the website does
# ============================================

def get_player_team(guild_id: int, user_id: int) -> dict:
    """Get the team a player is on from the users table"""
    client = get_supabase()
    
    # Try with 'discord-' prefix first (website format)
    result = client.table('users').select('*, teams(*)').eq('id', f'discord-{user_id}').execute()
    if result.data and len(result.data) > 0:
        user = result.data[0]
        if user.get('team_id') and user.get('teams'):
            return {'team_id': user['team_id'], 'teams': user['teams'], 'user_id': str(user_id)}
    
    # Fallback to raw ID
    result = client.table('users').select('*, teams(*)').eq('id', str(user_id)).execute()
    if result.data and len(result.data) > 0:
        user = result.data[0]
        if user.get('team_id') and user.get('teams'):
            return {'team_id': user['team_id'], 'teams': user['teams'], 'user_id': str(user_id)}
    
    return None

def get_user_by_discord_id(discord_id: int) -> dict:
    """Get user from users table by Discord ID"""
    client = get_supabase()
    # Try both formats: with and without 'discord-' prefix
    result = client.table('users').select('*').eq('id', f'discord-{discord_id}').execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    # Fallback to raw ID
    result = client.table('users').select('*').eq('id', str(discord_id)).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def update_user_team(discord_id: int, team_id: str) -> bool:
    """Update user's team_id in users table"""
    client = get_supabase()
    # Try with 'discord-' prefix first (website format)
    result = client.table('users').update({
        'team_id': team_id,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', f'discord-{discord_id}').execute()
    if result.data and len(result.data) > 0:
        return True
    # Fallback to raw ID
    result = client.table('users').update({
        'team_id': team_id,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', str(discord_id)).execute()
    return len(result.data) > 0 if result.data else False

def add_player_to_team(guild_id: int, user_id: int, team_id: str) -> bool:
    """Add a player to a team - updates team_id in users table"""
    client = get_supabase()
    
    # Check if user exists in users table
    user_exists = get_user_by_discord_id(user_id)
    if user_exists:
        return update_user_team(user_id, team_id)
    
    # User doesn't exist in users table (not authenticated with website yet)
    # We can still add them - they just won't show until they auth
    return False

def remove_player_from_team(guild_id: int, user_id: int, team_id: str = None) -> bool:
    """Remove a player from a team - clears team_id in users table"""
    client = get_supabase()
    
    # Try with 'discord-' prefix first (website format)
    result = client.table('users').update({
        'team_id': None,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', f'discord-{user_id}').execute()
    if result.data and len(result.data) > 0:
        return True
    # Fallback to raw ID
    result = client.table('users').update({
        'team_id': None,
        'updated_at': datetime.utcnow().isoformat()
    }).eq('id', str(user_id)).execute()
    
    return len(result.data) > 0 if result.data else False

def get_team_roster(team_id: str) -> list:
    """Get all players on a team from users table"""
    client = get_supabase()
    
    # Get from users table (website's source of truth)
    result = client.table('users').select('id').eq('team_id', team_id).execute()
    return [row['id'] for row in result.data] if result.data else []

def get_roster_count(team_id: str) -> int:
    """Get roster count for a team"""
    roster = get_team_roster(team_id)
    return len(roster)


# ============================================
# Demand Functions
# ============================================

def get_demand_count(guild_id: int, user_id: int, season: str = 'current') -> int:
    """Get demand count for a player"""
    client = get_supabase()
    result = client.table('demands').select('demand_count').eq('guild_id', str(guild_id)).eq('user_id', str(user_id)).eq('season', season).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]['demand_count']
    return 0

def increment_demand(guild_id: int, user_id: int, season: str = 'current') -> int:
    """Increment demand count, returns new count"""
    client = get_supabase()
    current = get_demand_count(guild_id, user_id, season)
    
    if current > 0:
        result = client.table('demands').update({
            'demand_count': current + 1
        }).eq('guild_id', str(guild_id)).eq('user_id', str(user_id)).eq('season', season).execute()
    else:
        result = client.table('demands').insert({
            'guild_id': str(guild_id),
            'user_id': str(user_id),
            'demand_count': 1,
            'season': season
        }).execute()
    
    return current + 1


# ============================================
# Pending Offers Functions
# ============================================

def create_offer(guild_id: int, team_id: int, player_id: int, offered_by: int, expires_at: datetime) -> int:
    """Create a pending offer"""
    client = get_supabase()
    result = client.table('pending_offers').insert({
        'guild_id': str(guild_id),
        'team_id': team_id,
        'player_id': str(player_id),
        'offered_by': str(offered_by),
        'expires_at': expires_at.isoformat()
    }).execute()
    return result.data[0]['id'] if result.data else None

def get_pending_offer(guild_id: int, team_id: int, player_id: int) -> dict:
    """Get a pending offer"""
    client = get_supabase()
    result = client.table('pending_offers').select('*').eq('guild_id', str(guild_id)).eq('team_id', team_id).eq('player_id', str(player_id)).gt('expires_at', datetime.utcnow().isoformat()).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def get_offer_by_id(offer_id: int) -> dict:
    """Get an offer by ID"""
    client = get_supabase()
    result = client.table('pending_offers').select('*').eq('id', offer_id).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def update_offer_message_id(offer_id: int, message_id: int) -> bool:
    """Update the message ID for an offer"""
    client = get_supabase()
    result = client.table('pending_offers').update({'message_id': str(message_id)}).eq('id', offer_id).execute()
    return len(result.data) > 0 if result.data else False

def delete_offer(offer_id: int) -> bool:
    """Delete an offer"""
    client = get_supabase()
    result = client.table('pending_offers').delete().eq('id', offer_id).execute()
    return len(result.data) > 0 if result.data else False


# ============================================
# Trade Functions
# ============================================

def create_trade(guild_id: int, team1_id: int, team2_id: int, 
                 player1_id: int, player2_id: int, initiated_by: int) -> int:
    """Create a pending trade"""
    client = get_supabase()
    result = client.table('pending_trades').insert({
        'guild_id': str(guild_id),
        'team1_id': team1_id,
        'team2_id': team2_id,
        'team1_player_id': str(player1_id),
        'team2_player_id': str(player2_id),
        'initiated_by': str(initiated_by)
    }).execute()
    return result.data[0]['id'] if result.data else None

def get_trade_by_id(trade_id: int) -> dict:
    """Get a trade by ID"""
    client = get_supabase()
    result = client.table('pending_trades').select('*').eq('id', trade_id).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def delete_trade(trade_id: int) -> bool:
    """Delete a trade"""
    client = get_supabase()
    result = client.table('pending_trades').delete().eq('id', trade_id).execute()
    return len(result.data) > 0 if result.data else False


# ============================================
# Saved Roles Functions
# ============================================

def save_member_roles(guild_id: int, user_id: int, role_ids: list) -> bool:
    """Save member roles for persistence"""
    client = get_supabase()
    roles_str = ','.join(str(r) for r in role_ids)
    result = client.table('saved_roles').upsert({
        'guild_id': str(guild_id),
        'user_id': str(user_id),
        'role_ids': roles_str
    }, on_conflict='guild_id,user_id').execute()
    return len(result.data) > 0 if result.data else False

def get_saved_roles(guild_id: int, user_id: int) -> list:
    """Get saved roles for a member"""
    client = get_supabase()
    result = client.table('saved_roles').select('role_ids').eq('guild_id', str(guild_id)).eq('user_id', str(user_id)).execute()
    if result.data and len(result.data) > 0 and result.data[0]['role_ids']:
        return [int(r) for r in result.data[0]['role_ids'].split(',')]
    return []

def delete_saved_roles(guild_id: int, user_id: int) -> bool:
    """Delete saved roles"""
    client = get_supabase()
    result = client.table('saved_roles').delete().eq('guild_id', str(guild_id)).eq('user_id', str(user_id)).execute()
    return True


# ============================================
# Ineligible Roles Functions
# ============================================

def get_ineligible_roles(guild_id: int) -> list:
    """Get ineligible role IDs"""
    client = get_supabase()
    result = client.table('ineligible_roles').select('role_id').eq('guild_id', str(guild_id)).execute()
    return [int(row['role_id']) for row in result.data] if result.data else []

def add_ineligible_role(guild_id: int, role_id: int) -> bool:
    """Add an ineligible role"""
    client = get_supabase()
    result = client.table('ineligible_roles').insert({
        'guild_id': str(guild_id),
        'role_id': str(role_id)
    }).execute()
    return len(result.data) > 0 if result.data else False

def remove_ineligible_role(guild_id: int, role_id: int) -> bool:
    """Remove an ineligible role"""
    client = get_supabase()
    result = client.table('ineligible_roles').delete().eq('guild_id', str(guild_id)).eq('role_id', str(role_id)).execute()
    return len(result.data) > 0 if result.data else False


# ============================================
# Stats Functions
# ============================================

def get_active_season(guild_id: int) -> dict:
    """Get the active season"""
    client = get_supabase()
    result = client.table('seasons').select('*').eq('guild_id', str(guild_id)).eq('is_active', True).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def create_or_activate_season(guild_id: int, season_name: str) -> dict:
    """Create or activate a season"""
    client = get_supabase()
    
    # Deactivate all seasons
    client.table('seasons').update({'is_active': False}).eq('guild_id', str(guild_id)).execute()
    
    # Try to activate existing or create new
    existing = client.table('seasons').select('*').eq('guild_id', str(guild_id)).eq('season_name', season_name).execute()
    
    if existing.data and len(existing.data) > 0:
        result = client.table('seasons').update({'is_active': True}).eq('id', existing.data[0]['id']).execute()
        return result.data[0] if result.data else None
    else:
        result = client.table('seasons').insert({
            'guild_id': str(guild_id),
            'season_name': season_name,
            'is_active': True,
            'start_date': datetime.utcnow().isoformat()
        }).execute()
        return result.data[0] if result.data else None

def record_game(guild_id: int, season_id: int, team1_id: int, team2_id: int,
                team1_score: int, team2_score: int, recorded_by: int) -> int:
    """Record a game result"""
    client = get_supabase()
    
    winner_id = None
    if team1_score > team2_score:
        winner_id = team1_id
    elif team2_score > team1_score:
        winner_id = team2_id
    
    result = client.table('games').insert({
        'guild_id': str(guild_id),
        'season_id': season_id,
        'team1_id': team1_id,
        'team2_id': team2_id,
        'team1_score': team1_score,
        'team2_score': team2_score,
        'winner_id': winner_id,
        'played_at': datetime.utcnow().isoformat(),
        'recorded_by': str(recorded_by)
    }).execute()
    
    return result.data[0]['id'] if result.data else None

def add_player_game_stats(game_id: int, player_id: int, team_id: int,
                          points: int, rebounds: int, assists: int,
                          steals: int, blocks: int, turnovers: int) -> bool:
    """Add player stats for a game"""
    client = get_supabase()
    result = client.table('player_game_stats').upsert({
        'game_id': game_id,
        'player_id': str(player_id),
        'team_id': team_id,
        'points': points,
        'rebounds': rebounds,
        'assists': assists,
        'steals': steals,
        'blocks': blocks,
        'turnovers': turnovers
    }, on_conflict='game_id,player_id').execute()
    return len(result.data) > 0 if result.data else False

def update_player_season_stats(player_id: int, season_id: int, guild_id: int,
                                points: int, rebounds: int, assists: int,
                                steals: int, blocks: int, turnovers: int) -> bool:
    """Update aggregated season stats"""
    client = get_supabase()
    
    # Check if exists
    existing = client.table('player_season_stats').select('*').eq('player_id', str(player_id)).eq('season_id', season_id).execute()
    
    if existing.data and len(existing.data) > 0:
        current = existing.data[0]
        result = client.table('player_season_stats').update({
            'games_played': current['games_played'] + 1,
            'total_points': current['total_points'] + points,
            'total_rebounds': current['total_rebounds'] + rebounds,
            'total_assists': current['total_assists'] + assists,
            'total_steals': current['total_steals'] + steals,
            'total_blocks': current['total_blocks'] + blocks,
            'total_turnovers': current['total_turnovers'] + turnovers
        }).eq('id', current['id']).execute()
    else:
        result = client.table('player_season_stats').insert({
            'player_id': str(player_id),
            'season_id': season_id,
            'guild_id': str(guild_id),
            'games_played': 1,
            'total_points': points,
            'total_rebounds': rebounds,
            'total_assists': assists,
            'total_steals': steals,
            'total_blocks': blocks,
            'total_turnovers': turnovers
        }).execute()
    
    return True

def get_player_season_stats(player_id: int, guild_id: int, season_id: int = None) -> dict:
    """Get player's season stats"""
    client = get_supabase()
    
    query = client.table('player_season_stats').select('*, seasons(season_name)').eq('player_id', str(player_id)).eq('guild_id', str(guild_id))
    
    if season_id:
        query = query.eq('season_id', season_id)
    else:
        # Get active season
        query = query.eq('seasons.is_active', True)
    
    result = query.execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None

def get_leaderboard(guild_id: int, season_id: int, stat: str, limit: int = 10) -> list:
    """Get stat leaderboard"""
    client = get_supabase()
    
    stat_column = f'total_{stat}' if stat != 'ppg' else 'total_points'
    
    result = client.table('player_season_stats').select('*').eq('guild_id', str(guild_id)).eq('season_id', season_id).gt('games_played', 0).order(stat_column, desc=True).limit(limit).execute()
    
    return result.data or []


# ============================================
# Minecraft Link Functions
# ============================================

def link_minecraft(guild_id: int, user_id: int, minecraft_username: str) -> bool:
    """Link a Discord user to their Minecraft username"""
    client = get_supabase()
    
    # Check if link already exists
    existing = client.table('minecraft_links').select('id').eq('guild_id', str(guild_id)).eq('user_id', str(user_id)).execute()
    
    if existing.data and len(existing.data) > 0:
        # Update existing
        result = client.table('minecraft_links').update({
            'minecraft_username': minecraft_username,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('guild_id', str(guild_id)).eq('user_id', str(user_id)).execute()
    else:
        # Insert new
        result = client.table('minecraft_links').insert({
            'guild_id': str(guild_id),
            'user_id': str(user_id),
            'minecraft_username': minecraft_username
        }).execute()
    
    return len(result.data) > 0 if result.data else False

def get_minecraft_link(guild_id: int, user_id: int) -> str:
    """Get a user's linked Minecraft username"""
    client = get_supabase()
    result = client.table('minecraft_links').select('minecraft_username').eq('guild_id', str(guild_id)).eq('user_id', str(user_id)).execute()
    
    if result.data and len(result.data) > 0:
        return result.data[0]['minecraft_username']
    return None

def get_recent_games(guild_id: int, limit: int = 10, team_id: str = None) -> list:
    """Get recent games for a guild, optionally filtered by team"""
    client = get_supabase()
    
    query = client.table('games').select('*, team1:teams!games_team1_id_fkey(name, team_name, team_logo_emoji), team2:teams!games_team2_id_fkey(name, team_name, team_logo_emoji), seasons(season_name)').eq('guild_id', str(guild_id))
    
    if team_id:
        # Filter by team (either team1 or team2)
        query = query.or_(f'team1_id.eq.{team_id},team2_id.eq.{team_id}')
    
    result = query.order('played_at', desc=True).limit(limit).execute()
    
    return result.data or []


# ============================================
# Gametime Functions  
# ============================================

def create_gametime(guild_id: int, team1_id: int, team2_id: int, 
                    scheduled_time: str, requested_by: int) -> int:
    """Create a pending gametime"""
    client = get_supabase()
    result = client.table('pending_gametimes').insert({
        'guild_id': str(guild_id),
        'team1_id': team1_id,
        'team2_id': team2_id,
        'scheduled_time': scheduled_time,
        'requested_by': str(requested_by)
    }).execute()
    return result.data[0]['id'] if result.data else None

def delete_gametime(gametime_id: int) -> bool:
    """Delete a gametime"""
    client = get_supabase()
    result = client.table('pending_gametimes').delete().eq('id', gametime_id).execute()
    return len(result.data) > 0 if result.data else False

def get_gametime(gametime_id: int) -> dict:
    """Get a gametime by ID"""
    client = get_supabase()
    result = client.table('pending_gametimes').select('*, teams!pending_gametimes_team1_id_fkey(team_name, team_logo_emoji), teams!pending_gametimes_team2_id_fkey(team_name, team_logo_emoji)').eq('id', gametime_id).execute()
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None


if __name__ == "__main__":
    # Test connection
    init_database()
