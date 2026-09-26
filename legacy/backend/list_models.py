import os
from dotenv import load_dotenv
load_dotenv()
from anthropic import Anthropic

client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
models = client.models.list()
print("Available models:")
for m in models.data:
    print(f"  - {m.id}")
