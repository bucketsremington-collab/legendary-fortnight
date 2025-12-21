# 🏀 MBA Discord Bot

The official Discord bot for the Minecraft Basketball Association server!

## Features

- � **Autorole System**: Automatically assigns roles to new members
- 👥 **Team Management**: Create teams with conferences, manage rosters
- 👔 **Coach Hierarchy**: Franchise Owner, GM, Head Coach, Assistant Coaches
- ✍️ **Player Transactions**: Sign, offer, release, and trade players
- 🔒 **Force Sign Protection**: Players confirm signings via DM
- 📢 **Demand System**: Players can demand release (3 per season)
- 🎮 **Gametime Scheduling**: Coaches schedule games with approval system
- 💾 **Role Persistence**: Players keep team roles when leaving/rejoining
- 🚫 **Ineligible Roles**: Prevent certain users from transactions
- 📊 **Roster Management**: View rosters, track capacity, and more

## Setup Instructions

### 1. Prerequisites
- Python 3.8 or higher
- A Discord account
- Administrator access to your Discord server

### 2. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Click "Reset Token" and copy your bot token (keep this secret!)
6. Go to OAuth2 → URL Generator
   - Select scopes: `bot`
   - Select permissions: `Administrator` (or customize as needed)
   - Copy the generated URL and open it to invite the bot to your server

### 3. Install Bot

1. Clone or download this repository
2. Open a terminal in the bot directory
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Initialize the database:
   ```bash
   python database.py
   ```

### 4. Configure Bot

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and paste your bot token:
   ```
   DISCORD_TOKEN=your_actual_token_here
   ```
3. Edit `config.json` to customize:
   - `prefix`: Command prefix (default: `!`)
   - `autorole_enabled`: Enable/disable autorole (default: `true`)
   - `autorole_name`: Role name to assign to new members (default: `"Player"`)
   - `welcome_channel_id`: Channel ID for welcome messages (optional)

### 4. Configure Bot

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and paste your bot token:
   ```
   DISCORD_TOKEN=your_actual_token_here
   ```

### 5. Run Bot

**Local Testing (Your Computer):**
```bash
python bot.py
```

You should see "Bot has connected to Discord!" and "Slash commands synced!" in the terminal.

**For 24/7 Hosting:**

To keep your bot online 24/7, you'll need to use a hosting service. Here are some options:

**Recommended Hosts:**
- **PebbleHost** - Discord bot hosting plans
- **Railway** - Free tier available with GitHub deployment
- **Heroku** - Free/paid tiers (requires credit card)
- **DigitalOcean** - VPS hosting ($4-6/month)
- **Oracle Cloud** - Free tier VPS available
- **Replit** - Simple browser-based hosting

**General Deployment Steps (PebbleHost/Similar):**

1. **Prepare your files:**
   - Upload all files EXCEPT `.env` (keep that local)
   - Make sure `requirements.txt` is included
   - Ensure `database.py` is present

2. **Set up on hosting:**
   - Upload files via FTP/SFTP or GitHub integration
   - Set environment variable `DISCORD_TOKEN` in hosting control panel
   - The host should auto-install from `requirements.txt`

3. **Configure MySQL database:**
   - Set MySQL credentials in `.env` file (copy from `.env.example`)
   - Database tables will be auto-created on first run
   - Make sure your MySQL server is accessible

4. **Start the bot:**
   - Most hosts auto-detect `bot.py` as the main file
   - Or configure startup command: `python bot.py`

5. **Keep it running:**
   - Most Discord bot hosts keep processes running automatically
   - For VPS: Use `screen`, `tmux`, or a process manager like `pm2`

**Important Notes:**
- Never commit `.env` to GitHub or share your credentials
- MySQL database must be accessible from your hosting server
- Make sure the host supports Python 3.8+
- Some free tiers may sleep after inactivity

### 6. Initial Server Setup

Once the bot is running, use these commands in your Discord server:

1. Run `/setup` to see all available configuration commands
2. Set up all required roles using `/setrole`
3. Set up all required channels using `/setchannel`
4. Set the autorole using `/autorole @role`
5. Set the roster cap using `/setrostercap <number>`
6. Create teams using `/team add @role <conference>`
7. **Give coaches their coaching role AND team role** - that's it!
   - Example: Give @John the "Franchise Owner" role AND "@Lakers" team role
   - Now John can manage the Lakers roster

## How Coaching Works

**Simple Role-Based System:**
- If you have a **coaching role** (FO, GM, HC, or AC) AND a **team role**, you can manage that team
- No manual assignment needed - just give the Discord roles!

**Example:**
- @Sarah has "Head Coach" role + "@Warriors" role = Can manage Warriors
- @Mike has "Assistant Coach" role + "@Bulls" role = Can manage Bulls
- @Alex has "GM" role but no team role = Cannot manage any team

## Commands Reference

All commands use Discord slash commands (`/command`).

### Admin Setup Commands

- `/setup` - View all setup commands
- `/setrole <type> @role` - Set system roles
- `/setchannel <type> #channel` - Set logging channels
- `/autorole @role` - Set auto-assigned role for new members
- `/addineligible @role` - Prevent role from transactions
- `/removeineligible @role` - Remove ineligible role
- `/setrostercap <number>` - Set max players per team (default: 10)
- `/clearfreeagent` - Unset free agent role
- `/resetdemands` - Reset demand counts for new season

### Team Management (Admin)

- `/team add @role <conference>` - Create team (Desert or Plains)
- `/team remove @role` - Remove team
- `/team list` - View all teams
- `/setlogo @team :emoji:` - Set team logo (uses server emoji)

### Coach Commands

**Requirements:** Must have a coaching role (FO/GM/HC/AC) AND the team role

- `/sign @player` - Sign player with force-sign protection
- `/offer @player` - Send 24hr contract offer
- `/release @player` - Release player from team
- `/trade @your_player @their_player` - Propose trade

### Player Commands

- `/myteam` - Check your current team
- `/roster [@team]` - View team roster
- `/demand` - Request release (3 per season max)

### Gametime Scheduling

**Requirements:** Coaching role (FO/GM/HC/AC) AND team role

- `/gametime @opponent <time>` - Schedule game

### Minecraft Server Status

- `/mcstatus #channel [server]` - Set up auto-updating status embed (Admin)
- `/mcupdate` - Manually refresh status
- `/mcserver <address>` - Change server address (Admin)

## Key Features Explained

## Commands

### Basketball Commands (`!command`)

- `!shoot` - Take a basketball shot
- `!dunk [@user]` - Dunk on someone (or just dunk)
- `!stats [@user]` - View player statistics
- `!team` - Check your current team
- `!schedule` - View game schedule

### General Commands

- `!ping` - Check bot latency
- `!info` - Display bot information
- `!help` - Show all available commands

### Moderation Commands (Requires Permissions)

- `!kick @user [reason]` - Kick a member
- `!ban @user [reason]` - Ban a member
- `!unban <user_id>` - Unban a user by ID
- `!clear [amount]` - Delete messages (default: 5)
- `!mute @user [reason]` - Timeout a member for 10 minutes
- `!unmute @user` - Remove timeout from a member

### Admin Commands (Requires Administrator)

- `!announce #channel <message>` - Send an announcement
- `!setrole @user <role>` - Assign a role to a member
- `!removerole @user <role>` - Remove a role from a member
- `!serverinfo` - Display server information

## Configuration

### Setting Up Autorole

1. Create a role in your Discord server (e.g., "Player")
2. Make sure the bot's role is **higher** than the autorole in the role hierarchy
3. Update `config.json`:
   ```json
   {
     "autorole_enabled": true,
     "autorole_name": "Player"
   }
   ```

### Setting Up Welcome Messages

1. Find your welcome channel's ID (Enable Developer Mode in Discord, right-click channel → Copy ID)
2. Update `config.json`:
   ```json
   {
     "welcome_channel_id": 123456789012345678
   }
   ```

## Customization

### Adding New Commands

Commands are organized in "cogs" (modules) in the `cogs/` folder:
- `basketball.py` - Basketball-related commands
- `moderation.py` - Moderation tools
- `admin.py` - Admin utilities

To add a new command, edit the appropriate cog file or create a new one.

### Connecting to a Database

The `!stats` command currently shows placeholder data. You can connect it to a database (like SQLite, PostgreSQL, or MongoDB) to track real player statistics.

## Key Features Explained

### Force Sign Protection
When a coach uses `/sign`, the player receives a DM asking if they agreed to the signing. If they report it as forced, they're removed from the team and the incident is logged.

### Demand System
Players can use `/demand` to leave a team (max 3 times per season). Each demand is logged to the demands channel. Admins can reset counts with `/resetdemands`.

### Role Persistence
When players leave and rejoin the server, their team role is automatically restored to prevent dodging teams.


**Minecraft status not updating:**
- Verify the server address is correct with `/mcserver`
- Check if your MC server has query enabled (server.properties: `enable-query=true`)
- Ensure port is correct (default: 25565 for MC, yours: 8105)
- The bot needs network access to reach your MC server

**Bot goes offline on hosting:**
- Check host process logs for errors
- Verify environment variables are set correctly
- Make sure hosting plan supports 24/7 runtime
- Some free hosts sleep after inactivity - upgrade if needed
### Coaching Hierarchy
- **Franchise Owner**: Full control (coaching role + team role)
- **GM**: Can manage team (coaching role + team role)
- **HC**: Can manage team (coaching role + team role)
- **AC**: Can manage team (coaching role + team role)

There's no limit on how many people can have each coaching role per team - just give them the Discord roles!

### Ineligible Roles
Roles marked as ineligible cannot participate in any transactions. Useful for suspended players, staff, or other special cases.

## Troubleshooting

## Troubleshooting

**Slash commands not appearing:**
- Make sure you invited the bot with the `applications.commands` scope
- Wait a few minutes after starting the bot for commands to sync
- Try kicking and re-inviting the bot with proper permissions

**Bot doesn't respond to commands:**
- Ensure Message Content Intent is enabled in Developer Portal
- Check bot has proper permissions in the server
- Verify the bot is online and connected

**Autorole not working:**
- Ensure Server Members Intent is enabled
- Check that bot's role is higher than the autorole
- Verify autorole is set with `/autorole @role`

**"Missing Permissions" errors:**
- Bot needs Administrator permission or specific permissions for each feature
- Check role hierarchy - bot must be higher than roles it manages

**DMs not working:**
- Players must enable DMs from server members
- Check bot isn't blocked by the user
- Some features (offers, trades, gametimes) require DMs

**Database errors:**
- Verify MySQL credentials in `.env` are correct
- Ensure MySQL server is accessible from your host
- Check MySQL user has proper permissions (SELECT, INSERT, UPDATE, DELETE, CREATE TABLE)
- Review MySQL server logs for connection issues

## Database Structure

The bot uses MySQL with these main tables:
- `server_config` - Stores all role and channel configurations
- `teams` - Team information with coaches
- `player_teams` - Current team assignments
- `demands` - Tracks demand usage per player
- `pending_offers` - Active contract offers
- `pending_trades` - Active trade proposals
- `pending_gametimes` - Game scheduling requests
- `saved_roles` - Role persistence when members leave
- `ineligible_roles` - Roles that cannot participate in transactions
- `players` - Discord to Minecraft username mapping
- `seasons` - Season tracking (S0, S1, etc.)
- `games` - Individual game records
- `player_game_stats` - Per-game statistics
- `player_season_stats` - Aggregated season statistics
- `transaction_history` - Transaction audit log
- `accolades` - Player awards and achievements

## Support

For issues or questions about the MBA bot, contact your server administrators.

## License

This bot is created for the Minecraft Basketball Association Discord server.
