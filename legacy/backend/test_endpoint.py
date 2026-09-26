import os, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv
load_dotenv()

from app.services.data_loader import data_loader
from app.services.ai_service import ai_service

print("Testing opportunities endpoint logic...")
try:
    data = data_loader.get_products(skip=0, limit=100)
    print(f"Data type: {type(data)}")
    print(f"Data keys: {data.keys() if isinstance(data, dict) else 'N/A'}")
    products = data.get("products", []) if isinstance(data, dict) else data
    print(f"Products count: {len(products)}")
    print(f"First product: {products[0] if products else 'None'}")
    
    print("\nCalling Claude AI...")
    result = ai_service.score_opportunities(products)
    print(f"Result: {result}")
except Exception as e:
    import traceback
    print(f"ERROR: {e}")
    traceback.print_exc()
