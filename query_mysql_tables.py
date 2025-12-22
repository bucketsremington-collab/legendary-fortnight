import mysql.connector

try:
    connection = mysql.connector.connect(
        host="sql1.revivenode.com",
        port=3306,
        user="u33066_lxlvlVUN8X",
        password="=j22tJcO3+=vXg@jFNSzma6L",
        database="s33066_MBA"
    )
    
    cursor = connection.cursor()
    
    # Get sample UUIDs from the players table
    print("=== Sample Players from Database ===\n")
    cursor.execute("""
        SELECT uuid, ign, SEASON_1_GAMES_PLAYED, SEASON_1_WINS, SEASON_1_POINTS 
        FROM players 
        WHERE SEASON_1_GAMES_PLAYED > 0 
        LIMIT 5
    """)
    
    players = cursor.fetchall()
    
    if players:
        print(f"Found {len(players)} players with Season 1 stats:\n")
        for uuid, ign, games, wins, points in players:
            print(f"  UUID: {uuid}")
            print(f"  IGN:  {ign}")
            print(f"  Games: {games} | Wins: {wins} | Points: {points}")
            print()
    else:
        print("No players found with Season 1 stats. Showing any 5 players:\n")
        cursor.execute("SELECT uuid, ign FROM players LIMIT 5")
        all_players = cursor.fetchall()
        for uuid, ign in all_players:
            print(f"  UUID: {uuid}")
            print(f"  IGN:  {ign}")
            print()
    
    cursor.close()
    connection.close()
    
except mysql.connector.Error as error:
    print(f"Error: {error}")
