import discord
from discord import app_commands
from discord.ext import commands
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import (
    ensure_server_config, update_server_config, get_server_config,
    add_ineligible_role, remove_ineligible_role, get_supabase
)

class Setup(commands.Cog):
    """Admin setup commands for configuring the MBA bot"""
    
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="setup", description="Configure all MBA roles and channels")
    @app_commands.default_permissions(administrator=True)
    async def setup(self, interaction: discord.Interaction):
        """Interactive setup for all server configurations"""
        await interaction.response.send_message(
            "🏀 **MBA Bot Setup**\n\nPlease use the following commands to configure the bot:\n\n"
            "**Roles:**\n"
            "`/setrole franchise_owner @role` - Set Franchise Owner role\n"
            "`/setrole general_manager @role` - Set General Manager role\n"
            "`/setrole head_coach @role` - Set Head Coach role\n"
            "`/setrole assistant_coach @role` - Set Assistant Coach role\n"
            "`/setrole pickup_host @role` - Set Pickup Host role\n"
            "`/setrole streamer @role` - Set Streamer role\n"
            "`/setrole referee @role` - Set Referee role\n"
            "`/setrole free_agent @role` - Set Free Agent role\n\n"
            "**Channels:**\n"
            "`/setchannel lft #channel` - Looking For Team channel\n"
            "`/setchannel alerts #channel` - Alerts channel\n"
            "`/setchannel demands #channel` - Demands channel\n"
            "`/setchannel verdicts #channel` - Verdicts channel\n"
            "`/setchannel transactions #channel` - Transactions channel\n"
            "`/setchannel contracts #channel` - Contracts channel\n"
            "`/setchannel agency #channel` - Agency channel\n"
            "`/setchannel gametimes #channel` - Gametimes channel\n\n"
            "**Other:**\n"
            "`/addineligible @role` - Add an ineligible role\n"
            "`/removeineligible @role` - Remove an ineligible role\n"
            "`/setrostercap <number>` - Set max roster size (default: 10)\n"
            "`/autorole @role` - Set autorole for new members",
            ephemeral=True
        )
    
    @app_commands.command(name="setrole", description="Set a specific role for the MBA system")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        role_type="The type of role to set",
        role="The Discord role to assign"
    )
    @app_commands.choices(role_type=[
        app_commands.Choice(name="Franchise Owner", value="franchise_owner"),
        app_commands.Choice(name="General Manager", value="general_manager"),
        app_commands.Choice(name="Head Coach", value="head_coach"),
        app_commands.Choice(name="Assistant Coach", value="assistant_coach"),
        app_commands.Choice(name="Pickup Host", value="pickup_host"),
        app_commands.Choice(name="Streamer", value="streamer"),
        app_commands.Choice(name="Referee", value="referee"),
        app_commands.Choice(name="Free Agent", value="free_agent"),
    ])
    async def setrole(self, interaction: discord.Interaction, role_type: str, role: discord.Role):
        """Set a specific role in the configuration"""
        # Ensure guild exists in config
        ensure_server_config(interaction.guild_id)
        
        # Map role_type to column name
        role_mapping = {
            'franchise_owner': 'franchise_owner_role_id',
            'general_manager': 'gm_role_id',
            'head_coach': 'head_coach_role_id',
            'assistant_coach': 'assistant_coach_role_id',
            'pickup_host': 'pickup_host_role_id',
            'streamer': 'streamer_role_id',
            'referee': 'referee_role_id',
            'free_agent': 'free_agent_role_id'
        }
        
        column = role_mapping[role_type]
        
        # Update the config
        update_server_config(interaction.guild_id, **{column: role.id})
        
        role_name = role_type.replace('_', ' ').title()
        await interaction.response.send_message(
            f"✅ {role_name} role set to {role.mention}",
            ephemeral=True
        )
    
    @app_commands.command(name="setchannel", description="Set a specific channel for the MBA system")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        channel_type="The type of channel to set",
        channel="The Discord channel to assign"
    )
    @app_commands.choices(channel_type=[
        app_commands.Choice(name="Looking For Team", value="lft"),
        app_commands.Choice(name="Alerts", value="alerts"),
        app_commands.Choice(name="Demands", value="demands"),
        app_commands.Choice(name="Verdicts", value="verdicts"),
        app_commands.Choice(name="Transactions", value="transactions"),
        app_commands.Choice(name="Contracts", value="contracts"),
        app_commands.Choice(name="Agency", value="agency"),
        app_commands.Choice(name="Gametimes", value="gametimes"),
    ])
    async def setchannel(self, interaction: discord.Interaction, channel_type: str, channel: discord.TextChannel):
        """Set a specific channel in the configuration"""
        ensure_server_config(interaction.guild_id)
        
        channel_mapping = {
            'lft': 'lft_channel_id',
            'alerts': 'alerts_channel_id',
            'demands': 'demands_channel_id',
            'verdicts': 'verdicts_channel_id',
            'transactions': 'transactions_channel_id',
            'contracts': 'contracts_channel_id',
            'agency': 'agency_channel_id',
            'gametimes': 'gametimes_channel_id'
        }
        
        column = channel_mapping[channel_type]
        
        update_server_config(interaction.guild_id, **{column: channel.id})
        
        channel_name = channel_type.replace('_', ' ').title()
        await interaction.response.send_message(
            f"✅ {channel_name} channel set to {channel.mention}",
            ephemeral=True
        )
    
    @app_commands.command(name="autorole", description="Set the role automatically given to new members")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(role="The role to give new members (leave empty to disable)")
    async def autorole(self, interaction: discord.Interaction, role: discord.Role = None):
        """Set or disable the autorole"""
        ensure_server_config(interaction.guild_id)
        
        role_id = role.id if role else None
        update_server_config(interaction.guild_id, autorole_id=role_id)
        
        if role:
            await interaction.response.send_message(
                f"✅ Autorole set to {role.mention}. New members will automatically receive this role.",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                "✅ Autorole disabled.",
                ephemeral=True
            )
    
    @app_commands.command(name="addineligible", description="Add a role to the ineligible list")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(role="Role that prevents players from being signed/traded")
    async def addineligible(self, interaction: discord.Interaction, role: discord.Role):
        """Add a role to the ineligible roles list"""
        try:
            result = add_ineligible_role(interaction.guild_id, role.id)
            if result:
                await interaction.response.send_message(
                    f"✅ {role.mention} added to ineligible roles. Players with this role cannot be signed, traded, or released.",
                    ephemeral=True
                )
            else:
                await interaction.response.send_message(
                    f"❌ Failed to add {role.mention} to ineligible roles. It may already be in the list.",
                    ephemeral=True
                )
        except Exception as e:
            if "duplicate" in str(e).lower():
                await interaction.response.send_message(
                    f"❌ {role.mention} is already in the ineligible roles list.",
                    ephemeral=True
                )
            else:
                raise e
    
    @app_commands.command(name="removeineligible", description="Remove a role from the ineligible list")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(role="Role to remove from ineligible list")
    async def removeineligible(self, interaction: discord.Interaction, role: discord.Role):
        """Remove a role from the ineligible roles list"""
        if remove_ineligible_role(interaction.guild_id, role.id):
            await interaction.response.send_message(
                f"✅ {role.mention} removed from ineligible roles.",
                ephemeral=True
            )
        else:
            await interaction.response.send_message(
                f"❌ {role.mention} was not in the ineligible roles list.",
                ephemeral=True
            )
    
    @app_commands.command(name="setrostercap", description="Set the maximum roster size for teams")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(cap="Maximum number of players per team")
    async def setrostercap(self, interaction: discord.Interaction, cap: int):
        """Set the roster cap"""
        if cap < 1 or cap > 50:
            await interaction.response.send_message(
                "❌ Roster cap must be between 1 and 50.",
                ephemeral=True
            )
            return
        
        ensure_server_config(interaction.guild_id)
        update_server_config(interaction.guild_id, roster_cap=cap)
        
        await interaction.response.send_message(
            f"✅ Roster cap set to {cap} players per team.",
            ephemeral=True
        )
    
    @app_commands.command(name="clearfreeagent", description="Unset the free agent role")
    @app_commands.default_permissions(administrator=True)
    async def clearfreeagent(self, interaction: discord.Interaction):
        """Clear the free agent role configuration"""
        update_server_config(interaction.guild_id, free_agent_role_id=None)
        
        await interaction.response.send_message(
            "✅ Free agent role has been unset.",
            ephemeral=True
        )
    
    @app_commands.command(name="resetdemands", description="Reset demand counter for all players")
    @app_commands.default_permissions(administrator=True)
    async def resetdemands(self, interaction: discord.Interaction):
        """Reset all demand counts for a new season"""
        client = get_supabase()
        result = client.table('demands').delete().eq('guild_id', str(interaction.guild_id)).execute()
        count = len(result.data) if result.data else 0
        
        await interaction.response.send_message(
            f"✅ Reset demand counts for all players. ({count} records cleared)",
            ephemeral=True
        )
    
    @app_commands.command(name="viewconfig", description="View current server configuration")
    @app_commands.default_permissions(administrator=True)
    async def viewconfig(self, interaction: discord.Interaction):
        """View current server configuration"""
        config = get_server_config(interaction.guild_id)
        
        if not config:
            await interaction.response.send_message(
                "❌ No configuration found. Use `/setup` to configure the bot.",
                ephemeral=True
            )
            return
        
        embed = discord.Embed(
            title="🔧 Server Configuration",
            color=discord.Color.blue()
        )
        
        # Coaching Roles
        roles_text = []
        role_fields = [
            ('franchise_owner_role_id', 'Franchise Owner (FO)'),
            ('gm_role_id', 'General Manager (GM)'),
            ('head_coach_role_id', 'Head Coach (HC)'),
            ('assistant_coach_role_id', 'Assistant Coach (AC)'),
            ('free_agent_role_id', 'Free Agent'),
            ('pickup_host_role_id', 'Pickup Host'),
            ('streamer_role_id', 'Streamer'),
            ('referee_role_id', 'Referee'),
        ]
        
        for field, name in role_fields:
            role_id = config.get(field)
            if role_id:
                roles_text.append(f"**{name}:** <@&{role_id}> (`{role_id}`)")
            else:
                roles_text.append(f"**{name}:** Not set")
        
        embed.add_field(
            name="👔 Roles",
            value="\n".join(roles_text),
            inline=False
        )
        
        # Channels
        channels_text = []
        channel_fields = [
            ('lft_channel_id', 'Looking For Team'),
            ('alerts_channel_id', 'Alerts'),
            ('demands_channel_id', 'Demands'),
            ('verdicts_channel_id', 'Verdicts'),
            ('transactions_channel_id', 'Transactions'),
            ('contracts_channel_id', 'Contracts'),
            ('agency_channel_id', 'Agency'),
            ('gametimes_channel_id', 'Gametimes'),
        ]
        
        for field, name in channel_fields:
            channel_id = config.get(field)
            if channel_id:
                channels_text.append(f"**{name}:** <#{channel_id}>")
            else:
                channels_text.append(f"**{name}:** Not set")
        
        embed.add_field(
            name="📢 Channels",
            value="\n".join(channels_text),
            inline=False
        )
        
        # Other settings
        roster_cap = config.get('roster_cap') or 10
        embed.add_field(
            name="⚙️ Other Settings",
            value=f"**Roster Cap:** {roster_cap}",
            inline=False
        )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

async def setup(bot):
    await bot.add_cog(Setup(bot))
