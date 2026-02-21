import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration from Environment
TOKEN = os.getenv("DENSITY_TOKEN")
# We split the string from .env into a list
ROOM_ID_LIST = os.getenv("ROOM_IDS", "").split(",")

# Keeping labels and capacities in the code is fine for now, 
# as they are logic-based rather than "secrets"
ROOM_NAMES = [
    "Weight Rooms (Total)", 
    "Main Weight Room", 
    "Extension Weight Room", 
    "Annex Weight Room", 
    "CMS Fitness Center"
]
MAX_CAPACITIES = [150, 80, 40, 30, 55]

# Combine them into a dictionary for easier iteration
GYM_ROOMS = dict(zip(ROOM_NAMES, ROOM_ID_LIST))

def get_gym_count(space_id):
    if not TOKEN:
        return "Missing Token"
        
    url = f"https://api.density.io/v2/spaces/{space_id}/count"
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # Better error handling
        return response.json().get('count')
    except Exception as e:
        return f"Error: {e}"

def display_stats():
    print(f"{'Room Name':<25} | {'Count':<7} | {'Max Cap':<8} | {'% Full'}")
    print("-" * 60)

    for (room_name, space_id), max_cap in zip(GYM_ROOMS.items(), MAX_CAPACITIES):
        count = get_gym_count(space_id)
        
        if isinstance(count, int):
            percent = (count / max_cap) * 100
            print(f"{room_name:<25} | {count:<7} | {max_cap:<8} | {percent:>6.1f}%")
        else:
            print(f"{room_name:<25} | {count}")

if __name__ == "__main__":
    display_stats()