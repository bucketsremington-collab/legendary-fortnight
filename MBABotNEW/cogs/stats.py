import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime
from typing import Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    get_supabase, get_server_config, get_team_by_role, get_player_team,
    get_active_season, create_or_activate_season,
    record_game, add_player_game_stats, update_player_season_stats,
    get_player_season_stats, get_leaderboard, get_recent_games
)


class StatsCommands(commands.Cog):
    """Commands for managing game statistics"""
    
    def __init__(self, bot):
        self.bot = bot
    
    def is_referee(self, member: discord.Member, guild_id: int) -> bool:
        """Check if member has referee role"""
        config = get_server_config(guild_id)
        if config and config.get('referee_role_id'):
            return any(role.id == int(config['referee_role_id']) for role in member.roles)
        return False
    
    @app_commands.command(name="setseason", description="Set or create the current season")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(season_name="Season name (e.g., S1, S2)")
    async def setseason(self, interaction: discord.Interaction, season_name: str):
        """Set the current active season"""
        result = create_or_activate_season(interaction.guild_id, season_name.upper())
        
        if result:
            await interaction.response.send_message(
                f"✅ Season **{season_name.upper()}** is now active!",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                "❌ Failed to set season. Please try again.",
                ephemeral=True
            )
    
    @app_commands.command(name="addgame", description="Record a game result (Referees only)")
    @app_commands.describe(
        team1="First team",
        team2="Second team", 
        team1_score="First team's score",
        team2_score="Second team's score"
    )
    async def addgame(self, interaction: discord.Interaction, 
                     team1: discord.Role, team2: discord.Role,
                     team1_score: int, team2_score: int):
        """Record a game result"""
        # Check if user is referee or admin
        if not (self.is_referee(interaction.user, interaction.guild_id) or 
                interaction.user.guild_permissions.administrator):
            await interaction.response.send_message(
                "❌ Only referees can record games.",
                ephemeral=True
            )
            return
        
        # Get current season
        season = get_active_season(interaction.guild_id)
        
        if not season:
            await interaction.response.send_message(
                "❌ No active season. Use `/setseason` first.",
                ephemeral=True
            )
            return
        
        season_id = season['id']
        season_name = season['season_name']
        
        # Get team IDs
        t1 = get_team_by_role(interaction.guild_id, team1.id)
        t2 = get_team_by_role(interaction.guild_id, team2.id)
        
        if not t1 or not t2:
            await interaction.response.send_message(
                "❌ One or both teams are not registered.",
                ephemeral=True
            )
            return
        
        team1_id = t1['id']
        team1_name = t1['team_name']
        team2_id = t2['id']
        team2_name = t2['team_name']
        
        # Record the game
        game_id = record_game(
            interaction.guild_id, season_id, team1_id, team2_id,
            team1_score, team2_score, interaction.user.id
        )
        
        if not game_id:
            await interaction.response.send_message(
                "❌ Failed to record game. Please try again.",
                ephemeral=True
            )
            return
        
        # Build result embed
        if team1_score > team2_score:
            winner_text = f"🏆 **{team1_name}** wins!"
        elif team2_score > team1_score:
            winner_text = f"🏆 **{team2_name}** wins!"
        else:
            winner_text = "🤝 **Tie game!**"
        
        embed = discord.Embed(
            title="🏀 Game Recorded",
            description=f"**{season_name}** | Game #{game_id}",
            color=discord.Color.green(),
            timestamp=datetime.utcnow()
        )
        embed.add_field(name=team1_name, value=f"**{team1_score}**", inline=True)
        embed.add_field(name="vs", value="⚔️", inline=True)
        embed.add_field(name=team2_name, value=f"**{team2_score}**", inline=True)
        embed.add_field(name="Result", value=winner_text, inline=False)
        embed.set_footer(text=f"Recorded by {interaction.user.display_name}")
        
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="addstats", description="Add player stats for a game (Referees only)")
    @app_commands.describe(
        game_id="The game ID from /addgame",
        player="The player",
        points="Points scored",
        rebounds="Rebounds",
        assists="Assists",
        steals="Steals",
        blocks="Blocks",
        turnovers="Turnovers"
    )
    async def addstats(self, interaction: discord.Interaction,
                      game_id: int, player: discord.Member,
                      points: int = 0, rebounds: int = 0, assists: int = 0,
                      steals: int = 0, blocks: int = 0, turnovers: int = 0):
        """Add individual player stats for a game"""
        # Check if user is referee or admin
        if not (self.is_referee(interaction.user, interaction.guild_id) or 
                interaction.user.guild_permissions.administrator):
            await interaction.response.send_message(
                "❌ Only referees can add stats.",
                ephemeral=True
            )
            return
        
        # Verify game exists
        client = get_supabase()
        result = client.table('games').select('id, season_id, seasons(season_name)').eq('id', game_id).eq('guild_id', str(interaction.guild_id)).execute()
        
        if not result.data:
            await interaction.response.send_message(
                f"❌ Game #{game_id} not found.",
                ephemeral=True
            )
            return
        
        game = result.data[0]
        season_id = game['season_id']
        season_name = game['seasons']['season_name'] if game.get('seasons') else 'Unknown'
        
        # Get player's team
        player_team = get_player_team(interaction.guild_id, player.id)
        team_id = player_team['team_id'] if player_team else None
        
        # Add game stats
        add_player_game_stats(game_id, player.id, team_id, points, rebounds, assists, steals, blocks, turnovers)
        
        # Update season stats
        update_player_season_stats(player.id, season_id, interaction.guild_id, points, rebounds, assists, steals, blocks, turnovers)
        
        embed = discord.Embed(
            title="📊 Stats Recorded",
            description=f"**{player.display_name}** | Game #{game_id}",
            color=discord.Color.blue()
        )
        embed.add_field(name="PTS", value=str(points), inline=True)
        embed.add_field(name="REB", value=str(rebounds), inline=True)
        embed.add_field(name="AST", value=str(assists), inline=True)
        embed.add_field(name="STL", value=str(steals), inline=True)
        embed.add_field(name="BLK", value=str(blocks), inline=True)
        embed.add_field(name="TOV", value=str(turnovers), inline=True)
        
        await interaction.response.send_message(embed=embed, ephemeral=True)
    
    @app_commands.command(name="playerstats", description="View a player's season stats")
    @app_commands.describe(player="The player to view (leave empty for yourself)")
    async def playerstats(self, interaction: discord.Interaction, 
                         player: Optional[discord.Member] = None):
        """View player statistics"""
        target = player or interaction.user
        
        stats = get_player_season_stats(target.id, interaction.guild_id)
        
        if not stats:
            await interaction.response.send_message(
                f"📊 No stats found for {target.display_name} this season.",
                ephemeral=True
            )
            return
        
        season_name = stats['seasons']['season_name'] if stats.get('seasons') else 'Unknown'
        games = stats['games_played']
        pts = stats['total_points']
        reb = stats['total_rebounds']
        ast = stats['total_assists']
        stl = stats['total_steals']
        blk = stats['total_blocks']
        tov = stats['total_turnovers']
        
        # Calculate averages
        ppg = round(pts / games, 1) if games > 0 else 0
        rpg = round(reb / games, 1) if games > 0 else 0
        apg = round(ast / games, 1) if games > 0 else 0
        spg = round(stl / games, 1) if games > 0 else 0
        bpg = round(blk / games, 1) if games > 0 else 0
        tpg = round(tov / games, 1) if games > 0 else 0
        
        embed = discord.Embed(
            title=f"📊 {target.display_name}'s Stats",
            description=f"**{season_name}** | {games} Games Played",
            color=discord.Color.gold()
        )
        
        # Totals
        embed.add_field(
            name="📈 Totals",
            value=f"**PTS:** {pts}\n**REB:** {reb}\n**AST:** {ast}\n**STL:** {stl}\n**BLK:** {blk}\n**TOV:** {tov}",
            inline=True
        )
        
        # Averages
        embed.add_field(
            name="📉 Per Game",
            value=f"**PPG:** {ppg}\n**RPG:** {rpg}\n**APG:** {apg}\n**SPG:** {spg}\n**BPG:** {bpg}\n**TPG:** {tpg}",
            inline=True
        )
        
        embed.set_thumbnail(url=target.display_avatar.url)
        
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="leaderboard", description="View stat leaderboards")
    @app_commands.describe(stat="The stat to rank by")
    @app_commands.choices(stat=[
        app_commands.Choice(name="Points (PPG)", value="ppg"),
        app_commands.Choice(name="Rebounds (RPG)", value="rpg"),
        app_commands.Choice(name="Assists (APG)", value="apg"),
        app_commands.Choice(name="Steals (SPG)", value="spg"),
        app_commands.Choice(name="Blocks (BPG)", value="bpg"),
    ])
    async def leaderboard(self, interaction: discord.Interaction, stat: str = "ppg"):
        """View statistical leaderboards"""
        # Get current season
        season = get_active_season(interaction.guild_id)
        
        if not season:
            await interaction.response.send_message(
                "❌ No active season.",
                ephemeral=True
            )
            return
        
        season_name = season['season_name']
        
        # Map stat to column
        stat_map = {
            "ppg": ("points", "PPG", "Points Per Game"),
            "rpg": ("rebounds", "RPG", "Rebounds Per Game"),
            "apg": ("assists", "APG", "Assists Per Game"),
            "spg": ("steals", "SPG", "Steals Per Game"),
            "bpg": ("blocks", "BPG", "Blocks Per Game"),
        }
        
        column, abbrev, full_name = stat_map[stat]
        
        # Get leaderboard
        leaders = get_leaderboard(interaction.guild_id, column, 10)
        
        if not leaders:
            await interaction.response.send_message(
                "📊 No stats recorded yet this season.",
                ephemeral=True
            )
            return
        
        embed = discord.Embed(
            title=f"🏆 {full_name} Leaders",
            description=f"**{season_name}**",
            color=discord.Color.gold()
        )
        
        leaderboard_text = ""
        medals = ["🥇", "🥈", "🥉"]
        
        for i, leader in enumerate(leaders):
            games = leader['games_played']
            total = leader[f'total_{column}']
            avg = round(total / games, 1) if games > 0 else 0
            player_id = leader['player_id']
            
            medal = medals[i] if i < 3 else f"`{i+1}.`"
            leaderboard_text += f"{medal} <@{player_id}> - **{avg}** ({total} total, {games}G)\n"
        
        embed.add_field(name=abbrev, value=leaderboard_text, inline=False)
        
        await interaction.response.send_message(embed=embed)
    
    @app_commands.command(name="gamehistory", description="View recent games")
    @app_commands.describe(team="Filter by team (optional)")
    async def gamehistory(self, interaction: discord.Interaction, 
                         team: Optional[discord.Role] = None):
        """View recent game history"""
        team_id = None
        if team:
            team_data = get_team_by_role(interaction.guild_id, team.id)
            if team_data:
                team_id = team_data['id']
        
        games = get_recent_games(interaction.guild_id, 10, team_id)
        
        if not games:
            await interaction.response.send_message(
                "📊 No games recorded yet.",
                ephemeral=True
            )
            return
        
        embed = discord.Embed(
            title="🏀 Recent Games",
            color=discord.Color.blue()
        )
        
        for game in games:
            game_id = game['id']
            t1_name = game['team1']['team_name'] if game.get('team1') else 'Unknown'
            t2_name = game['team2']['team_name'] if game.get('team2') else 'Unknown'
            t1_score = game['team1_score']
            t2_score = game['team2_score']
            season = game['seasons']['season_name'] if game.get('seasons') else 'Unknown'
            
            winner = "🏆" if t1_score > t2_score else ""
            loser = "🏆" if t2_score > t1_score else ""
            embed.add_field(
                name=f"Game #{game_id} ({season})",
                value=f"{winner}{t1_name} **{t1_score}** - **{t2_score}** {t2_name}{loser}",
                inline=False
            )
        
        await interaction.response.send_message(embed=embed)


async def setup(bot):
    await bot.add_cog(StatsCommands(bot))
