#!/usr/bin/env python3
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print(f"API Key loaded: {bool(os.getenv('ANTHROPIC_API_KEY'))}")
print(f"API Key prefix: {os.getenv('ANTHROPIC_API_KEY', '')[:20]}...")
print(f"Preferred model: {os.getenv('PREFERRED_AI_MODEL')}")

try:
    from anthropic import Anthropic
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: No API key found!")
    else:
        print(f"Creating Claude client...")
        client = Anthropic(api_key=api_key)
        
        print(f"Testing Claude API...")
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[
                {"role": "user", "content": "Say hello!"}
            ]
        )
        print(f"SUCCESS: {response.content[0].text}")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
