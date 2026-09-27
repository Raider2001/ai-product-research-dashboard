import os
from dotenv import load_dotenv
load_dotenv()
import requests

resp = requests.post('http://localhost:8000/api/agent/opportunities',
    headers={'Origin': 'http://localhost:5173', 'Content-Type': 'application/json'},
    timeout=60)
print('Status:', resp.status_code)
print('CORS header:', resp.headers.get('access-control-allow-origin'))
print('Body:', resp.text[:1000])
