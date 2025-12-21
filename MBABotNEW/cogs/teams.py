import discord
from discord import app_commands
from discord.ext import commands
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_team_by_role, get_all_teams, create_team, delete_team, update_team_logo

class Teams(commands.Cog):
    """Commands for team management"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="team", description="Manage teams in the MBA")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        action="Action to perform",
        role="The Discord role for this team",
        conference="The conference this team belongs to"
    )
    @app_commands.choices(
        action=[
            app_commands.Choice(name="Add Team", value="add"),
            app_commands.Choice(name="Remove Team", value="remove"),
            app_commands.Choice(name="List Teams", value="list"),
        ],
        conference=[
            app_commands.Choice(name="Desert", value="Desert"),
            app_commands.Choice(name="Plains", value="Plains"),
        ]
    )
    async def team(self, interaction: discord.Interaction, action: str, 
                  role: discord.Role = None, conference: str = None):
        """Team management command"""
        
        if action == "add":
            if not role or not conference:
                await interaction.response.send_message(
                    "❌ Please provide both a role and conference when adding a team.",
                    ephemeral=True
                )
                return
            
            try:
                # Check if team already exists
                existing = get_team_by_role(interaction.guild_id, role.id)
                if existing:
                    await interaction.response.send_message(
                        f"❌ A team with role {role.mention} already exists.",
                        ephemeral=True
                    )
                    return
                
                # Add team to database
                result = create_team(interaction.guild_id, role.name, role.id, conference)
                
                if result:
                    await interaction.response.send_message(
                        f"✅ Team **{role.name}** added to the {conference} Conference!",
                        ephemeral=True
                    )
                else:
                    await interaction.response.send_message(
                        f"❌ Failed to create team. Please try again.",
                        ephemeral=True
                    )
            except Exception as e:
                await interaction.response.send_message(
                    f"❌ Error creating team: {str(e)}",
                    ephemeral=True
                )
        
        elif action == "remove":
            if not role:
                await interaction.response.send_message(
                    "❌ Please provide a role when removing a team.",
                    ephemeral=True
                )
                return
            
            # Check if team exists
            existing = get_team_by_role(interaction.guild_id, role.id)
            if not existing:
                await interaction.response.send_message(
                    f"❌ No team found with role {role.mention}.",
                    ephemeral=True
                )
                return
            
            # Remove team from database
            if delete_team(interaction.guild_id, role.id):
                await interaction.response.send_message(
                    f"✅ Team **{role.name}** has been removed.",
                    ephemeral=True
                )
            else:
                await interaction.response.send_message(
                    f"❌ Failed to remove team. Please try again.",
                    ephemeral=True
                )
        
        elif action == "list":
            # List all teams
            teams = get_all_teams(interaction.guild_id)
            
            if not teams:
                await interaction.response.send_message(
                    "No teams have been created yet. Use `/team add` to create a team.",
                    ephemeral=True
                )
                return
            
            # Group teams by conference
            desert_teams = []
            plains_teams = []
            
            for team in teams:
                role_id = int(team['team_role_id'])
                role = interaction.guild.get_role(role_id)
                role_mention = role.mention if role else team['team_name']
                
                if team['conference'] == "Desert":
                    desert_teams.append(role_mention)
                elif team['conference'] == "Plains":
                    plains_teams.append(role_mention)
            
            embed = discord.Embed(
                title="🏀 MBA Teams",
                color=discord.Color.gold()
            )
            
            if desert_teams:
                embed.add_field(
                    name="🏜️ Desert Conference",
                    value="\n".join(desert_teams),
                    inline=False
                )
            
            if plains_teams:
                embed.add_field(
                    name="🌾 Plains Conference",
                    value="\n".join(plains_teams),
                    inline=False
                )
            
            await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="setlogo", description="Set a team's logo emoji")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        team="The team role",
        emoji="The emoji to use as team logo (server emoji or standard emoji)"
    )
    async def setlogo(self, interaction: discord.Interaction, team: discord.Role, emoji: str):
        """Set a team's logo emoji"""
        # Get team
        team_data = get_team_by_role(interaction.guild_id, team.id)
        
        if not team_data:
            await interaction.response.send_message(
                f"❌ No team found with role {team.mention}.",
                ephemeral=True
            )
            return
        
        # Update team logo
        if update_team_logo(team_data['id'], emoji):
            await interaction.response.send_message(
                f"✅ Team logo set! {emoji} {team.mention}",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                f"❌ Failed to update team logo. Please try again.",
                ephemeral=True
            )
    
    @app_commands.command(name="setalllogos", description="Auto-set team logos from server emojis")
    @app_commands.default_permissions(administrator=True)
    async def setalllogos(self, interaction: discord.Interaction):
        """Auto-detect and set team logos from server emojis"""
        await interaction.response.defer(ephemeral=True)
        
        teams = get_all_teams(interaction.guild_id)
        if not teams:
            await interaction.followup.send("❌ No teams found.", ephemeral=True)
            return
        
        # Get all server emojis
        server_emojis = {e.name.lower().replace('_', '').replace('-', '').replace(' ', ''): e for e in interaction.guild.emojis}
        
        results = []
        for team in teams:
            team_name = team.get('name') or team.get('team_name') or ''
            # Create search key from team name
            search_key = team_name.lower().replace(' ', '').replace('-', '').replace('_', '')
            
            # Try to find matching emoji
            matched_emoji = None
            for emoji_key, emoji in server_emojis.items():
                if search_key in emoji_key or emoji_key in search_key:
                    matched_emoji = emoji
                    break
            
            if matched_emoji:
                emoji_str = f"<:{matched_emoji.name}:{matched_emoji.id}>"
                if update_team_logo(team['id'], emoji_str):
                    results.append(f"✅ {team_name}: {emoji_str}")
                else:
                    results.append(f"❌ {team_name}: Failed to update")
            else:
                results.append(f"⚠️ {team_name}: No matching emoji found")
        
        await interaction.followup.send(
            "**Logo Update Results:**\n" + "\n".join(results),
            ephemeral=True
        )

async def setup(bot):
    await bot.add_cog(Teams(bot))
