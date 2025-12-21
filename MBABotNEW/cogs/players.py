import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    get_player_team, get_team_by_role, get_team_roster, get_roster_count,
    get_demand_count, increment_demand, remove_player_from_team,
    get_server_config
)
from utils.embeds import create_demand_embed


def get_team_name(team_data: dict) -> str:
    """Get team name from team data (handles both 'name' and 'team_name' fields)"""
    return team_data.get('name') or team_data.get('team_name') or 'Unknown Team'


def get_team_conference(team_data: dict) -> str:
    """Get team conference with fallback"""
    return team_data.get('conference') or 'N/A'


class PlayerCommands(commands.Cog):
    """Commands for players"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="demand", description="Demand a release from your team (3 per season)")
    async def demand(self, interaction: discord.Interaction):
        """Demand a release from your team"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Check if player is on a team
            player_team = get_player_team(interaction.guild_id, interaction.user.id)
            
            if not player_team or not player_team.get('teams'):
                await interaction.followup.send(
                    "❌ You are not currently on a team.",
                    ephemeral=True
                )
                return
            
            team = player_team['teams']
            team_id = team['id']
            team_name = get_team_name(team)
            team_role_id = int(team['team_role_id']) if team.get('team_role_id') else None
            team_logo = team.get('team_logo_emoji')
            
            # Check demand count
            current_demands = get_demand_count(interaction.guild_id, interaction.user.id)
            
            if current_demands >= 3:
                await interaction.followup.send(
                    "❌ You have used all 3 demands for this season.",
                    ephemeral=True
                )
                return
            
            # Increment demand count
            new_count = increment_demand(interaction.guild_id, interaction.user.id)
            
            # Remove from team
            remove_player_from_team(interaction.guild_id, interaction.user.id, team_id)
            
            # Remove team role
            if team_role_id:
                role = interaction.guild.get_role(team_role_id)
                if role and role in interaction.user.roles:
                    await interaction.user.remove_roles(role)
            
            # Get server config for FA role and channels
            config = get_server_config(interaction.guild_id)
            
            # Add free agent role
            if config and config.get('free_agent_role_id'):
                fa_role = interaction.guild.get_role(int(config['free_agent_role_id']))
                if fa_role:
                    await interaction.user.add_roles(fa_role)
            
            remaining = 3 - new_count
            
            # Log to demands channel
            if config and config.get('demands_channel_id'):
                channel = interaction.guild.get_channel(int(config['demands_channel_id']))
                if channel:
                    # Get roster info for embed
                    roster_count = get_roster_count(team_id)
                    roster_cap = config.get('roster_cap') or 10
                    
                    embed = create_demand_embed(
                        interaction.user,
                        team_name,
                        team_logo,
                        new_count,
                        remaining,
                        roster_count,
                        roster_cap
                    )
                    await channel.send(embed=embed)
            
            await interaction.followup.send(
                f"✅ You have been released from **{team_name}**.\n"
                f"Demands used: {new_count}/3 ({remaining} remaining this season)",
                ephemeral=True
            )
        except Exception as e:
            await interaction.followup.send(
                f"❌ An error occurred: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="myteam", description="Check which team you're on")
    async def myteam(self, interaction: discord.Interaction):
        """Check your current team"""
        try:
            player_team = get_player_team(interaction.guild_id, interaction.user.id)
            
            if player_team and player_team.get('teams'):
                team = player_team['teams']
                team_name = get_team_name(team)
                conference = get_team_conference(team)
                
                embed = discord.Embed(
                    title="🏀 Your Team",
                    description=f"You are currently on **{team_name}**",
                    color=discord.Color.blue()
                )
                embed.add_field(name="Conference", value=conference, inline=True)
                await interaction.response.send_message(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(
                    "You are currently a free agent. Contact team coaches to sign with a team!",
                    ephemeral=True
                )
        except Exception as e:
            if not interaction.response.is_done():
                await interaction.response.send_message(
                    f"❌ An error occurred: {str(e)}",
                    ephemeral=True
                )
    
    @app_commands.command(name="roster", description="View a team's roster")
    @app_commands.describe(team="The team to view (leave empty for your team)")
    async def roster(self, interaction: discord.Interaction, team: discord.Role = None):
        """View a team's roster"""
        await interaction.response.defer()
        
        try:
            team_data = None
            team_role_id = None
            
            # If no team specified, use user's team
            if not team:
                player_team = get_player_team(interaction.guild_id, interaction.user.id)
                
                if not player_team or not player_team.get('teams'):
                    await interaction.followup.send(
                        "❌ You are not on a team. Please specify a team role."
                    )
                    return
                
                team_data = player_team['teams']
                team_role_id = int(team_data['team_role_id']) if team_data.get('team_role_id') else None
            else:
                # Get team by role
                team_data = get_team_by_role(interaction.guild_id, team.id)
                
                if not team_data:
                    await interaction.followup.send(
                        f"❌ No team found with role {team.mention}. Use `/linkteam` to link it first."
                    )
                    return
                
                team_role_id = team.id
            
            team_id = team_data['id']
            team_name = get_team_name(team_data)
            conference = get_team_conference(team_data)
            team_logo = team_data.get('team_logo_emoji')
            team_logo_url = team_data.get('logo_url') or team_data.get('team_logo_url')
            
            # Get server config for coaching roles
            config = get_server_config(interaction.guild_id)
            
            # Get coaching role IDs from config
            coaching_roles = {}
            if config:
                coaching_roles = {
                    'fo': int(config['franchise_owner_role_id']) if config.get('franchise_owner_role_id') else None,
                    'gm': int(config['gm_role_id']) if config.get('gm_role_id') else None,
                    'hc': int(config['head_coach_role_id']) if config.get('head_coach_role_id') else None,
                    'ac': int(config['assistant_coach_role_id']) if config.get('assistant_coach_role_id') else None,
                }
            
            # Get team role for color
            team_role = interaction.guild.get_role(team_role_id) if team_role_id else None
            role_color = team_role.color if team_role and team_role.color.value != 0 else discord.Color.blue()
            
            # Get team role members and categorize by coaching role
            coaches = {'fo': [], 'gm': [], 'hc': [], 'ac': []}
            all_coaching_ids = set()
            
            if team_role:
                for member in team_role.members:
                    member_role_ids = [r.id for r in member.roles]
                    
                    # Check each coaching role
                    for coach_type, role_id in coaching_roles.items():
                        if role_id and role_id in member_role_ids:
                            coaches[coach_type].append(member.id)
                            all_coaching_ids.add(member.id)
            
            # Get authenticated players from database (users table)
            db_player_ids = get_team_roster(team_id)
            # Clean the IDs (remove 'discord-' prefix)
            authenticated_ids = set()
            for pid in db_player_ids:
                clean_id = str(pid).replace('discord-', '')
                if clean_id.isdigit():
                    authenticated_ids.add(int(clean_id))
            
            # Get all members with the team role
            role_member_ids = set()
            if team_role:
                for member in team_role.members:
                    role_member_ids.add(member.id)
            
            # Combine BOTH sources: role members AND authenticated database users
            # This ensures we show everyone on the team (including coaches)
            all_team_members = role_member_ids | authenticated_ids  # Union of both sets
            
            # Get roster cap
            roster_cap = config.get('roster_cap') if config else 10
            roster_cap = roster_cap or 10
            
            # Build embed with team color
            embed = discord.Embed(
                title=f"{team_logo + ' ' if team_logo else '🏀 '}{team_name}",
                description=f"{conference} Conference\nRoster: {len(all_team_members)}/{roster_cap}",
                color=role_color
            )
            
            # Set team logo as thumbnail - try logo_url first, then custom emoji
            thumbnail_set = False
            if team_logo_url and team_logo_url.startswith(('http://', 'https://')):
                embed.set_thumbnail(url=team_logo_url)
                thumbnail_set = True
            
            if not thumbnail_set and team_logo:
                # Try to extract emoji ID from custom emoji format
                emoji_id = None
                is_animated = False
                
                if '<:' in team_logo or '<a:' in team_logo:
                    try:
                        parts = team_logo.split(':')
                        if len(parts) >= 3:
                            emoji_id = parts[2].rstrip('>')
                            is_animated = '<a:' in team_logo
                    except (IndexError, ValueError):
                        pass
                
                if emoji_id and emoji_id.isdigit():
                    ext = 'gif' if is_animated else 'png'
                    embed.set_thumbnail(url=f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}?size=128")
            
            # Helper function to get auth status suffix
            def get_status(pid):
                has_role = pid in role_member_ids
                is_auth = pid in authenticated_ids
                if has_role and is_auth:
                    return ""
                elif has_role and not is_auth:
                    return " ⚠️"
                elif is_auth and not has_role:
                    return " 🔄"
                return " ⚠️"
            
            # Coaching staff with auth status
            coaches_text = []
            for fo_id in coaches['fo']:
                coaches_text.append(f"**FO:** <@{fo_id}>{get_status(fo_id)}")
            for gm_id in coaches['gm']:
                coaches_text.append(f"**GM:** <@{gm_id}>{get_status(gm_id)}")
            for hc_id in coaches['hc']:
                coaches_text.append(f"**HC:** <@{hc_id}>{get_status(hc_id)}")
            for ac_id in coaches['ac']:
                coaches_text.append(f"**AC:** <@{ac_id}>{get_status(ac_id)}")
            
            if coaches_text:
                embed.add_field(
                    name="👔 Coaching Staff",
                    value="\n".join(coaches_text),
                    inline=False
                )
            else:
                embed.add_field(
                    name="👔 Coaching Staff",
                    value="No coaches assigned",
                    inline=False
                )
            
            # Players (non-coaches) with auth status
            player_ids = all_team_members - all_coaching_ids
            if player_ids:
                players_text = []
                for pid in player_ids:
                    players_text.append(f"<@{pid}>{get_status(pid)}")
                
                embed.add_field(
                    name="👥 Players",
                    value="\n".join(players_text),
                    inline=False
                )
            else:
                embed.add_field(
                    name="👥 Players",
                    value="No players signed yet",
                    inline=False
                )
            
            # Compact footer
            embed.set_footer(text="⚠️ Not authenticated  •  🔄 Missing role")
            
            await interaction.followup.send(embed=embed)
        
        except Exception as e:
            await interaction.followup.send(
                f"❌ An error occurred: {str(e)}"
            )

async def setup(bot):
    await bot.add_cog(PlayerCommands(bot))