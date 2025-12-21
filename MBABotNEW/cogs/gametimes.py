import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    get_supabase, get_server_config, get_team_by_role, get_all_teams,
    create_gametime, delete_gametime, get_gametime
)
from utils.embeds import create_gametime_embed

class Gametimes(commands.Cog):
    """Commands for scheduling games"""
    
    def __init__(self, bot):
        self.bot = bot
    
    def get_user_team(self, guild_id: int, user_id: int, member: discord.Member):
        """Get the team a user coaches (must be assistant coach or higher)"""
        # Get server config for coaching roles
        config = get_server_config(guild_id)
        if not config:
            return None
        
        coaching_role_ids = [
            int(config['franchise_owner_role_id']) if config.get('franchise_owner_role_id') else None,
            int(config['gm_role_id']) if config.get('gm_role_id') else None,
            int(config['head_coach_role_id']) if config.get('head_coach_role_id') else None,
            int(config['assistant_coach_role_id']) if config.get('assistant_coach_role_id') else None,
        ]
        coaching_role_ids = [r for r in coaching_role_ids if r]
        
        # Check if user has any coaching role
        has_coaching_role = any(role.id in coaching_role_ids for role in member.roles)
        if not has_coaching_role:
            return None
        
        # Get all teams
        teams = get_all_teams(guild_id)
        
        # Find which team the user has the role for
        for team in teams:
            team_role_id = int(team['team_role_id'])
            if any(role.id == team_role_id for role in member.roles):
                return (team['id'], team['team_name'], team_role_id)
        
        return None
    
    @app_commands.command(name="gametime", description="Schedule a game with another team")
    @app_commands.describe(
        opponent_team="The team you want to play against",
        time="When you want to play (e.g., 'Monday 8PM EST')"
    )
    async def gametime(self, interaction: discord.Interaction, 
                      opponent_team: discord.Role, time: str):
        """Schedule a game with another team"""
        # Check if user is a coach (assistant coach or higher)
        team_data = self.get_user_team(interaction.guild_id, interaction.user.id, interaction.user)
        
        if not team_data:
            await interaction.response.send_message(
                "❌ You need a coaching role (FO/GM/HC/AC) and a team role to schedule games.",
                ephemeral=True
            )
            return
        
        team_id, team_name, team_role_id = team_data
        
        # Get opponent team
        opp_team = get_team_by_role(interaction.guild_id, opponent_team.id)
        
        if not opp_team:
            await interaction.response.send_message(
                f"❌ {opponent_team.mention} is not a registered team.",
                ephemeral=True
            )
            return
        
        opp_team_id = opp_team['id']
        opp_team_name = opp_team['team_name']
        opp_team_role_id = int(opp_team['team_role_id'])
        
        if team_id == opp_team_id:
            await interaction.response.send_message(
                "❌ You cannot schedule a game with your own team.",
                ephemeral=True
            )
            return
        
        # Get coaching roles
        config = get_server_config(interaction.guild_id)
        if not config:
            await interaction.response.send_message(
                "❌ Coaching roles not configured. Contact an admin.",
                ephemeral=True
            )
            return
        
        coaching_role_ids = [
            int(config['franchise_owner_role_id']) if config.get('franchise_owner_role_id') else None,
            int(config['gm_role_id']) if config.get('gm_role_id') else None,
            int(config['head_coach_role_id']) if config.get('head_coach_role_id') else None,
            int(config['assistant_coach_role_id']) if config.get('assistant_coach_role_id') else None,
        ]
        coaching_role_ids = [r for r in coaching_role_ids if r]
        
        # Find coaches for opponent team
        coach_ids = []
        opp_team_role = interaction.guild.get_role(opp_team_role_id)
        
        if opp_team_role:
            for member in opp_team_role.members:
                if any(role.id in coaching_role_ids for role in member.roles):
                    coach_ids.append(member.id)
        
        # Store gametime proposal in database
        gametime_id = create_gametime(
            interaction.guild_id, team_id, opp_team_id, time, interaction.user.id
        )
        
        if not gametime_id:
            await interaction.response.send_message(
                "❌ Failed to create gametime proposal. Please try again.",
                ephemeral=True
            )
            return
        
        # Create gametime proposal view
        view = GametimeView(gametime_id, team_name, opp_team_name, time, interaction.guild_id)
        
        embed = discord.Embed(
            title="🏀 Game Time Proposal",
            description=f"**{team_name}** wants to schedule a game!",
            color=discord.Color.blue()
        )
        embed.add_field(name="Opponent", value=opp_team_name, inline=True)
        embed.add_field(name="Proposed Time", value=time, inline=True)
        embed.add_field(name="Requested by", value=interaction.user.mention, inline=False)
        embed.set_footer(text="Assistant Coaches and above can approve or decline.")
        
        # Send to all opponent coaches
        sent_count = 0
        for coach_id in coach_ids:
            coach = interaction.guild.get_member(coach_id)
            if coach:
                try:
                    await coach.send(embed=embed, view=view)
                    sent_count += 1
                except discord.Forbidden:
                    pass
        
        if sent_count > 0:
            await interaction.response.send_message(
                f"✅ Game time proposal sent to {opp_team_name} coaches!\n"
                f"**{team_name} vs {opp_team_name}**\n"
                f"Proposed time: {time}",
                ephemeral=True
            )
        else:
            # Delete if we couldn't notify anyone
            delete_gametime(gametime_id)
            
            await interaction.response.send_message(
                f"❌ Could not notify any coaches from {opp_team_name}. "
                "Make sure they have DMs enabled.",
                ephemeral=True
            )


class GametimeView(discord.ui.View):
    def __init__(self, gametime_id, team1_name, team2_name, scheduled_time, guild_id):
        super().__init__(timeout=86400)  # 24 hour timeout
        self.gametime_id = gametime_id
        self.team1_name = team1_name
        self.team2_name = team2_name
        self.scheduled_time = scheduled_time
        self.guild_id = guild_id
    
    @discord.ui.button(label="Approve Game", style=discord.ButtonStyle.success)
    async def approve_game(self, button_interaction: discord.Interaction, button: discord.ui.Button):
        # Get gametime details with team logos
        gametime = get_gametime(self.gametime_id)
        
        team1_logo = gametime['team1']['team_logo_emoji'] if gametime and gametime.get('team1') else None
        team2_logo = gametime['team2']['team_logo_emoji'] if gametime and gametime.get('team2') else None
        
        # Get gametimes channel
        config = get_server_config(self.guild_id)
        
        if config and config.get('gametimes_channel_id'):
            channel = button_interaction.guild.get_channel(int(config['gametimes_channel_id']))
            if channel:
                embed = create_gametime_embed(
                    self.team1_name,
                    self.team2_name,
                    team1_logo,
                    team2_logo,
                    self.scheduled_time,
                    button_interaction.user
                )
                await channel.send(embed=embed)
        
        # Delete the pending gametime
        delete_gametime(self.gametime_id)
        
        await button_interaction.response.send_message(
            f"✅ Game approved! {self.team1_name} vs {self.team2_name} at {self.scheduled_time}",
            ephemeral=True
        )
        self.stop()
    
    @discord.ui.button(label="Decline Game", style=discord.ButtonStyle.danger)
    async def decline_game(self, button_interaction: discord.Interaction, button: discord.ui.Button):
        delete_gametime(self.gametime_id)
        
        await button_interaction.response.send_message(
            f"❌ Game declined. {self.team1_name} will need to propose a different time.",
            ephemeral=True
        )
        self.stop()


async def setup(bot):
    await bot.add_cog(Gametimes(bot))
