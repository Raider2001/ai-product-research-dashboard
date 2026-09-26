import pandas as pd
import os
from typing import List, Dict
from pathlib import Path

class DataLoader:
    def __init__(self):
        self.base_path = Path(__file__).parent.parent.parent.parent / "data"
        self.products_df = None
        self.suppliers_df = None
        self.load_data()
    
    def load_data(self):
        """Load CSV files into DataFrames"""
        try:
            products_path = self.base_path / "sample_products.csv"
            suppliers_path = self.base_path / "supplier_data.csv"
            
            self.products_df = pd.read_csv(products_path)
            self.suppliers_df = pd.read_csv(suppliers_path)
            print("✓ Data loaded successfully")
        except Exception as e:
            print(f"Error loading data: {e}")
    
    def get_products(self, skip: int = 0, limit: int = 100) -> Dict:
        """Get all products with pagination"""
        if self.products_df is None:
            return {"products": [], "total": 0}
        
        products = self.products_df.iloc[skip:skip+limit]
        return {
            "products": products.to_dict('records'),
            "total": len(self.products_df),
            "skip": skip,
            "limit": limit
        }
    
    def get_product_by_id(self, product_id: int) -> Dict:
        """Get a specific product"""
        if self.products_df is None:
            return None
        
        product = self.products_df[self.products_df['product_id'] == product_id]
        if product.empty:
            return None
        return product.iloc[0].to_dict()
    
    def search_products(self, query: str) -> List[Dict]:
        """Search products by name"""
        if self.products_df is None:
            return []
        
        results = self.products_df[
            self.products_df['name'].str.contains(query, case=False, na=False)
        ]
        return results.to_dict('records')
    
    def get_suppliers(self) -> Dict:
        """Get all suppliers"""
        if self.suppliers_df is None:
            return {"suppliers": [], "total": 0}
        
        return {
            "suppliers": self.suppliers_df.to_dict('records'),
            "total": len(self.suppliers_df)
        }
    
    def get_analytics(self) -> Dict:
        """Get product analytics"""
        if self.products_df is None:
            return {}
        
        return {
            "total_products": len(self.products_df),
            "avg_price": float(self.products_df['price'].mean()),
            "avg_market_score": float(self.products_df['market_score'].mean()),
            "price_range": {
                "min": float(self.products_df['price'].min()),
                "max": float(self.products_df['price'].max())
            },
            "categories": self.products_df['category'].unique().tolist()
        }


# Create a singleton instance
data_loader = DataLoader()
