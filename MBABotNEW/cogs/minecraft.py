import discord
from discord import app_commands
from discord.ext import commands, tasks
from datetime import datetime
from mcstatus import JavaServer
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_supabase, get_server_config, ensure_server_config, update_server_config

class MinecraftStatus(commands.Cog):
    """Minecraft server status monitoring"""
    
    def __init__(self, bot):
        self.bot = bot
        self.update_status.start()
    
    def cog_unload(self):
        self.update_status.cancel()
    
    @tasks.loop(minutes=5)
    async def update_status(self):
        """Update all Minecraft status embeds every 5 minutes"""
        client = get_supabase()
        
        # Get all guilds with MC status enabled
        result = client.table('server_config').select(
            'guild_id, mc_status_channel_id, mc_status_message_id, mc_server_address'
        ).not_.is_('mc_status_channel_id', 'null').not_.is_('mc_status_message_id', 'null').execute()
        
        configs = result.data or []
        
        for config in configs:
            guild_id = int(config['guild_id'])
            channel_id = int(config['mc_status_channel_id'])
            message_id = int(config['mc_status_message_id'])
            server_address = config['mc_server_address']
            try:
                guild = self.bot.get_guild(guild_id)
                if not guild:
                    continue
                
                channel = guild.get_channel(channel_id)
                if not channel:
                    continue
                
                # Get the message
                try:
                    message = await channel.fetch_message(message_id)
                except discord.NotFound:
                    # Message was deleted, create a new one
                    embed = await self.create_status_embed(server_address)
                    new_message = await channel.send(embed=embed)
                    
                    # Update database with new message ID
                    update_server_config(guild_id, mc_status_message_id=new_message.id)
                    continue
                
                # Update the existing message
                embed = await self.create_status_embed(server_address)
                await message.edit(embed=embed)
                
            except Exception as e:
                print(f"Error updating MC status for guild {guild_id}: {e}")
    
    @update_status.before_loop
    async def before_update_status(self):
        """Wait until the bot is ready before starting the loop"""
        await self.bot.wait_until_ready()
    
    async def create_status_embed(self, server_address: str):
        """Create the status embed for a Minecraft server"""
        # Parse address and port
        if ':' in server_address:
            address, port = server_address.split(':')
            port = int(port)
        else:
            address = server_address
            port = 25565
        
        embed = discord.Embed(
            title="🎮 MBA Minecraft Server",
            color=discord.Color.green(),
            timestamp=datetime.utcnow()
        )
        
        try:
            # Query the server
            server = JavaServer(address, port)
            status = await asyncio.to_thread(server.status)
            
            # Server is online
            embed.color = discord.Color.green()
            embed.add_field(
                name="📡 Status",
                value="🟢 **Online**",
                inline=True
            )
            
            # Server IP
            embed.add_field(
                name="🌐 Server IP",
                value=f"`{server_address}`",
                inline=True
            )
            
            # Player count
            player_count = f"{status.players.online}/{status.players.max}"
            embed.add_field(
                name="👥 Players",
                value=player_count,
                inline=True
            )
            
            # Version
            embed.add_field(
                name="📦 Version",
                value=status.version.name,
                inline=True
            )
            
            # Latency
            embed.add_field(
                name="⚡ Ping",
                value=f"{round(status.latency)}ms",
                inline=True
            )
            
            # MOTD (if available)
            if hasattr(status, 'description') and status.description:
                motd = status.description
                if isinstance(motd, dict):
                    motd = motd.get('text', '')
                embed.add_field(
                    name="📝 MOTD",
                    value=str(motd)[:100] if motd else "No MOTD",
                    inline=False
                )
            
            # Player list
            if status.players.online > 0:
                player_list_shown = False
                
                # First try: Check if sample list is available in status
                if hasattr(status.players, 'sample') and status.players.sample:
                    player_names = [player.name for player in status.players.sample[:20]]
                    player_list = "\n".join([f"• {name}" for name in player_names])
                    if status.players.online > len(player_names):
                        remaining = status.players.online - len(player_names)
                        player_list += f"\n*...and {remaining} more*"
                    
                    embed.add_field(
                        name="🎮 Online Players",
                        value=player_list,
                        inline=False
                    )
                    player_list_shown = True
                
                # Second try: Use query if available
                if not player_list_shown:
                    try:
                        query = await asyncio.to_thread(server.query)
                        
                        if query.players.names:
                            player_list = "\n".join([f"• {name}" for name in query.players.names[:20]])
                            if len(query.players.names) > 20:
                                player_list += f"\n*...and {len(query.players.names) - 20} more*"
                            
                            embed.add_field(
                                name="🎮 Online Players",
                                value=player_list,
                                inline=False
                            )
                            player_list_shown = True
                    except Exception:
                        pass
                
                # Fallback: Just show count
                if not player_list_shown:
                    embed.add_field(
                        name="🎮 Online Players",
                        value=f"{status.players.online} player{'s' if status.players.online != 1 else ''} online",
                        inline=False
                    )
            else:
                embed.add_field(
                    name="🎮 Online Players",
                    value="No players online",
                    inline=False
                )
            
        except Exception as e:
            # Server is offline or unreachable
            embed.color = discord.Color.red()
            embed.add_field(
                name="📡 Status",
                value="🔴 **Offline**",
                inline=True
            )
            embed.add_field(
                name="🌐 Server IP",
                value=f"`{server_address}`",
                inline=True
            )
            embed.add_field(
                name="❌ Error",
                value="Server is unreachable or offline",
                inline=False
            )
        
        embed.set_footer(text="Updates every 5 minutes")
        return embed
    
    @app_commands.command(name="mcstatus", description="Set up Minecraft server status monitoring")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        channel="Channel where the status will be posted",
        server_address="Minecraft server address (default: 45.126.211.8:8105)"
    )
    async def mcstatus(self, interaction: discord.Interaction, 
                      channel: discord.TextChannel,
                      server_address: str = "45.126.211.8:8105"):
        """Set up or update the Minecraft server status embed"""
        
        await interaction.response.defer(ephemeral=True)
        
        # Create the initial embed
        embed = await self.create_status_embed(server_address)
        
        # Send the status message
        message = await channel.send(embed=embed)
        
        # Save to database
        ensure_server_config(interaction.guild_id)
        update_server_config(
            interaction.guild_id,
            mc_status_channel_id=channel.id,
            mc_status_message_id=message.id,
            mc_server_address=server_address
        )
        
        await interaction.followup.send(
            f"✅ Minecraft server status set up in {channel.mention}!\n"
            f"Server: `{server_address}`\n"
            f"The status will update automatically every 5 minutes.",
            ephemeral=True
        )
    
    @app_commands.command(name="mcupdate", description="Manually update the Minecraft server status")
    async def mcupdate(self, interaction: discord.Interaction):
        """Manually trigger a status update"""
        
        config = get_server_config(interaction.guild_id)
        
        if not config or not config.get('mc_status_channel_id') or not config.get('mc_status_message_id'):
            await interaction.response.send_message(
                "❌ Minecraft status not set up. Use `/mcstatus` first.",
                ephemeral=True
            )
            return
        
        channel_id = int(config['mc_status_channel_id'])
        message_id = int(config['mc_status_message_id'])
        server_address = config['mc_server_address']
        
        await interaction.response.defer(ephemeral=True)
        
        try:
            channel = interaction.guild.get_channel(channel_id)
            if not channel:
                await interaction.followup.send(
                    "❌ Status channel not found. Use `/mcstatus` to set it up again.",
                    ephemeral=True
                )
                return
            
            message = await channel.fetch_message(message_id)
            embed = await self.create_status_embed(server_address)
            await message.edit(embed=embed)
            
            await interaction.followup.send(
                "✅ Server status updated!",
                ephemeral=True
            )
        except discord.NotFound:
            await interaction.followup.send(
                "❌ Status message not found. Use `/mcstatus` to set it up again.",
                ephemeral=True
            )
        except Exception as e:
            await interaction.followup.send(
                f"❌ Error updating status: {e}",
                ephemeral=True
            )
    
    @app_commands.command(name="mcserver", description="Change the Minecraft server address")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(server_address="New server address (e.g., play.example.com:25565)")
    async def mcserver(self, interaction: discord.Interaction, server_address: str):
        """Change the monitored Minecraft server"""
        
        ensure_server_config(interaction.guild_id)
        update_server_config(interaction.guild_id, mc_server_address=server_address)
        
        await interaction.response.send_message(
            f"✅ Minecraft server address updated to: `{server_address}`\n"
            f"The status will update on the next cycle.",
            ephemeral=True
        )

async def setup(bot):
    await bot.add_cog(MinecraftStatus(bot))
