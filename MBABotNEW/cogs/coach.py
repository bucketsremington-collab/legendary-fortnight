import discord
from discord import app_commands
from discord.ext import commands
from datetime import datetime, timedelta
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    get_supabase, get_server_config, get_team_by_role, get_all_teams, get_team_by_id,
    get_player_team, add_player_to_team, remove_player_from_team,
    get_team_roster, get_roster_count, get_ineligible_roles,
    create_offer, get_pending_offer, delete_offer, get_offer_by_id, update_offer_message_id,
    create_trade, get_trade_by_id, delete_trade
)
from utils.embeds import (create_signing_embed, create_release_embed, create_trade_embed,
                          create_contract_accepted_embed, create_contract_declined_embed,
                          create_force_sign_warning_embed, create_offer_sent_embed)


class ForceSignView(discord.ui.View):
    """View for players to report force signing"""
    def __init__(self, team_id, team_role_id, team_name, team_logo, guild_id, embed_message_id, transactions_channel_id):
        super().__init__(timeout=86400)  # 24 hour timeout
        self.team_id = team_id
        self.team_role_id = team_role_id
        self.team_name = team_name
        self.team_logo = team_logo
        self.guild_id = guild_id
        self.embed_message_id = embed_message_id
        self.transactions_channel_id = transactions_channel_id
    
    @discord.ui.button(label="I was force signed", style=discord.ButtonStyle.danger, emoji="⚠️")
    async def force_sign_report(self, button_interaction: discord.Interaction, button: discord.ui.Button):
        await button_interaction.response.defer(ephemeral=True)
        
        # Get guild and member (button is in DM, so we need to fetch from bot)
        bot = button_interaction.client
        guild = bot.get_guild(self.guild_id)
        if not guild:
            await button_interaction.followup.send(
                "❌ Error: Could not find the server. Please contact an admin.",
                ephemeral=True
            )
            self.stop()
            return
        
        member = guild.get_member(button_interaction.user.id)
        if not member:
            await button_interaction.followup.send(
                "❌ Error: Could not find you in the server.",
                ephemeral=True
            )
            self.stop()
            return
        
        # Remove from database
        remove_player_from_team(self.guild_id, member.id, self.team_id)
        
        # Remove team role
        role = guild.get_role(self.team_role_id)
        if role and role in member.roles:
            await member.remove_roles(role)
        
        # Delete the signing embed and send warning
        if self.transactions_channel_id and self.embed_message_id:
            channel = guild.get_channel(self.transactions_channel_id)
            if channel:
                try:
                    # Delete the original signing message
                    signing_msg = await channel.fetch_message(self.embed_message_id)
                    await signing_msg.delete()
                except Exception as e:
                    print(f"Could not delete signing message: {e}")
                
                try:
                    # Send force sign warning
                    # Get role color
                    team_role = guild.get_role(self.team_role_id)
                    role_color = team_role.color if team_role else None
                    
                    embed = create_force_sign_warning_embed(
                        member,
                        self.team_name,
                        self.team_logo,
                        role_color
                    )
                    await channel.send(embed=embed)
                except Exception as e:
                    print(f"Could not send warning embed: {e}")
        
        await button_interaction.followup.send(
            "✅ You have been removed from the team. The incident has been reported.",
            ephemeral=True
        )
        self.stop()
        
        await button_interaction.followup.send(
            "✅ You have been removed from the team. The incident has been reported.",
            ephemeral=True
        )
        self.stop()


class OfferView(discord.ui.View):
    """View for players to accept/decline contract offers"""
    def __init__(self, team_id, team_role_id, team_name, team_logo, guild_id, offer_id, player, coach):
        super().__init__(timeout=86400)  # 24 hour timeout
        self.team_id = team_id
        self.team_role_id = team_role_id
        self.team_name = team_name
        self.team_logo = team_logo
        self.guild_id = guild_id
        self.offer_id = offer_id
        self.player = player
        self.coach = coach
    
    @discord.ui.button(label="Accept Offer", style=discord.ButtonStyle.success)
    async def accept_offer(self, button_interaction: discord.Interaction, button: discord.ui.Button):
        await button_interaction.response.defer(ephemeral=True)
        
        guild = button_interaction.guild
        
        # Get roster count using helper
        roster_count = get_roster_count(self.team_id)
        
        # Also count role members
        if guild:
            team_role = guild.get_role(self.team_role_id)
            if team_role:
                role_user_ids = set(member.id for member in team_role.members)
                roster_count = max(roster_count, len(role_user_ids))
        
        config = get_server_config(self.guild_id)
        roster_cap = config.get('roster_cap') or 10 if config else 10
        
        if roster_count >= roster_cap:
            await button_interaction.followup.send(
                f"❌ The team's roster is now full ({roster_count}/{roster_cap}). The offer has expired.",
                ephemeral=True
            )
            delete_offer(self.offer_id)
            self.stop()
            return
        
        # Add player to team
        add_player_to_team(self.guild_id, button_interaction.user.id, self.team_id)
        
        # Add team role
        role = button_interaction.guild.get_role(self.team_role_id)
        if role:
            await button_interaction.user.add_roles(role)
        
        # Remove free agent role
        if config and config.get('free_agent_role_id'):
            fa_role = button_interaction.guild.get_role(int(config['free_agent_role_id']))
            if fa_role and fa_role in button_interaction.user.roles:
                await button_interaction.user.remove_roles(fa_role)
        
        # Log to contracts channel
        if config and config.get('contracts_channel_id'):
            channel = button_interaction.guild.get_channel(int(config['contracts_channel_id']))
            if channel:
                team_role = button_interaction.guild.get_role(self.team_role_id)
                role_color = team_role.color if team_role else None
                
                embed = create_contract_accepted_embed(self.player, self.team_name, self.team_logo, self.coach, role_color)
                await channel.send(embed=embed)
        
        # Delete the offer
        delete_offer(self.offer_id)
        
        await button_interaction.followup.send(
            f"✅ You have accepted the offer and joined **{self.team_name}**! 🏀",
            ephemeral=True
        )
        self.stop()
    
    @discord.ui.button(label="Decline Offer", style=discord.ButtonStyle.danger)
    async def decline_offer(self, button_interaction: discord.Interaction, button: discord.ui.Button):
        await button_interaction.response.defer(ephemeral=True)
        
        delete_offer(self.offer_id)
        
        # Log to contracts channel
        config = get_server_config(self.guild_id)
        
        if config and config.get('contracts_channel_id'):
            channel = button_interaction.guild.get_channel(int(config['contracts_channel_id']))
            if channel:
                team_role = button_interaction.guild.get_role(self.team_role_id)
                role_color = team_role.color if team_role else None
                
                embed = create_contract_declined_embed(button_interaction.user, self.team_name, self.team_logo, role_color)
                await channel.send(embed=embed)
        
        await button_interaction.followup.send(
            f"You have declined the offer from **{self.team_name}**.",
            ephemeral=True
        )
        self.stop()


class TradeView(discord.ui.View):
    """View for coaches to accept/decline trade proposals"""
    def __init__(self, trade_id, team1_name, team2_name, player1, player2, 
                team1_role_id, team2_role_id, guild_id):
        super().__init__(timeout=86400)  # 24 hour timeout
        self.trade_id = trade_id
        self.team1_name = team1_name
        self.team2_name = team2_name
        self.player1 = player1
        self.player2 = player2
        self.team1_role_id = team1_role_id
        self.team2_role_id = team2_role_id
        self.guild_id = guild_id
    
    @discord.ui.button(label="Accept Trade", style=discord.ButtonStyle.success)
    async def accept_trade(self, button_interaction: discord.Interaction, button: discord.ui.Button):
        # Get current teams for both players
        player1_team = get_player_team(self.guild_id, self.player1)
        player2_team = get_player_team(self.guild_id, self.player2)
        
        if not player1_team or not player2_team:
            await button_interaction.response.send_message(
                "❌ One or both players are no longer on a team.",
                ephemeral=True
            )
            delete_trade(self.trade_id)
            self.stop()
            return
        
        team1_id = player1_team['team_id']
        team2_id = player2_team['team_id']
        
        # Swap the players - update team_id in users table
        client = get_supabase()
        client.table('users').update({'team_id': team2_id}).eq('id', str(self.player1)).execute()
        client.table('users').update({'team_id': team1_id}).eq('id', str(self.player2)).execute()
        
        # Swap roles
        guild = button_interaction.guild
        member1 = guild.get_member(self.player1)
        member2 = guild.get_member(self.player2)
        
        role1 = guild.get_role(self.team1_role_id)
        role2 = guild.get_role(self.team2_role_id)
        
        if member1 and role1 and role2:
            await member1.remove_roles(role1)
            await member1.add_roles(role2)
        
        if member2 and role1 and role2:
            await member2.remove_roles(role2)
            await member2.add_roles(role1)
        
        # Log to transactions channel
        config = get_server_config(self.guild_id)
        
        # Get team logos for embed
        team1_data = get_team_by_id(team1_id)
        team2_data = get_team_by_id(team2_id)
        team1_logo = team1_data.get('team_logo_emoji') if team1_data else None
        team2_logo = team2_data.get('team_logo_emoji') if team2_data else None
        
        # Use config channel or fallback
        transactions_channel_id = int(config['transactions_channel_id']) if config and config.get('transactions_channel_id') else 1450671861720547427
        channel = guild.get_channel(transactions_channel_id)
        if channel:
            team1_roster = get_roster_count(team1_id)
            team2_roster = get_roster_count(team2_id)
            roster_cap = config.get('roster_cap') or 10 if config else 10
            
            embed = create_trade_embed(
                self.team1_name,
                self.team2_name,
                team1_logo,
                team2_logo,
                member1,
                member2,
                button_interaction.user,
                team1_roster,
                team2_roster,
                roster_cap
            )
            await channel.send(embed=embed)
        
        # Delete the trade
        delete_trade(self.trade_id)
        
        await button_interaction.response.send_message(
            "✅ Trade accepted! Players have been swapped.",
            ephemeral=True
        )
        self.stop()
    
    @discord.ui.button(label="Decline Trade", style=discord.ButtonStyle.danger)
    async def decline_trade(self, button_interaction: discord.Interaction, button: discord.ui.Button):
        delete_trade(self.trade_id)
        
        await button_interaction.response.send_message(
            "❌ Trade declined.",
            ephemeral=True
        )
        self.stop()


class CoachCommands(commands.Cog):
    """Commands for team coaches to manage their rosters"""
    
    def __init__(self, bot):
        self.bot = bot
    
    def get_team_name(self, team_data: dict) -> str:
        """Get team name from team data (handles both 'name' and 'team_name' fields)"""
        return team_data.get('name') or team_data.get('team_name') or 'Unknown Team'
    
    def get_user_team(self, guild_id: int, user_id: int, member: discord.Member):
        """Get the team a user coaches (based on coaching role + team role)"""
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
            team_role_id = int(team['team_role_id']) if team.get('team_role_id') else None
            if team_role_id and any(role.id == team_role_id for role in member.roles):
                team_name = self.get_team_name(team)
                return (team['id'], team_name, team_role_id, team.get('team_logo_emoji'))
        
        return None
    
    def is_player_eligible(self, guild_id: int, user_id: int, member: discord.Member):
        """Check if a player is eligible for transactions"""
        ineligible_role_ids = get_ineligible_roles(guild_id)
        
        # Check if player has any ineligible roles
        for role in member.roles:
            if role.id in ineligible_role_ids:
                return False, f"Player has the ineligible role: {role.name}"
        
        return True, None
    
    def get_roster_count_with_roles(self, team_id: int, guild: discord.Guild = None, team_role_id: int = None):
        """Get current roster size for a team (includes both database entries and members with team role)"""
        db_count = get_roster_count(team_id)
        db_user_ids = set(get_team_roster(team_id))
        
        # If guild and team_role_id provided, also count members with the team role
        role_user_ids = set()
        if guild and team_role_id:
            team_role = guild.get_role(team_role_id)
            if team_role:
                role_user_ids = set(str(member.id) for member in team_role.members)
        
        # Combine both sets (union)
        all_roster_ids = db_user_ids | role_user_ids
        
        return len(all_roster_ids)
    
    def get_roster_cap_value(self, guild_id: int):
        """Get roster cap for the guild"""
        config = get_server_config(guild_id)
        return config.get('roster_cap') or 10 if config else 10
    
    @app_commands.command(name="sign", description="Sign a player to your team (requires confirmation)")
    @app_commands.describe(player="The player to sign to your team")
    async def sign(self, interaction: discord.Interaction, player: discord.Member):
        """Sign a player to the team"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Get coach's team
            team_data = self.get_user_team(interaction.guild_id, interaction.user.id, interaction.user)
            
            if not team_data:
                await interaction.followup.send(
                    "❌ You need a coaching role (FO/GM/HC/AC) and a team role to sign players.",
                    ephemeral=True
                )
                return
        
            team_id, team_name, team_role_id, team_logo = team_data
            
            # Check if player is eligible
            eligible, reason = self.is_player_eligible(interaction.guild_id, player.id, player)
            if not eligible:
                await interaction.followup.send(
                    f"❌ Cannot sign this player: {reason}",
                    ephemeral=True
                )
                return
            
            # Check if player already has any team role (check all teams)
            all_teams = get_all_teams(interaction.guild_id)
            for t in all_teams:
                t_role_id = int(t['team_role_id']) if t.get('team_role_id') else None
                if t_role_id:
                    t_role = interaction.guild.get_role(t_role_id)
                    if t_role and t_role in player.roles:
                        t_name = t.get('name') or t.get('team_name') or 'a team'
                        await interaction.followup.send(
                            f"❌ {player.mention} is already on **{t_name}**. They must be released first.",
                            ephemeral=True
                        )
                        return
            
            # Also check database for authenticated users
            existing_team = get_player_team(interaction.guild_id, player.id)
            if existing_team and existing_team.get('team_id'):
                await interaction.followup.send(
                    f"❌ {player.mention} is already on a team in the database. They must be released first.",
                    ephemeral=True
                )
                return
            
            # Check roster cap
            roster_count = self.get_roster_count_with_roles(team_id, interaction.guild, team_role_id)
            roster_cap = self.get_roster_cap_value(interaction.guild_id)
            
            if roster_count >= roster_cap:
                await interaction.followup.send(
                    f"❌ Your roster is full ({roster_count}/{roster_cap}). Release a player first.",
                    ephemeral=True
                )
                return
            
            # Add to database IMMEDIATELY
            add_player_to_team(interaction.guild_id, player.id, team_id)
            
            # Add team role
            role = interaction.guild.get_role(team_role_id)
            if role:
                await player.add_roles(role)
            
            # Remove free agent role if exists
            config = get_server_config(interaction.guild_id)
            if config and config.get('free_agent_role_id'):
                fa_role = interaction.guild.get_role(int(config['free_agent_role_id']))
                if fa_role and fa_role in player.roles:
                    await player.remove_roles(fa_role)
            
            # Send signing embed to transactions channel IMMEDIATELY
            embed_message_id = None
            # Use config channel or fallback to hardcoded channel
            transactions_channel_id = int(config['transactions_channel_id']) if config and config.get('transactions_channel_id') else 1450671861720547427
            
            if transactions_channel_id:
                channel = interaction.guild.get_channel(transactions_channel_id)
                if channel:
                    # Get roster info for embed - use role-based count for accuracy
                    new_roster_count = self.get_roster_count_with_roles(team_id, interaction.guild, team_role_id)
                    
                    # Get role color
                    team_role = interaction.guild.get_role(team_role_id)
                    role_color = team_role.color if team_role else None
                    
                    # Create fancy embed
                    embed = create_signing_embed(
                        player,
                        team_name,
                        team_logo,
                        interaction.user,
                        new_roster_count,
                        roster_cap,
                        role_color
                    )
                    msg = await channel.send(embed=embed)
                    embed_message_id = msg.id
            
            # Send DM with force-sign report button
            try:
                view = ForceSignView(team_id, team_role_id, team_name, team_logo, interaction.guild_id, embed_message_id, transactions_channel_id)
                
                dm_embed = discord.Embed(
                    title="🏀 You've been signed!",
                    description=f"You have been signed to {team_logo + ' ' if team_logo else ''}**{team_name}** by {interaction.user.mention}.",
                    color=discord.Color.blue()
                )
                dm_embed.add_field(
                    name="⚠️ Force Sign Protection",
                    value="If this signing was NOT agreed upon and you were force signed, "
                          "click the button below within 24 hours to report it.\n\n"
                          "Otherwise, you can ignore this message - you're all set!",
                    inline=False
                )
                
                await player.send(embed=dm_embed, view=view)
            except discord.Forbidden:
                pass  # Player has DMs disabled, but they're still signed
            
            await interaction.followup.send(
                f"✅ {player.mention} has been signed to **{team_name}**!",
                ephemeral=True
            )
        except Exception as e:
            await interaction.followup.send(
                f"❌ An error occurred: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="offer", description="Send a contract offer to a player")
    @app_commands.describe(player="The player to send an offer to")
    async def offer(self, interaction: discord.Interaction, player: discord.Member):
        """Send a contract offer to a player"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Get coach's team
            team_data = self.get_user_team(interaction.guild_id, interaction.user.id, interaction.user)
            
            if not team_data:
                await interaction.followup.send(
                    "❌ You need a coaching role (FO/GM/HC/AC) and a team role to send offers.",
                    ephemeral=True
                )
                return
        
            team_id, team_name, team_role_id, team_logo = team_data
            
            # Check if player is eligible
            eligible, reason = self.is_player_eligible(interaction.guild_id, player.id, player)
            if not eligible:
                await interaction.followup.send(
                    f"❌ Cannot offer to this player: {reason}",
                    ephemeral=True
                )
                return
            
            # Check if player is already on a team
            existing_team = get_player_team(interaction.guild_id, player.id)
            if existing_team:
                await interaction.followup.send(
                    f"❌ {player.mention} is already on a team.",
                    ephemeral=True
                )
                return
            
            # Check roster cap
            roster_count = self.get_roster_count_with_roles(team_id, interaction.guild, team_role_id)
            roster_cap = self.get_roster_cap_value(interaction.guild_id)
            
            if roster_count >= roster_cap:
                await interaction.followup.send(
                    f"❌ Your roster is full ({roster_count}/{roster_cap}).",
                    ephemeral=True
                )
                return
            
            # Check if player already has a pending offer from this team
            existing_offer = get_pending_offer(interaction.guild_id, team_id, player.id)
            if existing_offer:
                await interaction.followup.send(
                    f"❌ {player.mention} already has a pending offer from your team.",
                    ephemeral=True
                )
                return
            
            # Create offer expiration (24 hours)
            expires_at = datetime.utcnow() + timedelta(hours=24)
            
            # Store offer in database
            offer_id = create_offer(interaction.guild_id, team_id, player.id, interaction.user.id, expires_at)
            
            if not offer_id:
                await interaction.followup.send(
                    "❌ Failed to create offer. Please try again.",
                    ephemeral=True
                )
                return
            
            # Send offer sent embed to contracts channel IMMEDIATELY
            config = get_server_config(interaction.guild_id)
            contracts_channel_id = int(config['contracts_channel_id']) if config and config.get('contracts_channel_id') else None
            
            if contracts_channel_id:
                channel = interaction.guild.get_channel(contracts_channel_id)
                if channel:
                    # Get role color
                    team_role = interaction.guild.get_role(team_role_id)
                    role_color = team_role.color if team_role else None
                    
                    offer_sent_embed = create_offer_sent_embed(player, team_name, team_logo, interaction.user, role_color)
                    await channel.send(embed=offer_sent_embed)
            
            # Send offer to player
            view = OfferView(team_id, team_role_id, team_name, team_logo, interaction.guild_id, offer_id, player, interaction.user)
            
            try:
                offer_embed = discord.Embed(
                    title="🏀 Contract Offer",
                    description=f"You have received a contract offer from **{team_name}**!",
                    color=discord.Color.gold()
                )
                offer_embed.add_field(
                    name="Offered by",
                    value=interaction.user.mention,
                    inline=True
                )
                offer_embed.add_field(
                    name="Expires",
                    value=f"<t:{int(expires_at.timestamp())}:R>",
                    inline=True
                )
                offer_embed.set_footer(text="You have 24 hours to accept or decline this offer.")
                
                msg = await player.send(embed=offer_embed, view=view)
                
                # Update with message ID
                update_offer_message_id(offer_id, msg.id)
                
                await interaction.followup.send(
                    f"✅ Contract offer sent to {player.mention}. They have 24 hours to respond.",
                    ephemeral=True
                )
            except discord.Forbidden:
                # Delete the offer if we can't DM
                delete_offer(offer_id)
                
                await interaction.followup.send(
                    f"❌ Could not DM {player.mention}. They need to enable DMs from server members.",
                    ephemeral=True
                )
        except Exception as e:
            await interaction.followup.send(
                f"❌ An error occurred: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="release", description="Release a player from your team")
    @app_commands.describe(player="The player to release")
    async def release(self, interaction: discord.Interaction, player: discord.Member):
        """Release a player from the team"""
        await interaction.response.defer(ephemeral=True)
        
        try:
            # Get coach's team
            team_data = self.get_user_team(interaction.guild_id, interaction.user.id, interaction.user)
            
            if not team_data:
                await interaction.followup.send(
                    "❌ You need a coaching role (FO/GM/HC/AC) and a team role to release players.",
                    ephemeral=True
                )
                return
            
            team_id, team_name, team_role_id, team_logo = team_data
            
            # Check if player is eligible
            eligible, reason = self.is_player_eligible(interaction.guild_id, player.id, player)
            if not eligible:
                await interaction.followup.send(
                    f"❌ Cannot release this player: {reason}",
                    ephemeral=True
                )
                return
            
            # Check if player has the team role (primary check)
            team_role = interaction.guild.get_role(team_role_id)
            has_team_role = team_role and team_role in player.roles
            
            # Also check database for authenticated users
            player_team = get_player_team(interaction.guild_id, player.id)
            in_database = player_team and player_team.get('team_id') == team_id
            
            if not has_team_role and not in_database:
                await interaction.followup.send(
                    f"❌ {player.mention} is not on your team.",
                    ephemeral=True
                )
                return
            
            # Remove from database if they're in it
            if in_database:
                remove_player_from_team(interaction.guild_id, player.id, team_id)
            
            # Remove team role
            if has_team_role:
                await player.remove_roles(team_role)
            
            # Add free agent role
            config = get_server_config(interaction.guild_id)
            if config and config.get('free_agent_role_id'):
                fa_role = interaction.guild.get_role(int(config['free_agent_role_id']))
                if fa_role:
                    await player.add_roles(fa_role)
            
            # Log to transactions channel (use config or fallback)
            transactions_channel_id = int(config['transactions_channel_id']) if config and config.get('transactions_channel_id') else 1450671861720547427
            
            if transactions_channel_id:
                channel = interaction.guild.get_channel(transactions_channel_id)
                if channel:
                    # Get roster info for embed
                    roster_count = self.get_roster_count_with_roles(team_id, interaction.guild, team_role_id)
                    roster_cap = self.get_roster_cap_value(interaction.guild_id)
                    
                    # Get role color
                    role_color = team_role.color if team_role else None
                    
                    embed = create_release_embed(
                        player,
                        team_name,
                        team_logo,
                        interaction.user,
                        roster_count,
                        roster_cap,
                        role_color
                    )
                    await channel.send(embed=embed)
            
            # DM the player
            try:
                await player.send(
                    f"You have been released from **{team_name}**. "
                    f"You are now a free agent and can sign with any team."
                )
            except discord.Forbidden:
                pass
            
            await interaction.followup.send(
                f"✅ {player.mention} has been released from **{team_name}**.",
                ephemeral=True
            )
        except Exception as e:
            await interaction.followup.send(
                f"❌ An error occurred: {str(e)}",
                ephemeral=True
            )
    
    @app_commands.command(name="trade", description="Propose a trade with another team")
    @app_commands.describe(
        your_player="The player from your team to trade",
        their_player="The player from the other team you want"
    )
    async def trade(self, interaction: discord.Interaction, 
                   your_player: discord.Member, their_player: discord.Member):
        """Propose a player trade"""
        await interaction.response.defer(ephemeral=True)
        
        # Get coach's team
        team_data = self.get_user_team(interaction.guild_id, interaction.user.id, interaction.user)
        
        if not team_data:
            await interaction.followup.send(
                "❌ You need a coaching role (FO/GM/HC/AC) and a team role to propose trades.",
                ephemeral=True
            )
            return
        
        team_id, team_name, team_role_id, team_logo = team_data
        
        # Verify your_player is on your team
        your_player_team = get_player_team(interaction.guild_id, your_player.id)
        if not your_player_team or your_player_team['team_id'] != team_id:
            await interaction.followup.send(
                f"❌ {your_player.mention} is not on your team.",
                ephemeral=True
            )
            return
        
        # Get the other player's team
        their_player_team = get_player_team(interaction.guild_id, their_player.id)
        if not their_player_team:
            await interaction.followup.send(
                f"❌ {their_player.mention} is not on any team.",
                ephemeral=True
            )
            return
        
        # Note: get_player_team returns player_teams row with teams(*) join
        # The team info is in the 'teams' nested object
        other_team_id = their_player_team['team_id']
        other_team_info = their_player_team.get('teams', {})
        other_team_name = other_team_info.get('team_name', 'Unknown Team')
        other_team_role_id = int(other_team_info['team_role_id']) if other_team_info.get('team_role_id') else None
        
        if other_team_id == team_id:
            await interaction.followup.send(
                "❌ Both players are on the same team.",
                ephemeral=True
            )
            return
        
        # Check both players are eligible
        eligible1, reason1 = self.is_player_eligible(interaction.guild_id, your_player.id, your_player)
        if not eligible1:
            await interaction.followup.send(
                f"❌ Cannot trade {your_player.mention}: {reason1}",
                ephemeral=True
            )
            return
        
        eligible2, reason2 = self.is_player_eligible(interaction.guild_id, their_player.id, their_player)
        if not eligible2:
            await interaction.followup.send(
                f"❌ Cannot trade for {their_player.mention}: {reason2}",
                ephemeral=True
            )
            return
        
        # Get coaches from other team to DM
        config = get_server_config(interaction.guild_id)
        if not config:
            await interaction.followup.send(
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
        
        # Find coaches for other team (members with coaching role AND team role)
        coach_ids = []
        other_team_role = interaction.guild.get_role(other_team_role_id)
        
        if other_team_role:
            for member in other_team_role.members:
                if any(role.id in coaching_role_ids for role in member.roles):
                    coach_ids.append(member.id)
        
        if not coach_ids:
            await interaction.followup.send(
                f"❌ Could not find any coaches for {other_team_name}.",
                ephemeral=True
            )
            return
        
        # Store trade in database
        trade_id = create_trade(interaction.guild_id, team_id, other_team_id, your_player.id, their_player.id, interaction.user.id)
        
        if not trade_id:
            await interaction.followup.send(
                "❌ Failed to create trade proposal. Please try again.",
                ephemeral=True
            )
            return
        
        # Send trade proposals to coaches
        view = TradeView(trade_id, team_name, other_team_name, your_player.id, 
                        their_player.id, team_role_id, other_team_role_id, interaction.guild_id)
        
        trade_embed = discord.Embed(
            title="🔄 Trade Proposal",
            description=f"**{team_name}** ⇄ **{other_team_name}**",
            color=discord.Color.blue()
        )
        trade_embed.add_field(
            name=f"From {team_name}",
            value=your_player.mention,
            inline=True
        )
        trade_embed.add_field(
            name=f"From {other_team_name}",
            value=their_player.mention,
            inline=True
        )
        trade_embed.add_field(
            name="Proposed by",
            value=interaction.user.mention,
            inline=False
        )
        trade_embed.set_footer(text="Coaches have 24 hours to accept or decline this trade.")
        
        sent_count = 0
        for coach_id in coach_ids:
            coach = interaction.guild.get_member(coach_id)
            if coach:
                try:
                    await coach.send(embed=trade_embed, view=view)
                    sent_count += 1
                except discord.Forbidden:
                    pass
        
        if sent_count > 0:
            await interaction.followup.send(
                f"✅ Trade proposal sent to {other_team_name} coaches.",
                ephemeral=True
            )
        else:
            # Delete the trade if we couldn't notify anyone
            delete_trade(trade_id)
            
            await interaction.followup.send(
                f"❌ Could not notify any coaches from {other_team_name}. Trade cancelled.",
                ephemeral=True
            )
    
    @app_commands.command(name="promote", description="Promote a player on your team to a coaching role")
    @app_commands.describe(
        player="The player to promote",
        role="The coaching role to promote them to"
    )
    async def promote(self, interaction: discord.Interaction, player: discord.Member, role: str):
        """Promote a player to a coaching position"""
        await interaction.response.defer(ephemeral=True)
        
        # Get user's coaching role and team
        team_data = self.get_user_team(interaction.guild_id, interaction.user.id, interaction.user)
        
        if not team_data:
            await interaction.followup.send(
                "❌ You need a coaching role and team role to promote players.",
                ephemeral=True
            )
            return
        
        team_id, team_name, team_role_id, team_logo = team_data
        
        # Get coaching role IDs from config
        config = get_server_config(interaction.guild_id)
        if not config:
            await interaction.followup.send(
                "❌ Coaching roles not configured. Contact an admin.",
                ephemeral=True
            )
            return
        
        fo_role_id = int(config['franchise_owner_role_id']) if config.get('franchise_owner_role_id') else None
        gm_role_id = int(config['gm_role_id']) if config.get('gm_role_id') else None
        hc_role_id = int(config['head_coach_role_id']) if config.get('head_coach_role_id') else None
        ac_role_id = int(config['assistant_coach_role_id']) if config.get('assistant_coach_role_id') else None
        
        # Determine user's coaching level
        user_roles = [r.id for r in interaction.user.roles]
        user_level = None
        if fo_role_id in user_roles:
            user_level = "FO"
        elif gm_role_id in user_roles:
            user_level = "GM"
        elif hc_role_id in user_roles:
            user_level = "HC"
        
        if not user_level:
            await interaction.followup.send(
                "❌ You need to be a Franchise Owner, GM, or Head Coach to promote players.",
                ephemeral=True
            )
            return
        
        # Check if player is on the team
        team_role = interaction.guild.get_role(team_role_id)
        if not team_role or team_role not in player.roles:
            await interaction.followup.send(
                f"❌ {player.mention} is not on your team.",
                ephemeral=True
            )
            return
        
        # Determine target role and validate permissions
        role_mapping = {
            "gm": (gm_role_id, "General Manager", 1),
            "general manager": (gm_role_id, "General Manager", 1),
            "hc": (hc_role_id, "Head Coach", 1),
            "head coach": (hc_role_id, "Head Coach", 1),
            "ac": (ac_role_id, "Assistant Coach", 2),
            "assistant coach": (ac_role_id, "Assistant Coach", 2)
        }
        
        role_lower = role.lower()
        if role_lower not in role_mapping:
            await interaction.followup.send(
                "❌ Invalid role. Options: GM, Head Coach, Assistant Coach",
                ephemeral=True
            )
            return
        
        target_role_id, target_role_name, max_count = role_mapping[role_lower]
        
        # Check permissions based on hierarchy
        allowed = False
        if user_level == "FO":
            allowed = target_role_id in [gm_role_id, hc_role_id, ac_role_id]
        elif user_level == "GM":
            allowed = target_role_id in [hc_role_id, ac_role_id]
        elif user_level == "HC":
            allowed = target_role_id == ac_role_id
        
        if not allowed:
            await interaction.followup.send(
                f"❌ You don't have permission to promote to {target_role_name}.",
                ephemeral=True
            )
            return
        
        # Check if player already has this role
        if target_role_id in [r.id for r in player.roles]:
            await interaction.followup.send(
                f"❌ {player.mention} already has the {target_role_name} role.",
                ephemeral=True
            )
            return
        
        # Count current coaches with this role on the team
        current_count = 0
        if team_role:
            for member in team_role.members:
                if target_role_id in [r.id for r in member.roles]:
                    current_count += 1
        
        if current_count >= max_count:
            await interaction.followup.send(
                f"❌ This team already has {max_count} {target_role_name}(s). Cannot promote more.",
                ephemeral=True
            )
            return
        
        # Promote the player
        target_role = interaction.guild.get_role(target_role_id)
        if not target_role:
            await interaction.followup.send(
                "❌ Coaching role not found. Contact an admin.",
                ephemeral=True
            )
            return
        
        await player.add_roles(target_role)
        
        await interaction.followup.send(
            f"✅ {player.mention} has been promoted to **{target_role_name}** for {team_name}!",
            ephemeral=True
        )
    
    @app_commands.command(name="demote", description="Demote a coach on your team")
    @app_commands.describe(player="The coach to demote")
    async def demote(self, interaction: discord.Interaction, player: discord.Member):
        """Demote a coach from their position"""
        await interaction.response.defer(ephemeral=True)
        
        # Get user's coaching role and team
        team_data = self.get_user_team(interaction.guild_id, interaction.user.id, interaction.user)
        
        if not team_data:
            await interaction.followup.send(
                "❌ You need a coaching role and team role to demote coaches.",
                ephemeral=True
            )
            return
        
        team_id, team_name, team_role_id, team_logo = team_data
        
        # Get coaching role IDs from config
        config = get_server_config(interaction.guild_id)
        if not config:
            await interaction.followup.send(
                "❌ Coaching roles not configured. Contact an admin.",
                ephemeral=True
            )
            return
        
        fo_role_id = int(config['franchise_owner_role_id']) if config.get('franchise_owner_role_id') else None
        gm_role_id = int(config['gm_role_id']) if config.get('gm_role_id') else None
        hc_role_id = int(config['head_coach_role_id']) if config.get('head_coach_role_id') else None
        ac_role_id = int(config['assistant_coach_role_id']) if config.get('assistant_coach_role_id') else None
        
        # Determine user's coaching level
        user_roles = [r.id for r in interaction.user.roles]
        user_level = None
        if fo_role_id in user_roles:
            user_level = "FO"
        elif gm_role_id in user_roles:
            user_level = "GM"
        elif hc_role_id in user_roles:
            user_level = "HC"
        
        if not user_level:
            await interaction.followup.send(
                "❌ You need to be a Franchise Owner, GM, or Head Coach to demote coaches.",
                ephemeral=True
            )
            return
        
        # Check if player is on the team
        team_role = interaction.guild.get_role(team_role_id)
        if not team_role or team_role not in player.roles:
            await interaction.followup.send(
                f"❌ {player.mention} is not on your team.",
                ephemeral=True
            )
            return
        
        # Find which coaching role the player has (that can be demoted)
        player_roles = [r.id for r in player.roles]
        roles_to_remove = []
        role_names_removed = []
        
        # Check what roles the user can demote based on hierarchy
        if user_level == "FO":
            if gm_role_id in player_roles:
                roles_to_remove.append(gm_role_id)
                role_names_removed.append("General Manager")
            if hc_role_id in player_roles:
                roles_to_remove.append(hc_role_id)
                role_names_removed.append("Head Coach")
            if ac_role_id in player_roles:
                roles_to_remove.append(ac_role_id)
                role_names_removed.append("Assistant Coach")
        elif user_level == "GM":
            if hc_role_id in player_roles:
                roles_to_remove.append(hc_role_id)
                role_names_removed.append("Head Coach")
            if ac_role_id in player_roles:
                roles_to_remove.append(ac_role_id)
                role_names_removed.append("Assistant Coach")
        elif user_level == "HC":
            if ac_role_id in player_roles:
                roles_to_remove.append(ac_role_id)
                role_names_removed.append("Assistant Coach")
        
        if not roles_to_remove:
            await interaction.followup.send(
                f"❌ {player.mention} has no coaching roles that you can demote.",
                ephemeral=True
            )
            return
        
        # Prevent demoting yourself
        if player.id == interaction.user.id:
            await interaction.followup.send(
                "❌ You cannot demote yourself.",
                ephemeral=True
            )
            return
        
        # Remove the coaching roles
        for role_id in roles_to_remove:
            role_obj = interaction.guild.get_role(role_id)
            if role_obj:
                await player.remove_roles(role_obj)
        
        removed_text = ", ".join(role_names_removed)
        await interaction.followup.send(
            f"✅ {player.mention} has been demoted from: **{removed_text}**",
            ephemeral=True
        )


async def setup(bot):
    await bot.add_cog(CoachCommands(bot))
