import mysql.connector

# Connect to MySQL database
try:
    connection = mysql.connector.connect(
        host="sql1.revivenode.com",
        port=3306,
        user="u33066_lxlvlVUN8X",
        password="=j22tJcO3+=vXg@jFNSzma6L",
        database="s33066_MBA"
    )
    
    cursor = connection.cursor()
    
    # Show all tables
    print("=== Tables in s33066_MBA database ===")
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()
    for table in tables:
        print(f"  - {table[0]}")
    
    print("\n=== Checking each table for SEASON_1_WINS column ===")
    # For each table, check if it has the SEASON_1_WINS column
    for table in tables:
        table_name = table[0]
        cursor.execute(f"DESCRIBE `{table_name}`")
        columns = cursor.fetchall()
        column_names = [col[0] for col in columns]
        
        if 'SEASON_1_WINS' in column_names or 'season_1_wins' in column_names:
            print(f"\n✓ Found SEASON_1_WINS in table: {table_name}")
            print(f"\n  All columns ({len(column_names)} total):")
            for i, col in enumerate(column_names, 1):
                print(f"    {i:2d}. {col}")
            
            # Check for player identifier columns
            print(f"\n  Player identifier columns:")
            id_cols = [col for col in column_names if 'uuid' in col.lower() or 'id' in col.lower() or 'ign' in col.lower()]
            for col in id_cols:
                print(f"    - {col}")
    
    cursor.close()
    connection.close()
    print("\n=== Query complete ===")
    
except mysql.connector.Error as error:
    print(f"Error connecting to MySQL: {error}")
