"""
API Server for MBA Bot - Handles web app transaction requests
Runs alongside the Discord bot to process sign/release requests from the website
"""

from flask import Flask, request, jsonify
import discord
import asyncio
import os
from dotenv import load_dotenv
from threading import Thread

load_dotenv()

app = Flask(__name__)

# Store bot reference
bot_instance = None

def set_bot(bot):
    """Set the bot instance for API to use"""
    global bot_instance
    bot_instance = bot

def verify_api_key(req):
    """Verify API key from request"""
    api_key = req.headers.get('X-API-Key')
    expected_key = os.getenv('API_SECRET_KEY')
    return api_key == expected_key

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'bot_ready': bot_instance is not None and bot_instance.is_ready()})

@app.route('/api/transaction/sign', methods=['POST'])
def sign_player():
    """Sign a player to a team"""
    if not verify_api_key(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not bot_instance or not bot_instance.is_ready():
        return jsonify({'error': 'Bot not ready'}), 503
    
    try:
        data = request.json
        guild_id = int(data['guild_id'])
        player_id = int(data['player_id'])
        team_id = data['team_id']
        coach_id = data['coach_id']
        
        # Run the async transaction
        result = asyncio.run_coroutine_threadsafe(
            execute_sign(guild_id, player_id, team_id, coach_id),
            bot_instance.loop
        ).result(timeout=10)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/transaction/release', methods=['POST'])
def release_player():
    """Release a player from a team"""
    if not verify_api_key(request):
        return jsonify({'error': 'Unauthorized'}), 401
    
    if not bot_instance or not bot_instance.is_ready():
        return jsonify({'error': 'Bot not ready'}), 503
    
    try:
        data = request.json
        guild_id = int(data['guild_id'])
        player_id = int(data['player_id'])
        team_id = data['team_id']
        coach_id = data['coach_id']
        
        # Run the async transaction
        result = asyncio.run_coroutine_threadsafe(
            execute_release(guild_id, player_id, team_id, coach_id),
            bot_instance.loop
        ).result(timeout=10)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

async def execute_sign(guild_id: int, player_id: int, team_id: str, coach_id: str):
    """Execute player signing (mirrors /sign command logic)"""
    from database import add_player_to_team, get_team_by_id, get_server_config, get_roster_count
    from utils.embeds import create_signing_embed
    
    try:
        guild = bot_instance.get_guild(guild_id)
        if not guild:
            return {'success': False, 'message': 'Guild not found'}
        
        player = guild.get_member(player_id)
        if not player:
            return {'success': False, 'message': 'Player not found in Discord server'}
        
        # Get team info
        team = get_team_by_id(team_id)
        if not team:
            return {'success': False, 'message': 'Team not found'}
        
        team_name = team.get('name') or team.get('team_name')
        team_role_id = int(team['team_role_id']) if team.get('team_role_id') else None
        team_logo = team.get('team_logo_emoji')
        
        if not team_role_id:
            return {'success': False, 'message': 'Team does not have a Discord role configured'}
        
        # Check roster cap
        roster_count = get_roster_count(team_id)
        roster_cap = 10  # TODO: Make configurable
        
        if roster_count >= roster_cap:
            return {'success': False, 'message': f'Roster is full ({roster_count}/{roster_cap})'}
        
        # Add to database
        add_player_to_team(guild_id, player_id, team_id)
        
        # Add team role
        role = guild.get_role(team_role_id)
        if role:
            await player.add_roles(role)
        
        # Remove free agent role
        config = get_server_config(guild_id)
        if config and config.get('free_agent_role_id'):
            fa_role = guild.get_role(int(config['free_agent_role_id']))
            if fa_role and fa_role in player.roles:
                await player.remove_roles(fa_role)
        
        # Post to transactions channel
        transactions_channel_id = int(config['transactions_channel_id']) if config and config.get('transactions_channel_id') else None
        
        if transactions_channel_id:
            channel = guild.get_channel(transactions_channel_id)
            if channel:
                team_role = guild.get_role(team_role_id)
                role_color = team_role.color if team_role else None
                
                # Get coach member for embed
                coach = guild.get_member(int(coach_id.replace('discord-', ''))) if coach_id.startswith('discord-') else None
                if not coach:
                    # Fallback: use a generic mention
                    coach = guild.get_member(guild.owner_id)
                
                embed = create_signing_embed(
                    player,
                    team_name,
                    team_logo,
                    coach,
                    roster_count + 1,
                    roster_cap,
                    role_color
                )
                await channel.send(embed=embed)
        
        return {'success': True, 'message': 'Player signed successfully'}
    
    except Exception as e:
        print(f"Error in execute_sign: {e}")
        return {'success': False, 'message': str(e)}

async def execute_release(guild_id: int, player_id: int, team_id: str, coach_id: str):
    """Execute player release (mirrors /release command logic)"""
    from database import remove_player_from_team, get_team_by_id, get_server_config, get_roster_count
    from utils.embeds import create_release_embed
    
    try:
        guild = bot_instance.get_guild(guild_id)
        if not guild:
            return {'success': False, 'message': 'Guild not found'}
        
        player = guild.get_member(player_id)
        if not player:
            return {'success': False, 'message': 'Player not found in Discord server'}
        
        # Get team info
        team = get_team_by_id(team_id)
        if not team:
            return {'success': False, 'message': 'Team not found'}
        
        team_name = team.get('name') or team.get('team_name')
        team_role_id = int(team['team_role_id']) if team.get('team_role_id') else None
        team_logo = team.get('team_logo_emoji')
        
        if not team_role_id:
            return {'success': False, 'message': 'Team does not have a Discord role configured'}
        
        # Remove from database
        remove_player_from_team(guild_id, player_id, team_id)
        
        # Remove team role
        team_role = guild.get_role(team_role_id)
        if team_role and team_role in player.roles:
            await player.remove_roles(team_role)
        
        # Add free agent role
        config = get_server_config(guild_id)
        if config and config.get('free_agent_role_id'):
            fa_role = guild.get_role(int(config['free_agent_role_id']))
            if fa_role:
                await player.add_roles(fa_role)
        
        # Post to transactions channel
        transactions_channel_id = int(config['transactions_channel_id']) if config and config.get('transactions_channel_id') else None
        
        if transactions_channel_id:
            channel = guild.get_channel(transactions_channel_id)
            if channel:
                roster_count = get_roster_count(team_id)
                roster_cap = 10
                
                role_color = team_role.color if team_role else None
                
                # Get coach member for embed
                coach = guild.get_member(int(coach_id.replace('discord-', ''))) if coach_id.startswith('discord-') else None
                if not coach:
                    coach = guild.get_member(guild.owner_id)
                
                embed = create_release_embed(
                    player,
                    team_name,
                    team_logo,
                    coach,
                    roster_count,
                    roster_cap,
                    role_color
                )
                await channel.send(embed=embed)
        
        return {'success': True, 'message': 'Player released successfully'}
    
    except Exception as e:
        print(f"Error in execute_release: {e}")
        return {'success': False, 'message': str(e)}

def run_flask():
    """Run Flask server"""
    port = int(os.getenv('API_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

def start_api_server(bot):
    """Start the API server in a separate thread"""
    set_bot(bot)
    thread = Thread(target=run_flask, daemon=True)
    thread.start()
    print(f"API Server started on port {os.getenv('API_PORT', 5000)}")
