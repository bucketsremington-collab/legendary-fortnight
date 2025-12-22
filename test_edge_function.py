import requests

# Test the deployed Edge Function
EDGE_FUNCTION_URL = "https://fsgxoaocntphqnrzuhqe.supabase.co/functions/v1/park-stats"

# Test with a sample UUID - you'll need to provide a real UUID from your database
test_uuid = input("Enter a Minecraft UUID to test (or press Enter to test with a sample): ").strip()
if not test_uuid:
    test_uuid = "069a79f4-44e9-4726-a5be-fca90e38aaf5"  # Sample UUID format

print(f"\nTesting Edge Function with UUID: {test_uuid}")
print(f"URL: {EDGE_FUNCTION_URL}/{test_uuid}?season=1\n")

try:
    response = requests.get(f"{EDGE_FUNCTION_URL}/{test_uuid}?season=1")
    
    print(f"Status Code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print(f"\nResponse:")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Success! Player: {data.get('player_name')}")
        print(f"  Games: {data.get('games_played')}")
        print(f"  Wins: {data.get('wins')} | Losses: {data.get('losses')}")
        print(f"  PPG: {data.get('points') / max(data.get('games_played', 1), 1):.1f}")
    elif response.status_code == 404:
        print("✗ Player not found in database")
        print(response.json())
    else:
        print(f"✗ Error: {response.text[:500]}")
        
except Exception as e:
    print(f"✗ Error: {e}")

print("\n" + "="*60)
print("To get a real UUID from your MySQL database, run:")
print("  SELECT uuid, ign FROM players LIMIT 5;")
print("="*60)
