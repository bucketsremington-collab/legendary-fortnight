import discord
from discord.ext import commands
import os
from dotenv import load_dotenv
from database import init_database, get_connection
from api_server import start_api_server

# Load environment variables
load_dotenv()

# Initialize database
init_database()

# Bot setup with intents
intents = discord.Intents.default()
intents.message_content = True
intents.members = True  # Required for role persistence and autoroles
intents.guilds = True

class MBABot(commands.Bot):
    def __init__(self):
        super().__init__(command_prefix='/', intents=intents)
        
    async def setup_hook(self):
        """Load all cogs and sync slash commands"""
        await self.load_cogs()
        await self.tree.sync()
        print("Slash commands synced!")
    
    async def load_cogs(self):
        """Load all cog files from the cogs directory"""
        for filename in os.listdir('./cogs'):
            if filename.endswith('.py'):
                try:
                    await self.load_extension(f'cogs.{filename[:-3]}')
                    print(f'Loaded cog: {filename}')
                except Exception as e:
                    print(f'Failed to load cog {filename}: {e}')

bot = MBABot()

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')
    print(f'Bot is in {len(bot.guilds)} guild(s)')
    await bot.change_presence(activity=discord.Game(name="Minecraft Basketball Association"))
    
    # Start API server for web app integration
    start_api_server(bot)

@bot.event
async def on_member_join(member):
    """Handle new member join - autorole and restore saved roles"""
    guild = member.guild
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Check if member had roles before (role persistence)
        cursor.execute('''
            SELECT role_id FROM saved_roles 
            WHERE user_id = %s AND guild_id = %s
        ''', (member.id, guild.id))
        
        saved_roles = cursor.fetchall()
        
        if saved_roles:
            # Restore team roles
            for (role_id,) in saved_roles:
                role = guild.get_role(role_id)
                if role:
                    try:
                        await member.add_roles(role)
                        print(f'Restored {role.name} to {member.name}')
                    except discord.Forbidden:
                        print(f'Missing permissions to restore role to {member.name}')
            
            # Remove from saved_roles table
            cursor.execute('''
                DELETE FROM saved_roles 
                WHERE user_id = %s AND guild_id = %s
            ''', (member.id, guild.id))
            conn.commit()
        
        # Apply autorole
        cursor.execute('''
            SELECT autorole_id FROM server_config WHERE guild_id = %s
        ''', (guild.id,))
        
        result = cursor.fetchone()
        if result and result[0]:
            role = guild.get_role(result[0])
            if role:
                try:
                    await member.add_roles(role)
                    print(f'Assigned autorole {role.name} to {member.name}')
                except discord.Forbidden:
                    print(f'Missing permissions to assign autorole to {member.name}')
    finally:
        cursor.close()
        conn.close()

@bot.event
async def on_member_remove(member):
    """Save team roles when member leaves"""
    guild = member.guild
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Get all team role IDs for this guild
        cursor.execute('''
            SELECT team_role_id FROM teams WHERE guild_id = %s
        ''', (guild.id,))
        
        team_role_ids = [row[0] for row in cursor.fetchall()]
        
        # Save any team roles the member had
        for role in member.roles:
            if role.id in team_role_ids:
                cursor.execute('''
                    INSERT INTO saved_roles (user_id, guild_id, role_id)
                    VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE saved_at = CURRENT_TIMESTAMP
                ''', (member.id, guild.id, role.id))
                print(f'Saved team role {role.name} for {member.name}')
        
        conn.commit()
    finally:
        cursor.close()
        conn.close()

# Main entry point
async def main():
    async with bot:
        await bot.start(os.getenv('DISCORD_TOKEN'))

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
