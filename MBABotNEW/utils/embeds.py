"""Helper functions for creating fancy transaction embeds"""
import discord
from datetime import datetime

def get_team_logo_url(team_logo: str) -> str:
    """Convert emoji string to URL if it's a custom emoji"""
    if not team_logo:
        return None
    
    # Check if it's a custom emoji <:name:id> or <a:name:id>
    if '<:' in team_logo or '<a:' in team_logo:
        try:
            # Extract emoji ID
            emoji_id = team_logo.split(':')[2].rstrip('>')
            if emoji_id.isdigit():
                # Check if animated
                is_animated = '<a:' in team_logo
                ext = 'gif' if is_animated else 'png'
                return f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}?size=128"
        except (IndexError, ValueError):
            pass
    
    return None

def create_signing_embed(player: discord.Member, team_name: str, team_logo: str, 
                         coach: discord.Member, roster_count: int, roster_cap: int, 
                         role_color: discord.Color = None) -> discord.Embed:
    """Create a fancy signing embed"""
    embed = discord.Embed(
        title="📝 Player Signed",
        color=role_color or discord.Color.green(),
        timestamp=datetime.utcnow()
    )
    
    # Set team logo as thumbnail from emoji
    logo_url = get_team_logo_url(team_logo)
    if logo_url:
        embed.set_thumbnail(url=logo_url)
    
    # Team display with emoji
    team_display = f"{team_logo} • {team_name}" if team_logo else team_name
    
    embed.add_field(name="Player", value=player.mention, inline=True)
    embed.add_field(name="Team", value=team_display, inline=True)
    embed.add_field(name="Roster", value=f"{roster_count}/{roster_cap}", inline=True)
    embed.add_field(name="Signed by", value=coach.mention, inline=False)
    
    return embed

def create_release_embed(player: discord.Member, team_name: str, team_logo: str, 
                        coach: discord.Member, roster_count: int, roster_cap: int,
                        role_color: discord.Color = None) -> discord.Embed:
    """Create a fancy release embed"""
    embed = discord.Embed(
        title="📤 Player Released",
        color=role_color or discord.Color.orange(),
        timestamp=datetime.utcnow()
    )
    
    logo_url = get_team_logo_url(team_logo)
    if logo_url:
        embed.set_thumbnail(url=logo_url)
    
    team_display = f"{team_logo} • {team_name}" if team_logo else team_name
    
    embed.add_field(name="Player", value=player.mention, inline=True)
    embed.add_field(name="From Team", value=team_display, inline=True)
    embed.add_field(name="Roster", value=f"{roster_count}/{roster_cap}", inline=True)
    embed.add_field(name="Released by", value=coach.mention, inline=False)
    
    return embed

def create_trade_embed(team1_name: str, team2_name: str,
                      team1_logo: str, team2_logo: str,
                      player1: discord.Member, player2: discord.Member,
                      accepted_by: discord.Member,
                      team1_roster: int, team2_roster: int, roster_cap: int,
                      role_color: discord.Color = None) -> discord.Embed:
    """Create a fancy trade embed"""
    embed = discord.Embed(
        title="🔄 Trade Completed",
        color=role_color or discord.Color.blue(),
        timestamp=datetime.utcnow()
    )
    
    team1_display = f"{team1_logo} • {team1_name}" if team1_logo else team1_name
    team2_display = f"{team2_logo} • {team2_name}" if team2_logo else team2_name
    
    embed.add_field(
        name=f"To {team2_name}",
        value=player1.mention,
        inline=True
    )
    embed.add_field(
        name=f"To {team1_name}",
        value=player2.mention,
        inline=True
    )
    embed.add_field(
        name="",
        value="",
        inline=False
    )
    embed.add_field(
        name="Teams",
        value=f"{team1_display} ⇄ {team2_display}",
        inline=False
    )
    embed.add_field(
        name="Accepted by",
        value=accepted_by.mention,
        inline=False
    )
    
    return embed

def create_contract_accepted_embed(player: discord.Member, team_name: str, team_logo: str, 
                                  coach: discord.Member = None,
                                  role_color: discord.Color = None) -> discord.Embed:
    """Create a fancy contract acceptance embed"""
    embed = discord.Embed(
        title="✅ Contract Accepted",
        color=role_color or discord.Color.green(),
        timestamp=datetime.utcnow()
    )
    
    logo_url = get_team_logo_url(team_logo)
    if logo_url:
        embed.set_thumbnail(url=logo_url)
    
    team_display = f"{team_logo} **{team_name}**" if team_logo else f"**{team_name}**"
    
    embed.add_field(name="Player", value=player.mention, inline=True)
    embed.add_field(name="Joined Team", value=team_display, inline=True)
    
    return embed

def create_contract_declined_embed(player: discord.Member, team_name: str, team_logo: str,
                                  role_color: discord.Color = None) -> discord.Embed:
    """Create a fancy contract decline embed"""
    embed = discord.Embed(
        title="❌ Contract Declined",
        color=role_color or discord.Color.red(),
        timestamp=datetime.utcnow()
    )
    
    team_display = f"{team_logo} **{team_name}**" if team_logo else f"**{team_name}**"
    
    embed.add_field(name="Player", value=player.mention, inline=True)
    embed.add_field(name="Declined Offer From", value=team_display, inline=True)
    
    return embed

def create_demand_embed(player: discord.Member, team_name: str, team_logo: str, 
                       demands_used: int, demands_left: int, roster_count: int, 
                       roster_cap: int) -> discord.Embed:
    """Create a fancy demand embed"""
    embed = discord.Embed(
        title="📢 Player Demand",
        color=discord.Color.red(),
        timestamp=datetime.utcnow()
    )
    
    logo_url = get_team_logo_url(team_logo)
    if logo_url:
        embed.set_thumbnail(url=logo_url)
    
    team_display = f"{team_logo} **{team_name}**" if team_logo else f"**{team_name}**"
    
    embed.add_field(name="Player", value=player.mention, inline=True)
    embed.add_field(name="Released From", value=team_display, inline=True)
    embed.add_field(name="Team Roster", value=f"{roster_count}/{roster_cap}", inline=True)
    embed.add_field(
        name="Demands Used",
        value=f"{demands_used}/3 ({demands_left} remaining)",
        inline=False
    )
    
    return embed

def create_gametime_embed(team1_name: str, team2_name: str, team1_logo: str, 
                         team2_logo: str, scheduled_time: str, 
                         approved_by: discord.Member) -> discord.Embed:
    """Create a fancy game scheduled embed"""
    embed = discord.Embed(
        title="🏀 Game Scheduled!",
        description=f"**{team1_name}** vs **{team2_name}**",
        color=discord.Color.green(),
        timestamp=datetime.utcnow()
    )
    
    # Use first team's logo if available
    if team1_logo:
        logo_url = get_team_logo_url(team1_logo)
        if logo_url:
            embed.set_thumbnail(url=logo_url)
    elif team2_logo:
        logo_url = get_team_logo_url(team2_logo)
        if logo_url:
            embed.set_thumbnail(url=logo_url)
    
    team1_display = f"{team1_logo} **{team1_name}**" if team1_logo else f"**{team1_name}**"
    team2_display = f"{team2_logo} **{team2_name}**" if team2_logo else f"**{team2_name}**"
    
    embed.add_field(name="Home Team", value=team1_display, inline=True)
    embed.add_field(name="Away Team", value=team2_display, inline=True)
    embed.add_field(name="⏰ Time", value=scheduled_time, inline=False)
    embed.add_field(name="✅ Approved By", value=approved_by.mention, inline=False)
    embed.set_footer(text="Good luck to both teams! 🏆")    
    return embed

def create_force_sign_warning_embed(player: discord.Member, team_name: str, 
                                   team_logo: str,
                                   role_color: discord.Color = None) -> discord.Embed:
    """Create embed for force sign warnings"""
    embed = discord.Embed(
        title="⚠️ Force Sign Reported",
        description=f"{player.mention} has reported being force signed to **{team_name}**.",
        color=role_color or discord.Color.red(),
        timestamp=datetime.utcnow()
    )
    
    if team_logo:
        logo_url = get_team_logo_url(team_logo)
        if logo_url:
            embed.set_thumbnail(url=logo_url)
    
    embed.add_field(
        name="Action Taken",
        value="Player has been removed from the team",
        inline=False
    )
    embed.add_field(
        name="⚠️ Notice",
        value="Force signing is against server rules. This incident has been logged.",
        inline=False
    )
    embed.set_footer(text="All signings require player consent")
    
    return embed
def create_offer_sent_embed(player, team_name, team_logo, coach, role_color: discord.Color = None):
    embed = discord.Embed(
        title="📨 Contract Offer Sent",
        description=f"**{team_name}** has sent a contract offer to {player.mention}",
        color=role_color or discord.Color.gold(),
        timestamp=datetime.utcnow()
    )
    
    if team_logo:
        logo_url = get_team_logo_url(team_logo)
        if logo_url:
            embed.set_thumbnail(url=logo_url)
    
    team_display = f"{team_logo} **{team_name}**" if team_logo else f"**{team_name}**"
    
    embed.add_field(name="Team", value=team_display, inline=True)
    embed.add_field(name="Player", value=player.mention, inline=True)
    embed.add_field(name="Offered By", value=coach.mention, inline=True)
    embed.set_footer(text="Player has 24 hours to accept or decline")
    
    return embed
